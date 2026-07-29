import type { ComponentType, CSSProperties } from 'react';
import { motion } from 'motion/react';
import {
  Droplets, Zap, Sparkles, HardHat, PaintBucket, Hammer, Leaf, Wrench,
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { IcoFetcher } from '../figma/IcoFetcher';
import type { ServiceCategory, ServiceCategoryItem } from '../../types';

const DEFAULT_CATEGORIES: ServiceCategoryItem[] = [
  {
    id: 'plomeria',
    label: 'Plomería',
    icon: 'Droplets',
    color: '#1A56DB',
    bgColor: '#EFF4FF',
    iconUrl: 'https://serviapp.blob.core.windows.net/img/plomeria.ico',
  },
  { id: 'electricidad', label: 'Electricidad', icon: 'Zap', color: '#D97706', bgColor: '#FFFBEB', iconUrl: 'https://serviapp.blob.core.windows.net/img/electricidad.ico' },
  { id: 'limpieza', label: 'Limpieza', icon: 'Sparkles', color: '#059669', bgColor: '#ECFDF5', iconUrl: 'https://serviapp.blob.core.windows.net/img/limpieza.ico' },
  { id: 'construccion', label: 'Construcción', icon: 'HardHat', color: '#7C3AED', bgColor: '#F5F3FF', iconUrl: 'https://serviapp.blob.core.windows.net/img/construccion.ico' },
  { id: 'pintura', label: 'Pintura', icon: 'PaintBucket', color: '#DC2626', bgColor: '#FEF2F2', iconUrl: 'https://serviapp.blob.core.windows.net/img/pintura.ico' },
  { id: 'carpinteria', label: 'Carpintería', icon: 'Hammer', color: '#0F766E', bgColor: '#F0FDFA', iconUrl: 'https://serviapp.blob.core.windows.net/img/carpinteria.ico' },
  { id: 'jardineria', label: 'Jardinería', icon: 'Leaf', color: '#65A30D', bgColor: '#F7FEE7', iconUrl: 'https://serviapp.blob.core.windows.net/img/jardineria.ico' },
  { id: 'electrodomesticos', label: 'Electrodomésticos', icon: 'Wrench', color: '#475569', bgColor: '#F8FAFC', iconUrl: 'https://serviapp.blob.core.windows.net/img/electrodomestico.ico' },
];

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

export function ServiceCategoryGrid({ onSelect, selected, categories = DEFAULT_CATEGORIES }: ServiceCategoryGridProps) {
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
                  {cat.iconUrl ? (
                    /\.ico(\?|$)/i.test(String(cat.iconUrl)) ? (
                      <IcoFetcher src={cat.iconUrl} alt={cat.label} className="w-5 h-5 object-contain" />
                    ) : (
                      <ImageWithFallback src={cat.iconUrl} alt={cat.label} className="w-5 h-5 object-contain" />
                    )
                  ) : (
                    Icon && <Icon className="w-5 h-5" style={{ color: cat.color }} />
                  )}
                </div>
            <span className="text-[10px] text-center text-foreground leading-tight">{cat.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

