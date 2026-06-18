import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { MapPin, Star, Clock } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Worker } from '../../types';
import { SERVICE_CATEGORIES } from '../../data/mockData';

interface WorkerCardProps {
  worker: Worker;
  variant?: 'compact' | 'full';
}

export function WorkerCard({ worker, variant = 'full' }: WorkerCardProps) {
  const navigate = useNavigate();
  const categoryLabels = worker.categories
    .map((c) => SERVICE_CATEGORIES.find((s) => s.id === c)?.label)
    .filter(Boolean)
    .join(', ');

  if (variant === 'compact') {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/home/worker/${worker.id}`)}
        className="w-40 flex-shrink-0 bg-card rounded-2xl border border-border p-3 cursor-pointer shadow-sm"
      >
        <div className="relative mb-2">
          <ImageWithFallback
            src={worker.avatarUrl}
            alt={worker.name}
            className="w-full h-24 object-cover rounded-xl"
          />
          {worker.isAvailable && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{worker.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{categoryLabels}</p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold text-foreground">{worker.rating}</span>
          <span className="text-[10px] text-muted-foreground">({worker.reviewCount})</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{worker.distanceKm} km</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/home/worker/${worker.id}`)}
      className="bg-card rounded-2xl border border-border p-3 flex gap-3 cursor-pointer shadow-sm"
    >
      <div className="relative flex-shrink-0">
        <ImageWithFallback
          src={worker.avatarUrl}
          alt={worker.name}
          className="w-16 h-16 object-cover rounded-xl"
        />
        {worker.isAvailable && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{worker.name}</p>
            <p className="text-xs text-muted-foreground">{categoryLabels}</p>
          </div>
          <span className="text-xs font-semibold text-[#1A56DB] flex-shrink-0">
            ${worker.pricePerHour}/hr
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold">{worker.rating}</span>
            <span className="text-[11px] text-muted-foreground">({worker.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{worker.distanceKm} km</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">{worker.jobCount} trabajos</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
