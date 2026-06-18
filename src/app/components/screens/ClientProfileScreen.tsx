import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Settings, Star, Briefcase, MapPin, Calendar, ChevronRight, LogOut } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { useApp } from '../../context/AppContext';
import { MOCK_BOOKINGS, MOCK_REVIEWS, SERVICE_CATEGORIES } from '../../data/mockData';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-[#1A56DB]',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Confirmado',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export default function ClientProfileScreen() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useApp();

  const myBookings = MOCK_BOOKINGS.filter((b) => b.clientId === 'c1');
  const myReviews = MOCK_REVIEWS.filter((r) => r.reviewerId === 'c1');

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Mi Perfil</h1>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Profile card floating over header */}
      <div className="px-5 -mt-12">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ImageWithFallback
                src={currentUser?.avatarUrl ?? ''}
                alt={currentUser?.name ?? ''}
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1A56DB] rounded-full flex items-center justify-center">
                <Settings className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">{currentUser?.name}</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{currentUser?.location}</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-muted-foreground">Cliente desde {currentUser?.joinedDate?.split('-')[0]}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">{myBookings.length}</p>
              <p className="text-[11px] text-muted-foreground">Servicios</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">{myReviews.length}</p>
              <p className="text-[11px] text-muted-foreground">Reseñas</p>
            </div>
            <div className="w-px bg-border" />
            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">0</p>
              <p className="text-[11px] text-muted-foreground">Favoritos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings history */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Historial de servicios</h2>
        </div>
        <div className="flex flex-col gap-3">
          {myBookings.map((booking) => {
            const cat = SERVICE_CATEGORIES.find((c) => c.id === booking.category);
            return (
              <motion.div
                key={booking.id}
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <ImageWithFallback
                      src={booking.workerAvatar}
                      alt={booking.workerName}
                      className="w-9 h-9 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{booking.workerName}</p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: cat?.bgColor, color: cat?.color }}
                      >
                        {cat?.label}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status]}`}>
                    {STATUS_LABELS[booking.status]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{booking.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{booking.date} · {booking.timeSlot}</span>
                  </div>
                  <span className="text-sm font-bold text-[#1A56DB]">${booking.price.toLocaleString()}</span>
                </div>
                {booking.status === 'completed' && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigate(`/home/review/${booking.id}`)}
                    className="w-full mt-3 bg-secondary text-secondary-foreground rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5" /> Calificar servicio
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Reviews given */}
      {myReviews.length > 0 && (
        <div className="px-5 mt-5">
          <h2 className="text-base font-bold text-foreground mb-3">Reseñas que dejé</h2>
          <div className="flex flex-col gap-3">
            {myReviews.map((r) => (
              <div key={r.id} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">{r.reviewerName}</span>
                  <StarRating value={r.rating} size="xs" />
                </div>
                <p className="text-xs text-muted-foreground">{r.comment}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{r.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account options */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-bold text-foreground mb-3">Cuenta</h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {[
            { label: 'Editar perfil', icon: Settings },
            { label: 'Mis favoritos', icon: Star },
            { label: 'Reportar un problema', icon: Briefcase, action: () => navigate('/home/report') },
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
