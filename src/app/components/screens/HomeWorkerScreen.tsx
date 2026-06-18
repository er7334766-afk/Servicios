import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Bell, TrendingUp, Briefcase, Star, Calendar, MapPin, Clock, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { useApp } from '../../context/AppContext';
import { MOCK_BOOKINGS, MOCK_JOB_POSTS, MOCK_WORKERS, SERVICE_CATEGORIES } from '../../data/mockData';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-[#1A56DB]',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Confirmado',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export default function HomeWorkerScreen() {
  const navigate = useNavigate();
  const { currentUser, unreadNotifications, workerAvailability, setWorkerAvailability } = useApp();
  const workerProfile = MOCK_WORKERS[0];

  const myBookings = MOCK_BOOKINGS.filter(
    (b) => b.workerId === 'w1' && ['accepted', 'in_progress', 'pending'].includes(b.status)
  ).slice(0, 3);
  const openJobs = MOCK_JOB_POSTS.filter((j) => j.clientId !== 'c1').slice(0, 2);

  const weekEarnings = MOCK_BOOKINGS
    .filter((b) => b.workerId === 'w1' && b.status === 'completed')
    .reduce((acc, b) => acc + b.price, 0);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={workerProfile.avatarUrl}
              alt={workerProfile.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-white/50"
            />
            <div>
              <p className="text-white/70 text-xs">Hola,</p>
              <p className="text-white font-bold">{currentUser?.name?.split(' ')[0] ?? 'Carlos'}</p>
            </div>
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
          </div>
        </div>

        {/* Availability toggle */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between border border-white/20">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${workerAvailability ? 'bg-green-400' : 'bg-slate-400'}`} />
            <span className="text-white text-sm font-medium">
              {workerAvailability ? 'Disponible para trabajos' : 'No disponible'}
            </span>
          </div>
          <button
            onClick={() => setWorkerAvailability(!workerAvailability)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              workerAvailability ? 'bg-green-400' : 'bg-white/30'
            }`}
          >
            <motion.div
              animate={{ x: workerAvailability ? 24 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
            />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: 'Esta semana', value: `$${weekEarnings.toLocaleString()}`, color: '#1A56DB' },
            { icon: Briefcase, label: 'Este mes', value: `${workerProfile.jobCount}`, color: '#16A34A' },
            { icon: Star, label: 'Calificación', value: `${workerProfile.rating}★`, color: '#D97706' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card rounded-2xl border border-border p-3 text-center">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                style={{ backgroundColor: color + '15' }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-xs font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming bookings */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Próximos trabajos</h2>
          <button
            className="text-xs text-[#1A56DB] flex items-center gap-0.5"
            onClick={() => navigate('/home/agenda')}
          >
            Ver agenda <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {myBookings.length === 0 ? (
          <div className="bg-muted rounded-2xl p-5 text-center">
            <p className="text-muted-foreground text-sm">No tienes trabajos próximos</p>
          </div>
        ) : (
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
                    <div>
                      <p className="text-sm font-semibold text-foreground">{booking.clientName}</p>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: cat?.bgColor, color: cat?.color }}
                      >
                        {cat?.label}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status]}`}>
                      {STATUS_LABELS[booking.status]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{booking.description}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{booking.timeSlot}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* New job requests */}
      <div className="px-5 mt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Nuevas solicitudes</h2>
          <button className="text-xs text-[#1A56DB] flex items-center gap-0.5" onClick={() => navigate('/home/search')}>
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {openJobs.map((job) => {
            const cat = SERVICE_CATEGORIES.find((c) => c.id === job.category);
            return (
              <motion.div
                key={job.id}
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-2xl border border-border p-4"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <ImageWithFallback
                      src={job.clientAvatar}
                      alt={job.clientName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.clientName}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#1A56DB]">${job.budget.toLocaleString()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 mb-3 line-clamp-2">{job.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{job.location}</span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    className="bg-[#1A56DB] text-white text-xs px-4 py-1.5 rounded-full font-semibold"
                  >
                    Aceptar
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
