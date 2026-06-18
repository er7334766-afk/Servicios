import type { ComponentType, CSSProperties } from 'react';
import { motion } from 'motion/react';
import {
  Droplets, Zap, Sparkles, HardHat, PaintBucket, Hammer, Leaf, Wrench,
} from 'lucide-react';
import type { ServiceCategory, ServiceCategoryItem } from '../../types';
import { SERVICE_CATEGORIES } from '../../data/mockData';

const ICON_MAP: Record<string, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  Droplets,
  Zap,
  Sparkles,
  HardHat,
  PaintBucket,
  Hammer,
  Leaf,
  Wrench,
};

interface ServiceCategoryGridProps {
  onSelect?: (cat: ServiceCategory) => void;
  selected?: ServiceCategory | null;
  categories?: ServiceCategoryItem[];
}

export function ServiceCategoryGrid({ onSelect, selected, categories = SERVICE_CATEGORIES }: ServiceCategoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((cat, i) => {
        const Icon = ICON_MAP[cat.icon];
        const isSelected = selected === cat.id;
        return (
          <motion.button
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onSelect?.(cat.id)}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
              isSelected
                ? 'border-[#1A56DB] bg-[#EFF4FF]'
                : 'border-border bg-card hover:bg-muted'
            }`}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: isSelected ? cat.color + '20' : cat.bgColor }}
            >
              {Icon && <Icon className="w-5 h-5" style={{ color: cat.color }} />}
            </div>
            <span className="text-[10px] text-center text-foreground leading-tight">{cat.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
