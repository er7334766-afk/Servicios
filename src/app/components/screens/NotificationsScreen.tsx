import type { ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Briefcase, MessageCircle, Star, Calendar, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  job_request: Briefcase,
  message: MessageCircle,
  review: Star,
  booking_update: Calendar,
};
const TYPE_COLORS: Record<string, string> = {
  job_request: '#1A56DB',
  message: '#16A34A',
  review: '#D97706',
  booking_update: '#7C3AED',
};
const TYPE_BG: Record<string, string> = {
  job_request: '#EFF4FF',
  message: '#F0FDF4',
  review: '#FFFBEB',
  booking_update: '#F5F3FF',
};

function formatRelative(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} día${days > 1 ? 's' : ''}`;
}

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useApp();

  const today = notifications.filter((n) => {
    const diff = Date.now() - new Date(n.timestamp).getTime();
    return diff < 86400000;
  });
  const older = notifications.filter((n) => {
    const diff = Date.now() - new Date(n.timestamp).getTime();
    return diff >= 86400000;
  });

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card px-4 pt-10 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Notificaciones</h1>
            {unread > 0 && (
              <p className="text-xs text-muted-foreground">{unread} sin leer</p>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="text-xs text-[#1A56DB] font-semibold"
            >
              Marcar todo leído
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No tienes notificaciones</p>
          </div>
        )}

        {today.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wide">Hoy</p>
            {today.map((n, i) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => {
                    markNotificationRead(n.id);
                    if (n.linkTo) navigate(n.linkTo);
                  }}
                  className={`flex items-start gap-3 px-5 py-4 border-b border-border cursor-pointer transition-colors ${
                    !n.read ? 'bg-secondary/50' : 'bg-card'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: TYPE_BG[n.type] }}
                  >
                    <Icon className="w-5 h-5" style={{ color: TYPE_COLORS[n.type] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.read ? 'font-semibold' : 'font-medium'} text-foreground`}>{n.title}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatRelative(n.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 bg-[#1A56DB] rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </motion.div>
              );
            })}
          </>
        )}

        {older.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wide">Esta semana</p>
            {older.map((n, i) => {
              const Icon = TYPE_ICONS[n.type] ?? Bell;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (today.length + i) * 0.04 }}
                  onClick={() => {
                    markNotificationRead(n.id);
                    if (n.linkTo) navigate(n.linkTo);
                  }}
                  className="flex items-start gap-3 px-5 py-4 border-b border-border cursor-pointer bg-card"
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: TYPE_BG[n.type] }}
                  >
                    <Icon className="w-5 h-5" style={{ color: TYPE_COLORS[n.type] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-muted-foreground">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatRelative(n.timestamp)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
