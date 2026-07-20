import { useNavigate } from 'react-router';
import { useState } from 'react'; //agregado 
import { motion } from 'motion/react';
import { Settings, Star, MapPin, ChevronRight, LogOut, Edit2 } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { ReviewCard } from '../shared/ReviewCard';
import { useApp } from '../../context/AppContext';
import { MOCK_WORKERS, MOCK_REVIEWS, SERVICE_CATEGORIES } from '../../data/mockData';
import EditProfileScreen from './EditProfileScreen'; // agregado

export default function WorkerOwnProfileScreen() {
  const navigate = useNavigate();
  const { setCurrentUser } = useApp();
  const [isEditing, setIsEditing] = useState(false); // agregado
  const worker = MOCK_WORKERS[0];
  const reviews = MOCK_REVIEWS.filter((r) => r.targetId === worker.id);
  const categories = worker.categories.map((c) => SERVICE_CATEGORIES.find((s) => s.id === c)).filter(Boolean);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  //agregado
  if (isEditing) {
    return (
      <EditProfileScreen 
        usuarioActual={worker} 
        rol="worker"
        onBack={() => setIsEditing(false)} 
      />
    );
  }

  return (
    <div className="pb-6">
      {/* Header banner */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Mi Perfil</h1>
          <button className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="px-5 -mt-12">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="relative">
              <ImageWithFallback
                src={worker.avatarUrl}
                alt={worker.name}
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1A56DB] rounded-full flex items-center justify-center">
                <Edit2 className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">{worker.name}</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{worker.location}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <StarRating value={worker.rating} size="xs" />
                <span className="text-xs font-semibold text-foreground">{worker.rating}</span>
                <span className="text-xs text-muted-foreground">({worker.reviewCount})</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">{worker.jobCount}</p>
              <p className="text-[11px] text-muted-foreground">Trabajos</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">{worker.reviewCount}</p>
              <p className="text-[11px] text-muted-foreground">Reseñas</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">${worker.pricePerHour}</p>
              <p className="text-[11px] text-muted-foreground">Por hora</p>
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="px-5 mt-5">
        <h2 className="text-base font-bold text-foreground mb-2">Mis servicios</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat!.id}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ backgroundColor: cat!.bgColor, color: cat!.color }}
            >
              {cat!.label}
            </span>
          ))}
          {worker.services.map((s) => (
            <span key={s} className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full border border-[#1A56DB]/20">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Gallery */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground">Galería</h2>
          <button className="text-xs text-[#1A56DB]">Agregar foto</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {worker.galleryUrls.map((url, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden">
              <ImageWithFallback src={url} alt={`Trabajo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Reseñas ({worker.reviewCount})</h2>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold">{worker.rating}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      </div>

      {/* Account options */}
      <div className="px-5 mt-6">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {[
            { label: 'Editar perfil', icon: Edit2, action: () => setIsEditing(true) }, //agregue el action
            { label: 'Gestionar disponibilidad', icon: Settings, action: () => navigate('/home/agenda') },
            { label: 'Reportar un problema', icon: Settings, action: () => navigate('/home/report') },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted transition-colors"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1 text-left">{label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="w-full mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </motion.button>
      </div>
    </div>
  );
}
