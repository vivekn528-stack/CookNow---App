import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  Firestore,
} from 'firebase/firestore';
import { ensureFirebaseInitialized, getFirebaseAuth, getFirestoreDb } from './firebase';
import type {
  Order,
  SupportHistoryEvent,
  SupportInternalNote,
  SupportMessage,
  SupportRefundStatus,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStats,
  SupportTicketStatus,
} from '../types';

export interface SupportTicketFilter {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  unreadOnly?: boolean;
}

export interface CreateSupportTicketInput {
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  subject: string;
  description: string;
  orderId?: string | null;
  customerPhone?: string;
  customerName?: string;
  requestRefund?: boolean;
  refundReason?: string;
  orderSnapshot?: SupportTicket['orderSnapshot'];
}

export interface TicketDetailPayload {
  ticket: SupportTicket;
  messages: SupportMessage[];
  internalNotes?: SupportInternalNote[];
  linkedOrder?: Order | null;
  auditLogs?: any[];
}

function logFirestorePermissionContext(
  operationType: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write',
  path: string,
  error: unknown
) {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  console.error('[SupportFirestoreError]', {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: Boolean(user?.emailVerified),
    },
  });
}

async function getAuthenticatedToken(): Promise<{ uid: string; token: string }> {
  await ensureFirebaseInitialized();
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Authentication required. Please sign in with Google first.');
  }
  const token = await currentUser.getIdToken();
  return { uid: currentUser.uid, token };
}

async function getClientDb(): Promise<Firestore | null> {
  try {
    await ensureFirebaseInitialized();
    return getFirestoreDb();
  } catch {
    return null;
  }
}

export function computeSupportStatsLocal(tickets: SupportTicket[]): SupportTicketStats {
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === 'Open').length;
  const inProgressTickets = tickets.filter((t) => t.status === 'In Progress').length;
  const waitingForCustomerTickets = tickets.filter(
    (t) => t.status === 'Waiting for Customer'
  ).length;
  const resolvedTickets = tickets.filter(
    (t) => t.status === 'Resolved' || t.status === 'Closed'
  ).length;
  const closedTickets = tickets.filter((t) => t.status === 'Closed').length;
  const urgentActiveTickets = tickets.filter(
    (t) => t.priority === 'Urgent' && t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;
  const unreadForOwnerCount = tickets.filter((t) => Boolean(t.unreadForOwner)).length;

  const resolutionDurationsMin: number[] = [];
  for (const t of tickets) {
    if ((t.status === 'Resolved' || t.status === 'Closed') && t.resolvedAt && t.createdAt) {
      const startMs = new Date(t.createdAt).getTime();
      const endMs = new Date(t.resolvedAt).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs >= startMs) {
        resolutionDurationsMin.push((endMs - startMs) / 60000);
      }
    }
  }
  const avgResolutionMinutes =
    resolutionDurationsMin.length > 0
      ? Math.round(
          resolutionDurationsMin.reduce((sum, mins) => sum + mins, 0) /
            resolutionDurationsMin.length
        )
      : null;

  const ratings: number[] = [];
  for (const t of tickets) {
    if (
      typeof t.satisfactionRating === 'number' &&
      t.satisfactionRating >= 1 &&
      t.satisfactionRating <= 5
    ) {
      ratings.push(t.satisfactionRating);
    }
  }
  const avgSatisfactionRating =
    ratings.length > 0
      ? Number((ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(2))
      : null;

  return {
    totalTickets,
    openTickets,
    inProgressTickets,
    waitingForCustomerTickets,
    resolvedTickets,
    closedTickets,
    urgentActiveTickets,
    unreadForOwnerCount,
    avgResolutionMinutes,
    avgSatisfactionRating,
    satisfactionResponseCount: ratings.length,
  };
}

