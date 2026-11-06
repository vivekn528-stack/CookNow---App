import React, { useState } from 'react';
import { X, Star, Send } from 'lucide-react';
import { Order, Review } from '../types';

interface ReviewModalProps {
  order: Order | null;
  onClose: () => void;
  onSubmitReview: (review: Review) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose, onSubmitReview }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please share at least a short 5-character comment about your food experience.');
      return;
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      isAnonymous,
      cookId: order.cookId,
      rating,
      comment: comment.trim(),
      isReported: false,
      createdAt: new Date().toISOString(),
    };

    onSubmitReview(newReview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200">
        <div className="p-5 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">Review Your Meal</h2>
            <p className="text-xs text-stone-500">Cooked by {order.kitchenName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg">{error}</p>}

          <div className="text-center space-y-2">
            <span className="text-xs font-semibold text-stone-600">Rate your food & taste</span>
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 cursor-pointer focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-stone-100 text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs text-stone-400 block font-medium">
              {rating === 5 && 'Outstanding Homestyle Taste!'}
              {rating === 4 && 'Very Tasty & Fresh'}
              {rating === 3 && 'Average Homestyle Meal'}
              {rating === 2 && 'Needs Improvement'}
              {rating === 1 && 'Not Satisfied'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Your Review / Feedback
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How were the rotis, spices, and delivery? Helpful for fellow students in Nalapani Chowk..."
              className="w-full p-3 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-700"
            />
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="anonymousReview"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 rounded text-emerald-800 focus:ring-emerald-700 cursor-pointer"
            />
            <label htmlFor="anonymousReview" className="text-xs text-stone-700 cursor-pointer select-none">
              <span className="font-semibold text-stone-900 block">Post as Anonymous Student / Resident</span>
              <span className="text-[11px] text-stone-500">
                Your name and phone number remain confidential and are never revealed to the cook or public.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Honest Review</span>
          </button>
        </form>
      </div>
    </div>
  );
};
