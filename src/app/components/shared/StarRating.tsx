import { useState } from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  max?: number;
  interactive?: boolean;
  onChange?: (v: number) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
};

export function StarRating({ value, max = 5, interactive = false, onChange, size = 'sm' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = interactive && hovered > 0 ? hovered : value;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i + 1 <= display;
        return (
          <motion.button
            key={i}
            type="button"
            disabled={!interactive}
            whileHover={interactive ? { scale: 1.2 } : undefined}
            whileTap={interactive ? { scale: 0.9 } : undefined}
            onClick={() => interactive && onChange?.(i + 1)}
            onMouseEnter={() => interactive && setHovered(i + 1)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              className={`${sizeMap[size]} transition-colors ${
                filled ? 'fill-amber-400 text-amber-400' : 'fill-none text-slate-300'
              }`}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