function applyTicketFilters(
  tickets: SupportTicket[],
  filters?: SupportTicketFilter
): SupportTicket[] {
  if (!filters) return tickets;
  const search = (filters.search || '').trim().toLowerCase();
  const status = (filters.status || '').trim();
  const priority = (filters.priority || '').trim();
  const category = (filters.category || '').trim();
  const dateFrom = (filters.dateFrom || '').trim();
  const dateTo = (filters.dateTo || '').trim();

  return tickets.filter((t) => {
    if (status && status !== 'all' && t.status !== status) return false;
    if (priority && priority !== 'all' && t.priority !== priority) return false;
    if (category && category !== 'all' && t.category !== category) return false;
    if (filters.unreadOnly && !t.unreadForOwner) return false;

    if (dateFrom) {
      const fromMs = new Date(dateFrom).getTime();
      if (!Number.isNaN(fromMs) && new Date(t.createdAt).getTime() < fromMs) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (!Number.isNaN(toDate.getTime()) && new Date(t.createdAt).getTime() > toDate.getTime()) {
        return false;
      }
    }

    if (search) {
      const haystack = [
        t.id,
        t.customerName,
        t.customerPhone,
        t.customerEmail,
        t.orderId || '',
        t.subject || '',
        t.orderSnapshot?.kitchenName || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

function mergeTicketsNewestWins(primary: SupportTicket[], secondary: SupportTicket[]): SupportTicket[] {
  const map = new Map<string, SupportTicket>();
  for (const t of secondary) {
    map.set(t.id, t);
  }
  for (const t of primary) {
    const existing = map.get(t.id);
    if (!existing) {
      map.set(t.id, t);
    } else {
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(t.updatedAt || t.createdAt || 0).getTime();
      map.set(t.id, incomingTime >= existingTime ? t : existing);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
  );
}

async function apiJson(path: string, token: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || `Request failed with HTTP ${res.status}`);
  }
  return data;
}

export const supportService = {
  async createTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
    const { token } = await getAuthenticatedToken();
    const data = await apiJson('/api/support/tickets', token, {
      method: 'POST',
      body: JSON.stringify(input),
    });

    const ticket = data.ticket as SupportTicket;
    const initialMessage = data.initialMessage as SupportMessage | undefined;

    // If serverless Admin credentials aren't configured in local preview, persist permanently to Firestore via authenticated client SDK
    if (data.adminPersisted === false) {
      const db = await getClientDb();
      if (db) {
        try {
          await setDoc(doc(db, 'support_tickets', ticket.id), ticket);
          if (initialMessage) {
            await setDoc(
              doc(db, 'support_tickets', ticket.id, 'messages', initialMessage.id),
              initialMessage
            );
          }
        } catch (err) {
          logFirestorePermissionContext('create', `support_tickets/${ticket.id}`, err);
          throw new Error(
            err instanceof Error
              ? `Ticket validated by server, but Firestore persistence failed: ${err.message}`
              : 'Failed persisting support ticket to Cloud Firestore.'
          );
        }
      }
    }

    return ticket;
  },

  async fetchMyTickets(): Promise<SupportTicket[]> {
    const { uid, token } = await getAuthenticatedToken();
    const data = await apiJson('/api/support/my-tickets', token);
    const serverTickets = (data.tickets || []) as SupportTicket[];

    if (data.adminPersisted === false) {
      const db = await getClientDb();
      if (db) {
        try {
          const snap = await getDocs(
            query(collection(db, 'support_tickets'), where('customerId', '==', uid))
          );
          const fsTickets = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SupportTicket[];
          return mergeTicketsNewestWins(fsTickets, serverTickets);
        } catch (err) {
          logFirestorePermissionContext('list', 'support_tickets', err);
        }
      }
    }

    return serverTickets;
  },

  async fetchOwnerTickets(filters?: SupportTicketFilter): Promise<{
    tickets: SupportTicket[];
    allTickets: SupportTicket[];
    stats: SupportTicketStats;
    adminPersisted: boolean;
  }> {
    const { token } = await getAuthenticatedToken();
    const qs = new URLSearchParams();
    if (filters?.search) qs.set('search', filters.search);
    if (filters?.status && filters.status !== 'all') qs.set('status', filters.status);
    if (filters?.priority && filters.priority !== 'all') qs.set('priority', filters.priority);
    if (filters?.category && filters.category !== 'all') qs.set('category', filters.category);
    if (filters?.dateFrom) qs.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) qs.set('dateTo', filters.dateTo);
    if (filters?.unreadOnly) qs.set('unreadOnly', 'true');

    const queryStr = qs.toString();
    const data = await apiJson(
      `/api/support/tickets${queryStr ? `?${queryStr}` : ''}`,
      token
    );

    const serverTickets = (data.tickets || []) as SupportTicket[];
    const adminPersisted = Boolean(data.adminPersisted);

    if (!adminPersisted) {
      const db = await getClientDb();
      if (db) {
        try {
          const snap = await getDocs(collection(db, 'support_tickets'));
          const fsTickets = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as SupportTicket[];
          // Also fetch unfiltered server list when merging in local dev mode
          const unfilteredRes =
            queryStr.length > 0
              ? ((await apiJson('/api/support/tickets', token)).tickets as SupportTicket[])
              : serverTickets;
          const allTickets = mergeTicketsNewestWins(fsTickets, unfilteredRes);
          return {
            tickets: applyTicketFilters(allTickets, filters),
            allTickets,
            stats: computeSupportStatsLocal(allTickets),
            adminPersisted: false,
          };
        } catch (err) {
          logFirestorePermissionContext('list', 'support_tickets', err);
          throw new Error(
            err instanceof Error
              ? `Unable to read support tickets from Cloud Firestore: ${err.message}`
              : 'Unable to read support tickets from Cloud Firestore.'
          );
        }
      }
    }

    return {
      tickets: serverTickets,
      allTickets: serverTickets,
      stats: data.stats as SupportTicketStats,
      adminPersisted,
    };
  },

  async fetchTicketDetail(
    ticketId: string,
    options?: { markRead?: boolean; isOwnerView?: boolean }
  ): Promise<TicketDetailPayload> {
    const { token } = await getAuthenticatedToken();
    const qs = options?.markRead ? '?markRead=true' : '';
    try {
      const data = await apiJson(`/api/support/tickets/${encodeURIComponent(ticketId)}${qs}`, token);
      const result: TicketDetailPayload = {
        ticket: data.ticket as SupportTicket,
        messages: (data.messages || []) as SupportMessage[],
        internalNotes: data.internalNotes as SupportInternalNote[] | undefined,
        linkedOrder: (data.linkedOrder as Order | null) || null,
        auditLogs: data.auditLogs as any[] | undefined,
      };

      // In local dev without Admin credentials, enrich from client Firestore if missing or stale
      const db = await getClientDb();
      if (db) {
        try {
          const [tSnap, mSnap] = await Promise.all([
            getDoc(doc(db, 'support_tickets', ticketId)),
            getDocs(collection(db, 'support_tickets', ticketId, 'messages')),
          ]);
          if (tSnap.exists()) {
            const fsTicket = { id: tSnap.id, ...(tSnap.data() as any) } as SupportTicket;
            const fsTime = new Date(fsTicket.updatedAt || 0).getTime();
            const srvTime = new Date(result.ticket.updatedAt || 0).getTime();
            if (fsTime >= srvTime) {
              result.ticket = fsTicket;
            }
          }
          if (!mSnap.empty) {
            const fsMessages = mSnap.docs
              .map((d) => ({ id: d.id, ...(d.data() as any) }) as SupportMessage)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const msgMap = new Map<string, SupportMessage>();
            result.messages.forEach((m) => msgMap.set(m.id, m));
            fsMessages.forEach((m) => msgMap.set(m.id, m));
            result.messages = Array.from(msgMap.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }

          if (options?.markRead && tSnap.exists()) {
            const fieldToClear = options.isOwnerView ? 'unreadForOwner' : 'unreadForCustomer';
            if ((tSnap.data() as any)?.[fieldToClear]) {
              await updateDoc(doc(db, 'support_tickets', ticketId), {
                [fieldToClear]: false,
              }).catch(() => {});
              (result.ticket as any)[fieldToClear] = false;
            }
          }

          if (options?.isOwnerView) {
            const nSnap = await getDocs(
              collection(db, 'support_tickets', ticketId, 'internal_notes')
            );
            if (!nSnap.empty) {
              const noteMap = new Map<string, SupportInternalNote>();
              (result.internalNotes || []).forEach((n) => noteMap.set(n.id, n));
              nSnap.docs.forEach((d) =>
                noteMap.set(d.id, { id: d.id, ...(d.data() as any) } as SupportInternalNote)
              );
              result.internalNotes = Array.from(noteMap.values()).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            }
            if (result.ticket.orderId && !result.linkedOrder) {
              const oSnap = await getDoc(doc(db, 'orders', result.ticket.orderId)).catch(() => null);
              if (oSnap && oSnap.exists()) {
                result.linkedOrder = { id: oSnap.id, ...(oSnap.data() as any) } as Order;
              }
            }
          }
        } catch (err) {
          logFirestorePermissionContext('get', `support_tickets/${ticketId}`, err);
        }
      }

      return result;
    } catch (apiErr) {
      // If server cache didn't hold ticket across dev restarts, fetch directly from Cloud Firestore
      const db = await getClientDb();
      if (db) {
        try {
          const tSnap = await getDoc(doc(db, 'support_tickets', ticketId));
          if (tSnap.exists()) {
            const ticket = { id: tSnap.id, ...(tSnap.data() as any) } as SupportTicket;
            const mSnap = await getDocs(collection(db, 'support_tickets', ticketId, 'messages'));
            const messages = mSnap.docs
              .map((d) => ({ id: d.id, ...(d.data() as any) }) as SupportMessage)
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

            let internalNotes: SupportInternalNote[] | undefined;
            let linkedOrder: Order | null = null;
            if (options?.isOwnerView) {
              const nSnap = await getDocs(
                collection(db, 'support_tickets', ticketId, 'internal_notes')
              );
              internalNotes = nSnap.docs
                .map((d) => ({ id: d.id, ...(d.data() as any) }) as SupportInternalNote)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              if (ticket.orderId) {
                const oSnap = await getDoc(doc(db, 'orders', ticket.orderId)).catch(() => null);
                if (oSnap && oSnap.exists()) {
                  linkedOrder = { id: oSnap.id, ...(oSnap.data() as any) } as Order;
                }
              }
            }

            if (options?.markRead) {
              const fieldToClear = options.isOwnerView ? 'unreadForOwner' : 'unreadForCustomer';
              if ((ticket as any)[fieldToClear]) {
                await updateDoc(doc(db, 'support_tickets', ticketId), {
                  [fieldToClear]: false,
                }).catch(() => {});
                (ticket as any)[fieldToClear] = false;
              }
            }

            return { ticket, messages, internalNotes, linkedOrder };
          }
        } catch (fsErr) {
          logFirestorePermissionContext('get', `support_tickets/${ticketId}`, fsErr);
        }
      }
      throw apiErr;
    }
  },

  async sendReply(
    ticketId: string,
    body: string,
    options?: {
      nextStatus?: SupportTicketStatus;
      senderRole?: 'customer' | 'owner';
      senderName?: string;
      existingTicket?: SupportTicket;
    }
  ): Promise<{ message: SupportMessage; ticket: SupportTicket }> {
    const { uid, token } = await getAuthenticatedToken();
    try {
      const data = await apiJson(
        `/api/support/tickets/${encodeURIComponent(ticketId)}/reply`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            body,
            nextStatus: options?.nextStatus,
          }),
        }
      );

      // Sync to Firestore if serverless Admin SDK isn't present
      const db = await getClientDb();
      if (db) {
        const msg = data.message as SupportMessage;
        const tkt = data.ticket as SupportTicket;
        await setDoc(doc(db, 'support_tickets', ticketId, 'messages', msg.id), msg).catch(
          () => {}
        );
        await setDoc(doc(db, 'support_tickets', ticketId), tkt, { merge: true }).catch(
          () => {}
        );
      }

      return { message: data.message, ticket: data.ticket };
    } catch (err: any) {
      // Fallback if ticket lives in Firestore (e.g. across server restarts without Admin creds)
      const db = await getClientDb();
      if (db && err?.message?.includes('not found') && options?.existingTicket) {
        const nowIso = new Date().toISOString();
        const isOwner = options.senderRole === 'owner';
        const senderName =
          options.senderName || (isOwner ? 'Vivek Singh Negi (Owner · Support)' : options.existingTicket.customerName);
        const msg: SupportMessage = {
          id: `msg-${Date.now()}`,
          ticketId,
          senderRole: isOwner ? 'owner' : 'customer',
          senderId: uid,
          senderName,
          body: body.trim(),
          createdAt: nowIso,
        };
        const t = { ...options.existingTicket };
        const historyEvent: SupportHistoryEvent = {
          id: `hist-${Date.now()}`,
          action: isOwner ? 'OWNER_REPLIED' : 'CUSTOMER_REPLIED',
          actorRole: isOwner ? 'owner' : 'customer',
          actorName: senderName,
          timestamp: nowIso,
          details: `${isOwner ? 'Support team' : 'Customer'} sent a reply in the ticket thread.`,
        };
        t.unreadForCustomer = isOwner;
        t.unreadForOwner = !isOwner;
        t.lastMessagePreview = msg.body.slice(0, 120);
        t.lastMessageAt = nowIso;
        t.messageCount = Number(t.messageCount || 0) + 1;
        t.updatedAt = nowIso;
        t.history = [...(t.history || []), historyEvent];
        if (isOwner) {
          if (options.nextStatus) {
            t.status = options.nextStatus;
            if ((t.status === 'Resolved' || t.status === 'Closed') && !t.resolvedAt) {
              t.resolvedAt = nowIso;
            }
          } else if (t.status === 'Open') {
            t.status = 'In Progress';
          }
        } else if (t.status === 'Waiting for Customer') {
          t.status = 'In Progress';
        }

        await setDoc(doc(db, 'support_tickets', ticketId, 'messages', msg.id), msg);
        if (isOwner) {
          await setDoc(doc(db, 'support_tickets', ticketId), t, { merge: true });
        } else {
          await updateDoc(doc(db, 'support_tickets', ticketId), {
            unreadForOwner: t.unreadForOwner,
            unreadForCustomer: t.unreadForCustomer,
            lastMessagePreview: t.lastMessagePreview,
            lastMessageAt: t.lastMessageAt,
            messageCount: t.messageCount,
            history: t.history,
            updatedAt: t.updatedAt,
          });
        }
        return { message: msg, ticket: t };
      }
      throw err;
    }
  },

  async addInternalNote(
    ticketId: string,
    body: string,
    existingTicket?: SupportTicket
  ): Promise<{ note: SupportInternalNote; ticket: SupportTicket }> {
    const { uid, token } = await getAuthenticatedToken();
    try {
      const data = await apiJson(
        `/api/support/tickets/${encodeURIComponent(ticketId)}/internal-notes`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ body }),
        }
      );

      const db = await getClientDb();
      if (db) {
        const note = data.note as SupportInternalNote;
        const tkt = data.ticket as SupportTicket;
        await setDoc(doc(db, 'support_tickets', ticketId, 'internal_notes', note.id), note).catch(
          () => {}
        );
        await setDoc(doc(db, 'support_tickets', ticketId), tkt, { merge: true }).catch(
          () => {}
        );
      }

      return { note: data.note, ticket: data.ticket };
    } catch (err: any) {
      const db = await getClientDb();
      if (db && err?.message?.includes('not found') && existingTicket) {
        const auth = getFirebaseAuth();
        const nowIso = new Date().toISOString();
        const note: SupportInternalNote = {
          id: `note-${Date.now()}`,
          ticketId,
          authorId: uid,
          authorName: auth?.currentUser?.displayName || 'Vivek Singh Negi',
          authorEmail: auth?.currentUser?.email || 'vivekn528@gmail.com',
          body: body.trim(),
          createdAt: nowIso,
        };
        const updatedTicket: SupportTicket = {
          ...existingTicket,
          internalNoteCount: Number(existingTicket.internalNoteCount || 0) + 1,
          updatedAt: nowIso,
        };
        await setDoc(doc(db, 'support_tickets', ticketId, 'internal_notes', note.id), note);
        await setDoc(doc(db, 'support_tickets', ticketId), updatedTicket, { merge: true });
        return { note, ticket: updatedTicket };
      }
      throw err;
    }
  },

  async updateTicketMeta(
    ticketId: string,
    updates: {
      status?: SupportTicketStatus;
      priority?: SupportTicketPriority;
      assignedAgentId?: string | null;
      assignedAgentName?: string | null;
      markReadByOwner?: boolean;
    },
    existingTicket?: SupportTicket
  ): Promise<SupportTicket> {
    const { uid, token } = await getAuthenticatedToken();
    try {
      const data = await apiJson(`/api/support/tickets/${encodeURIComponent(ticketId)}`, token, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      const updated = data.ticket as SupportTicket;
      const db = await getClientDb();
      if (db) {
        await setDoc(doc(db, 'support_tickets', ticketId), updated, { merge: true }).catch(
          () => {}
        );
      }
      return updated;
    } catch (err: any) {
      const db = await getClientDb();
      if (db && err?.message?.includes('not found') && existingTicket) {
        const nowIso = new Date().toISOString();
        const next: SupportTicket = { ...existingTicket, updatedAt: nowIso };
        const addedEvents: SupportHistoryEvent[] = [];
        if (updates.status && updates.status !== next.status) {
          addedEvents.push({
            id: `hist-${Date.now()}-st`,
            action: 'STATUS_CHANGED',
            actorRole: 'owner',
            actorName: 'Vivek Singh Negi (Owner)',
            timestamp: nowIso,
            details: `Ticket status changed from "${next.status}" to "${updates.status}".`,
          });
          next.status = updates.status;
          if (updates.status === 'Resolved') {
            next.resolvedAt = next.resolvedAt || nowIso;
            next.closedAt = null;
          } else if (updates.status === 'Closed') {
            next.resolvedAt = next.resolvedAt || nowIso;
            next.closedAt = nowIso;
          } else {
            next.resolvedAt = null;
            next.closedAt = null;
          }
        }
        if (updates.priority && updates.priority !== next.priority) {
          addedEvents.push({
            id: `hist-${Date.now()}-pr`,
            action: 'PRIORITY_CHANGED',
            actorRole: 'owner',
            actorName: 'Vivek Singh Negi (Owner)',
            timestamp: nowIso,
            details: `Priority updated from "${next.priority}" to "${updates.priority}".`,
          });
          next.priority = updates.priority;
        }
        if (updates.assignedAgentName !== undefined) {
          next.assignedAgentId = updates.assignedAgentId ?? null;
          next.assignedAgentName = updates.assignedAgentName ?? null;
          addedEvents.push({
            id: `hist-${Date.now()}-ag`,
            action: 'ASSIGNEE_UPDATED',
            actorRole: 'owner',
            actorName: 'Vivek Singh Negi (Owner)',
            timestamp: nowIso,
            details: updates.assignedAgentName
              ? `Assigned ticket to ${updates.assignedAgentName}.`
              : 'Unassigned ticket.',
          });
        }
        if (updates.markReadByOwner) {
          next.unreadForOwner = false;
        }
        next.history = [...(next.history || []), ...addedEvents];
        await setDoc(doc(db, 'support_tickets', ticketId), next, { merge: true });
        await setDoc(doc(db, 'audit_logs', `aud_tkt_${ticketId}_${Date.now()}`), {
          id: `aud_tkt_${ticketId}_${Date.now()}`,
          action: 'SUPPORT_TICKET_UPDATED',
          targetType: 'support_ticket',
          targetId: ticketId,
          actorUid: uid,
          actorEmail: 'vivekn528@gmail.com',
          actorName: 'Vivek Singh Negi',
          details: addedEvents.map((e) => e.details).join(' '),
          createdAt: nowIso,
        }).catch(() => {});
        return next;
      }
      throw err;
    }
  },

  async updateRefundDecision(
    ticketId: string,
    payload: {
      status: Exclude<SupportRefundStatus, 'None'>;
      amount: number;
      reason: string;
      settlementReference?: string;
      manualConfirmationChecked?: boolean;
    },
    existingTicket?: SupportTicket
  ): Promise<SupportTicket> {
    const { uid, token } = await getAuthenticatedToken();
    try {
      const data = await apiJson(
        `/api/support/tickets/${encodeURIComponent(ticketId)}/refund`,
        token,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      const updated = data.ticket as SupportTicket;
      const db = await getClientDb();
      if (db) {
        await setDoc(doc(db, 'support_tickets', ticketId), updated, { merge: true }).catch(
          () => {}
        );
      }
      return updated;
    } catch (err: any) {
      const db = await getClientDb();
      if (db && err?.message?.includes('not found') && existingTicket) {
        if (payload.status === 'Processed') {
          if (existingTicket.refund?.status === 'Rejected') {
            throw new Error('Cannot mark a rejected refund as Processed.');
          }
          if (!payload.manualConfirmationChecked || !payload.settlementReference || payload.settlementReference.trim().length < 3) {
            throw new Error('Explicit confirmation and settlement reference (at least 3 chars) are required to mark Processed.');
          }
        }
        const nowIso = new Date().toISOString();
        const next: SupportTicket = {
          ...existingTicket,
          updatedAt: nowIso,
          unreadForCustomer: true,
          refund: {
            status: payload.status,
            amount: payload.status === 'Rejected' ? 0 : Math.round(Number(payload.amount || 0)),
            reason: payload.reason.trim(),
            requestedAt: existingTicket.refund?.requestedAt || nowIso,
            decidedAt: nowIso,
            processedAt: payload.status === 'Processed' ? nowIso : undefined,
            responsibleAdmin: 'Vivek Singh Negi (vivekn528@gmail.com)',
            settlementReference: payload.settlementReference?.trim() || undefined,
            manualConfirmationChecked:
              payload.status === 'Processed' ? Boolean(payload.manualConfirmationChecked) : false,
          },
          history: [
            ...(existingTicket.history || []),
            {
              id: `hist-${Date.now()}-ref`,
              action: `REFUND_${payload.status.toUpperCase()}`,
              actorRole: 'owner',
              actorName: 'Vivek Singh Negi (Owner)',
              timestamp: nowIso,
              details: `Refund set to ${payload.status} (₹${payload.status === 'Rejected' ? 0 : Math.round(Number(payload.amount || 0))}) · Reason: ${payload.reason.trim()}`,
            },
          ],
        };
        await setDoc(doc(db, 'support_tickets', ticketId), next, { merge: true });
        await setDoc(doc(db, 'audit_logs', `aud_ref_${ticketId}_${Date.now()}`), {
          id: `aud_ref_${ticketId}_${Date.now()}`,
          action: `SUPPORT_REFUND_${payload.status.toUpperCase()}`,
          targetType: 'support_ticket',
          targetId: ticketId,
          actorUid: uid,
          actorEmail: 'vivekn528@gmail.com',
          actorName: 'Vivek Singh Negi',
          details: `Refund ${payload.status} · Reason: ${payload.reason.trim()}`,
          createdAt: nowIso,
        }).catch(() => {});
        return next;
      }
      throw err;
    }
  },

  async submitCustomerRating(
    ticketId: string,
    rating: number,
    feedback?: string,
    existingTicket?: SupportTicket
  ): Promise<SupportTicket> {
    const { token } = await getAuthenticatedToken();
    try {
      const data = await apiJson(
        `/api/support/tickets/${encodeURIComponent(ticketId)}/csat`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ rating, feedback }),
        }
      );
      const updated = data.ticket as SupportTicket;
      const db = await getClientDb();
      if (db) {
        await updateDoc(doc(db, 'support_tickets', ticketId), {
          satisfactionRating: updated.satisfactionRating,
          satisfactionFeedback: updated.satisfactionFeedback,
          ratedAt: updated.ratedAt,
          history: updated.history,
          updatedAt: updated.updatedAt,
        }).catch(() => {});
      }
      return updated;
    } catch (err: any) {
      const db = await getClientDb();
      if (db && err?.message?.includes('not found') && existingTicket) {
        const nowIso = new Date().toISOString();
        const nextHistory: SupportHistoryEvent[] = [
          ...(existingTicket.history || []),
          {
            id: `hist-${Date.now()}-csat`,
            action: 'CSAT_SUBMITTED',
            actorRole: 'customer',
            actorName: existingTicket.customerName,
            timestamp: nowIso,
            details: `Customer rated resolution ${rating}/5 stars.`,
          },
        ];
        await updateDoc(doc(db, 'support_tickets', ticketId), {
          satisfactionRating: rating,
          satisfactionFeedback: feedback?.trim() || null,
          ratedAt: nowIso,
          history: nextHistory,
          updatedAt: nowIso,
        });
        return {
          ...existingTicket,
          satisfactionRating: rating,
          satisfactionFeedback: feedback?.trim() || null,
          ratedAt: nowIso,
          history: nextHistory,
          updatedAt: nowIso,
        };
      }
      throw err;
    }
  },
};
