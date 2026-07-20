import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Bell, Search, MapPin, ChevronRight, Plus } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { WorkerCard } from '../shared/WorkerCard';
import { ServiceCategoryGrid } from '../shared/ServiceCategoryGrid';
import { useApp } from '../../context/AppContext';
import { MOCK_WORKERS, MOCK_JOB_POSTS, SERVICE_CATEGORIES } from '../../data/mockData';
import type { ServiceCategory } from '../../types';

import { useState } from 'react'; //agredado

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-[#1A56DB]',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Confirmado',
  in_progress: 'En progreso',
  completed: 'Completado',
};

export default function HomeClientScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('card'); //agregado
  const { currentUser, unreadNotifications } = useApp();

  const featured = [...MOCK_WORKERS].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const myPosts = MOCK_JOB_POSTS.filter((p) => p.clientId === 'c1').slice(0, 2);

  const handleCategorySelect = (cat: ServiceCategory) => {
    navigate(`/home/search?cat=${cat}`);
  };

  return (
    <div className="pb-4">
      {/* Top bar */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">Buenos días,</p>
            <p className="text-white font-bold text-lg">{currentUser?.name?.split(' ')[0] ?? 'Usuario'} 👋</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/home/notifications')}
              className="relative w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-[#1A56DB]" />
              )}
            </motion.button>
            <ImageWithFallback
              src={currentUser?.avatarUrl ?? ''}
              alt={currentUser?.name ?? ''}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
            />
          </div>
        </div>

        {/* Search bar */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          //AGREGADO
          onClick={() => { navigate('/home/search'); }}
          //agregado
          className="w-full bg-white rounded-xl flex items-center gap-3 px-4 py-3 shadow-lg"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">¿Qué servicio necesitas?</span>
          <div className="ml-auto flex items-center gap-1 bg-[#EFF4FF] px-2 py-1 rounded-lg">
            <MapPin className="w-3 h-3 text-[#1A56DB]" />
            <span className="text-[11px] text-[#1A56DB] font-medium">Condesa</span>
          </div>
        </motion.button>
      </div>

      <div className="px-5 mt-5">
        {/* Categories */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Categorías</h2>
          <button className="text-xs text-[#1A56DB] flex items-center gap-0.5" onClick={() => navigate('/home/search')}>
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <ServiceCategoryGrid onSelect={handleCategorySelect} categories={SERVICE_CATEGORIES} />
      </div>

      {/* Featured workers */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-5">
          <h2 className="text-base font-bold text-foreground">Trabajadores destacados</h2>
          <button className="text-xs text-[#1A56DB] flex items-center gap-0.5" onClick={() => navigate('/home/search')}>
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
          {featured.map((w) => (
            <WorkerCard key={w.id} worker={w} variant="compact" />
          ))}
        </div>
      </div>

      {/* My job posts */}
      <div className="mt-6 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Mis solicitudes</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/home/search')}
            className="w-7 h-7 bg-[#1A56DB] rounded-full flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        {myPosts.length === 0 ? (
          <div className="bg-muted rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No tienes solicitudes activas</p>
            <button onClick={() => navigate('/home/search')} className="text-[#1A56DB] text-sm font-semibold mt-1">
              Publicar una solicitud →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myPosts.map((post) => {
              const cat = SERVICE_CATEGORIES.find((c) => c.id === post.category);
              return (
                <motion.div
                  key={post.id}
                  whileTap={{ scale: 0.98 }}
                  className="bg-card rounded-2xl border border-border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: cat?.bgColor, color: cat?.color }}
                        >
                          {cat?.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{post.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.description}</p>
                    </div>
                    <span className="text-sm font-bold text-[#1A56DB] flex-shrink-0 ml-2">
                      ${post.budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{post.location}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {post.applicantCount} interesados
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent availability */}
      <div className="mt-6 px-5 pb-4">
        <h2 className="text-base font-bold text-foreground mb-3">Disponibles ahora</h2>
        <div className="flex flex-col gap-3">
          {MOCK_WORKERS.filter((w) => w.isAvailable).slice(0, 3).map((w) => (
            <WorkerCard key={w.id} worker={w} variant="full" />
          ))}
        </div>
      </div>
    </div>
  );
}
