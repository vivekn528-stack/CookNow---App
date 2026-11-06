import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  FirebaseStorage,
} from 'firebase/storage';
import { getFirebaseStorage, ensureFirebaseInitialized } from './firebase';

export interface UploadResult {
  url: string;
  path: string;
}

export interface StorageOperationResult {
  success: boolean;
  error: string | null;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_DOC_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

function getFileExtension(file: File | Blob, defaultExt = 'jpg'): string {
  if ('name' in file && typeof file.name === 'string' && file.name.includes('.')) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(ext)) {
      return ext === 'jpeg' ? 'jpg' : ext;
    }
  }
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  if (file.type === 'application/pdf') return 'pdf';
  return defaultExt;
}

function sanitizeFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

async function getStorageInstance(): Promise<FirebaseStorage> {
  await ensureFirebaseInitialized();
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Firebase Storage is not initialized or configured.');
  }
  return storage;
}

/**
 * Validates image size and MIME type according to security rules (max 10MB, jpeg/png/webp)
 */
export function validateImageFile(file: File | Blob, maxBytes = 10 * 1024 * 1024): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid image format (${file.type || 'unknown'}). Allowed formats: JPG, PNG, WebP.`
    );
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Image size exceeds the ${maxMb}MB limit (File size: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`);
  }
}

/**
 * Validates verification document size and MIME type (max 15MB, PDF/images)
 */
export function validateDocumentFile(file: File | Blob, maxBytes = 15 * 1024 * 1024): void {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid document format (${file.type || 'unknown'}). Allowed formats: PDF, JPG, PNG, WebP.`
    );
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Document size exceeds the ${maxMb}MB limit.`);
  }
}

export const storageService = {
  /**
   * Upload food dish photo for a menu item.
   * Path: kitchens/{cookUserId}/menu-items/{fileName}
   * Security: Must match cook's authenticated user ID.
   */
  async uploadMenuItemImage(
    cookUserId: string,
    file: File | Blob,
    itemNameHint?: string
  ): Promise<UploadResult> {
    if (!cookUserId) throw new Error('Cook User ID is required for menu item storage path.');
    validateImageFile(file, 10 * 1024 * 1024);

    const storage = await getStorageInstance();
    const ext = getFileExtension(file);
    const prefix = itemNameHint ? sanitizeFileName(itemNameHint) : 'dish';
    const filePath = `kitchens/${cookUserId}/menu-items/${prefix}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        cookUserId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(storageRef);
    return { url, path: filePath };
  },

  /**
   * Upload kitchen avatar or cover banner.
   * Path: kitchens/{cookUserId}/branding/{type}_{timestamp}.jpg
   */
  async uploadKitchenBrandingImage(
    cookUserId: string,
    file: File | Blob,
    type: 'avatar' | 'banner'
  ): Promise<UploadResult> {
    if (!cookUserId) throw new Error('Cook User ID is required.');
    validateImageFile(file, 10 * 1024 * 1024);

    const storage = await getStorageInstance();
    const ext = getFileExtension(file);
    const filePath = `kitchens/${cookUserId}/branding/${type}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        cookUserId,
        brandingType: type,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(storageRef);
    return { url, path: filePath };
  },

  /**
   * Upload user profile avatar.
   * Path: users/{userId}/avatar_{timestamp}.jpg
   */
  async uploadUserAvatar(userId: string, file: File | Blob): Promise<UploadResult> {
    if (!userId) throw new Error('User ID is required.');
    validateImageFile(file, 5 * 1024 * 1024);

    const storage = await getStorageInstance();
    const ext = getFileExtension(file);
    const filePath = `users/${userId}/avatar_${Date.now()}.${ext}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(storageRef);
    return { url, path: filePath };
  },

  /**
   * Upload sensitive compliance document (FSSAI Certificate, Aadhaar, PAN card, Driving License).
   * Path: verifications/{applicantId}/{docType}_{timestamp}.pdf/.jpg
   * Security: Private; restricted strictly to applicant and Super Admin.
   */
  async uploadVerificationDocument(
    applicantId: string,
    file: File | Blob,
    docType: 'fssai' | 'id_proof' | 'license' | 'kitchen_inspection'
  ): Promise<UploadResult> {
    if (!applicantId) throw new Error('Applicant ID is required.');
    validateDocumentFile(file, 15 * 1024 * 1024);

    const storage = await getStorageInstance();
    const ext = getFileExtension(file, file.type === 'application/pdf' ? 'pdf' : 'jpg');
    const filePath = `verifications/${applicantId}/${docType}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/pdf',
      customMetadata: {
        applicantId,
        docType,
        uploadedAt: new Date().toISOString(),
      },
    });

    const url = await getDownloadURL(storageRef);
    return { url, path: filePath };
  },

  /**
   * Delete file from Firebase Storage given its full storage path.
   */
  async deleteFile(storagePath: string): Promise<StorageOperationResult> {
    try {
      const storage = await getStorageInstance();
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete file from storage.' };
    }
  },
};
