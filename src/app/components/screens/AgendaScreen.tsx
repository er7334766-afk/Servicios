import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MOCK_BOOKINGS, SERVICE_CATEGORIES } from '../../data/mockData';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: ComponentType<{ className?: string }> }> = {
  pending:     { bg: 'bg-amber-100',  text: 'text-amber-700',   icon: AlertCircle },
  accepted:    { bg: 'bg-blue-100',   text: 'text-[#1A56DB]',   icon: CheckCircle },
  in_progress: { bg: 'bg-purple-100', text: 'text-purple-700',  icon: Loader },
  completed:   { bg: 'bg-green-100',  text: 'text-green-700',   icon: CheckCircle },
  cancelled:   { bg: 'bg-red-100',    text: 'text-red-600',     icon: AlertCircle },
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', accepted: 'Confirmado', in_progress: 'En progreso', completed: 'Completado', cancelled: 'Cancelado',
};

export default function AgendaScreen() {
  const { role, agendaSlots, toggleSlotAvailability } = useApp();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 5)); // June 2026

  const workerBookings = MOCK_BOOKINGS.filter((b) => b.workerId === 'w1');
  const clientBookings = MOCK_BOOKINGS.filter((b) => b.clientId === 'c1');
  const displayBookings = role === 'worker' ? workerBookings : clientBookings;

  // Week view helpers
  const getWeekDays = (date: Date) => {
    const week = [];
    const start = new Date(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const weekDays = getWeekDays(currentDate);
  const today = new Date(2026, 5, 5);

  const hasBookingOnDate = (date: Date) => {
    const ds = date.toISOString().split('T')[0];
    return displayBookings.some((b) => b.date === ds);
  };

  const getSlotForDate = (date: Date) => {
    const ds = date.toISOString().split('T')[0];
    return agendaSlots.filter((s) => s.date === ds);
  };

  const selectedDayBookings = displayBookings.filter(
    (b) => b.date === currentDate.toISOString().split('T')[0]
  );

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  // Month grid
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card px-4 pt-10 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-foreground">
            {role === 'worker' ? 'Mi Agenda' : 'Mis Reservas'}
          </h1>
          <div className="flex bg-muted rounded-xl p-1">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === v ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {v === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between">
          <button onClick={prevWeek} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-foreground">
            {viewMode === 'week'
              ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS[weekDays[0].getMonth()]}`
              : `${MONTHS[month]} ${year}`}
          </p>
          <button onClick={nextWeek} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {viewMode === 'week' ? (
          <div className="px-4 pt-4">
            {/* Week columns */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {weekDays.map((d) => {
                const isToday = d.toDateString() === today.toDateString();
                const isSelected = d.toDateString() === currentDate.toDateString();
                const hasBooking = hasBookingOnDate(d);
                return (
                  <motion.button
                    key={d.toISOString()}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setCurrentDate(new Date(d))}
                    className={`flex flex-col items-center py-2 rounded-xl transition-all ${
                      isSelected ? 'bg-[#1A56DB] text-white' : isToday ? 'bg-secondary text-[#1A56DB]' : 'text-foreground'
                    }`}
                  >
                    <span className={`text-[10px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {DAYS[d.getDay()]}
                    </span>
                    <span className="text-sm font-bold mt-0.5">{d.getDate()}</span>
                    {hasBooking && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-[#1A56DB]'}`} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Time slots for workers */}
            {role === 'worker' && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Horarios — {currentDate.getDate()} {MONTHS[currentDate.getMonth()]}
                </p>
                {getSlotForDate(currentDate).length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {getSlotForDate(currentDate).map((slot) => {
                      const booking = slot.bookingId
                        ? MOCK_BOOKINGS.find((b) => b.id === slot.bookingId)
                        : null;
                      return (
                        <div
                          key={slot.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${
                            booking
                              ? 'bg-[#EFF4FF] border-[#1A56DB]/30'
                              : slot.available
                              ? 'bg-green-50 border-green-200'
                              : 'bg-muted border-border'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${booking ? 'bg-[#1A56DB]' : slot.available ? 'bg-green-500' : 'bg-slate-400'}`} />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-foreground">{slot.startTime} – {slot.endTime}</p>
                            {booking && <p className="text-[10px] text-muted-foreground">{booking.clientName} · {booking.description}</p>}
                            {!booking && <p className="text-[10px] text-muted-foreground">{slot.available ? 'Disponible' : 'No disponible'}</p>}
                          </div>
                          {!booking && (
                            <button
                              onClick={() => toggleSlotAvailability(slot.id)}
                              className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                                slot.available ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {slot.available ? 'Disponible' : 'Bloqueado'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-3">Sin horarios configurados</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 pt-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const date = new Date(year, month, day);
                const isToday = date.toDateString() === today.toDateString();
                const hasBooking = hasBookingOnDate(date);
                const isSelected = date.toDateString() === currentDate.toDateString();
                return (
                  <motion.button
                    key={day}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentDate(date)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all ${
                      isSelected ? 'bg-[#1A56DB] text-white' : isToday ? 'bg-secondary text-[#1A56DB]' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {day}
                    {hasBooking && (
                      <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-[#1A56DB]'}`} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bookings list */}
        <div className="px-4 pb-6">
          <p className="text-sm font-bold text-foreground mb-3">
            {role === 'worker' ? 'Todos los trabajos' : 'Historial de reservas'}
          </p>
          {displayBookings.length > 0 ? (
            <div className="flex flex-col gap-3">
              {displayBookings.map((booking) => {
                const cat = SERVICE_CATEGORIES.find((c) => c.id === booking.category);
                const st = STATUS_COLORS[booking.status];
                const StatusIcon = st.icon;
                return (
                  <motion.div
                    key={booking.id}
                    whileTap={{ scale: 0.98 }}
                    className="bg-card rounded-2xl border border-border p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {role === 'worker' ? booking.clientName : booking.workerName}
                        </p>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: cat?.bgColor, color: cat?.color }}
                        >
                          {cat?.label}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${st.bg} ${st.text}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_LABELS[booking.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{booking.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{booking.date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{booking.timeSlot}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-[#1A56DB]">${booking.price.toLocaleString()}</span>
                    </div>
                    {booking.status === 'completed' && role === 'client' && (
                      <button
                        onClick={() => navigate(`/home/review/${booking.id}`)}
                        className="w-full mt-3 bg-secondary text-secondary-foreground rounded-xl py-2 text-xs font-semibold"
                      >
                        Calificar servicio
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No hay reservas aún</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
