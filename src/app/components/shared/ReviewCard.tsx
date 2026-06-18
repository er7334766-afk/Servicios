import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from './StarRating';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import type { Review } from '../../types';

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [showReply, setShowReply] = useState(false);

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-start gap-3">
        <ImageWithFallback
          src={review.reviewerAvatarUrl}
          alt={review.reviewerName}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{review.reviewerName}</p>
            <span className="text-xs text-muted-foreground">{formatDate(review.date)}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <StarRating value={review.rating} size="xs" />
            <span className="text-xs font-semibold text-foreground">{review.rating}.0</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-foreground mt-3 leading-relaxed">{review.comment}</p>

      {/* Sub-criteria */}
      <div className="flex gap-4 mt-2">
        {[
          { label: 'Puntualidad', value: review.punctualityRating },
          { label: 'Calidad', value: review.qualityRating },
          { label: 'Comunicación', value: review.communicationRating },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{c.label}:</span>
            <span className="text-[10px] font-semibold text-foreground">{c.value}/5</span>
          </div>
        ))}
      </div>

      {review.workerReply && (
        <div className="mt-3">
          <button
            onClick={() => setShowReply(!showReply)}
            className="flex items-center gap-1 text-xs text-[#1A56DB]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Respuesta del trabajador
            {showReply ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showReply && (
            <div className="mt-2 bg-secondary rounded-xl p-3">
              <p className="text-xs text-foreground leading-relaxed">{review.workerReply}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
