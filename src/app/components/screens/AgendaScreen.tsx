import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { obtenerReservasEmpleado, type AgendaReserva as BackendAgendaReserva } from '../../services/agenda';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface ServicioAgenda {
  id_servicio: number;
  fk_cliente: number;
  fk_categoria: number;
  fk_empleado: number | null;
  titulo?: string | null;
  descripcion: string;
  direccion: string;
  presupuesto: number | string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string;
  nombre_cliente?: string | null;
  nombre_categoria?: string | null;
}

type AgendaItem = ServicioAgenda | BackendAgendaReserva;

const STATUS_COLORS: Record<
  string,
  {
    bg: string;
    text: string;
    icon: ComponentType<{ className?: string }>;
  }
> = {
  pendiente: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: AlertCircle,
  },
  asignado: {
    bg: 'bg-blue-100',
    text: 'text-[#1A56DB]',
    icon: CheckCircle,
  },
  'en proceso': {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: Loader,
  },
  en_proceso: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    icon: Loader,
  },
  completado: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: CheckCircle,
  },
  cancelado: {
    bg: 'bg-red-100',
    text: 'text-red-600',
    icon: AlertCircle,
  },
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  asignado: 'Asignado',
  'en proceso': 'En progreso',
  en_proceso: 'En progreso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

function normalizarFecha(fecha: string): string {
  return String(fecha ?? '').split('T')[0];
}

function fechaLocalAISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function crearFechaLocal(fecha: string): Date {
  const [anio, mes, dia] = normalizarFecha(fecha)
    .split('-')
    .map(Number);
  return new Date(anio, mes - 1, dia);
}

function formatearHora(hora?: string | null): string {
  if (!hora) return 'Sin hora';

  const valor = hora.trim();

  const obtenerPartesDesdeTimeString = (timeString: string) => {
    const partes = timeString.split(':');
    if (partes.length < 2) return null;

    const horas = Number(partes[0]);
    const minutos = Number(partes[1].split('.')[0]);

    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
      return null;
    }

    return { horas, minutos };
  };

  let partes = obtenerPartesDesdeTimeString(valor);

  if (!partes && valor.includes('T')) {
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) {
      partes = {
        horas: fecha.getHours(),
        minutos: fecha.getMinutes(),
      };
    }
  }

  if (!partes && valor.includes(' ')) {
    partes = obtenerPartesDesdeTimeString(valor.split(' ')[0]);
  }

  if (!partes) {
    return valor;
  }

  const fecha = new Date();
  fecha.setHours(partes.horas, partes.minutos, 0, 0);

  return new Intl.DateTimeFormat('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha);
}

function formatearPrecio(precio: number | string): string {
  const valor = Number(precio);

  if (Number.isNaN(valor)) return String(precio);

  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(valor);
}

function obtenerEstadoVisual(estado: string) {
  const clave = String(estado ?? '').trim().toLowerCase();
  return STATUS_COLORS[clave] ?? STATUS_COLORS.pendiente;
}

export default function AgendaScreen() {
  const { role, currentUser } = useApp();
  const navigate = useNavigate();

  const [viewMode, setViewMode] =
    useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [servicios, setServicios] = useState<AgendaItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargarAgenda() {
      try {
        setCargando(true);
        setError('');

        if (role === 'worker') {
          const idEmpleado = Number(
            currentUser?.idEmpleado ?? currentUser?.id
          );

          if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
            throw new Error('No se encontró el ID del trabajador.');
          }

          const respuesta = await fetch(
            `http://localhost:3000/api/empleados/${idEmpleado}/servicios`
          );
          const datos = await respuesta.json();

          if (!respuesta.ok) {
            throw new Error(
              datos.mensaje ?? 'No se pudieron cargar los servicios.'
            );
          }

          setServicios(Array.isArray(datos) ? datos : []);
          return;
        }

        const idCliente = Number(currentUser?.id);

        if (!Number.isInteger(idCliente) || idCliente <= 0) {
          throw new Error('No se encontró el ID del cliente.');
        }

        const respuesta = await fetch(
          'http://localhost:3000/api/servicios'
        );
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje ?? 'No se pudieron cargar las reservas.'
          );
        }

        const serviciosCliente = Array.isArray(datos)
          ? datos.filter(
              (servicio: ServicioAgenda) =>
                Number(servicio.fk_cliente) === idCliente
            )
          : [];

        setServicios(serviciosCliente);
      } catch (errorDesconocido) {
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se pudo cargar la agenda.'
        );
        setServicios([]);
      } finally {
        setCargando(false);
      }
    }

    cargarAgenda();
  }, [role, currentUser?.id, currentUser?.idEmpleado]);

  const getWeekDays = (date: Date) => {
    const week: Date[] = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 7; i += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day);
    }

    return week;
  };

  const isAgendaReserva = (
    servicio: AgendaItem
  ): servicio is BackendAgendaReserva =>
    'id_reserva' in servicio;

  const obtenerHora = (servicio: AgendaItem) => {
    const horaRaw = isAgendaReserva(servicio)
      ? servicio.hora
      : servicio.hora_inicio;

    return formatearHora(horaRaw);
  };

  const obtenerHoraFin = (servicio: AgendaItem) => {
    if (isAgendaReserva(servicio)) {
      return '';
    }

    return formatearHora(servicio.hora_fin);
  };

  const obtenerRangoHorario = (servicio: AgendaItem) => {
    const inicio = obtenerHora(servicio);
    const fin = obtenerHoraFin(servicio);

    if (!inicio && !fin) {
      return 'Horario no definido';
    }

    return fin ? `${inicio} - ${fin}` : inicio;
  };

  const obtenerDescripcion = (servicio: AgendaItem) => {
    if (isAgendaReserva(servicio)) {
      return servicio.descripcion || 'Trabajo';
    }

    return servicio.titulo || servicio.descripcion || 'Trabajo';
  };

  const obtenerEstado = (servicio: AgendaItem) => {
    if (isAgendaReserva(servicio)) {
      return 'asignado';
    }

    return String(servicio.estado ?? 'Pendiente')
      .trim()
      .toLowerCase()
      .replace('_', ' ');
  };

  const obtenerTitulo = (servicio: AgendaItem) => {
    // Azure table only exposes `descripcion`, so always use it as the title.
    return servicio.descripcion || 'Trabajo';
  };

  const obtenerSubtitulo = (servicio: AgendaItem) => {
    if (isAgendaReserva(servicio)) {
      return `Servicio #${servicio.id_servicio}`;
    }

    return `${servicio.nombre_cliente || 'Cliente'} • ${servicio.nombre_categoria || 'Sin categoría'}`;
  };

  const obtenerCategoriaLabel = (servicio: AgendaItem) => {
    if (isAgendaReserva(servicio)) {
      return 'Reserva';
    }

    return servicio.nombre_categoria || 'Sin categoría';
  };

  const obtenerClienteLabel = (servicio: AgendaItem) => {
    if (isAgendaReserva(servicio)) {
      // If the reservation references a servicio, show its id, otherwise generic label
      return servicio.id_servicio ? `Servicio #${servicio.id_servicio}` : 'Reserva';
    }

    return servicio.nombre_cliente || 'Cliente';
  };

  const weekDays = getWeekDays(currentDate);
  const today = new Date();

  const getBookingsCount = (date: Date): number => {
    const fecha = fechaLocalAISO(date);

    return servicios.filter(
      (servicio) => normalizarFecha(servicio.fecha) === fecha
    ).length;
  };

  const hasBookingOnDate = (date: Date): boolean => {
    return getBookingsCount(date) > 0;
  };

  const selectedDayBookings = useMemo(() => {
    const fecha = fechaLocalAISO(currentDate);

    return servicios
      .filter(
        (servicio) => normalizarFecha(servicio.fecha) === fecha
      )
      .sort((a, b) =>
        obtenerHora(a).localeCompare(obtenerHora(b))
      );
  }, [servicios, currentDate]);

  const cambiarPeriodo = (cantidad: number) => {
    const fecha = new Date(currentDate);

    if (viewMode === 'week') {
      fecha.setDate(fecha.getDate() + cantidad * 7);
    } else {
      fecha.setMonth(fecha.getMonth() + cantidad);
    }

    setCurrentDate(fecha);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-card px-4 pb-4 pt-10">
        <div className="mb-4 flex items-center justify-between">

           <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
              title="Regresar"
            >
              <ArrowLeft className="h-5 w-5 text-[#1A56DB]" />
            </button>

            <h1 className="text-lg font-bold text-foreground">
              {role === 'worker' ? 'Mi Agenda' : 'Mis Reservas'}
            </h1>
          </div>


          <div className="flex rounded-xl bg-muted p-1">
            {(['week', 'month'] as const).map((vista) => (
              <button
                type="button"
                key={vista}
                onClick={() => setViewMode(vista)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all ${
                  viewMode === vista
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                {vista === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => cambiarPeriodo(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <p className="text-sm font-semibold text-foreground">
            {viewMode === 'week'
              ? `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTHS[weekDays[0].getMonth()]}`
              : `${MONTHS[month]} ${year}`}
          </p>

          <button
            type="button"
            onClick={() => cambiarPeriodo(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {viewMode === 'week' ? (
          <div className="px-4 pt-4">
            <div className="mb-4 grid grid-cols-7 gap-1">
              {weekDays.map((date) => {
                const isToday =
                  date.toDateString() === today.toDateString();
                const isSelected =
                  date.toDateString() === currentDate.toDateString();
                const bookingCount = getBookingsCount(date);
                const hasBooking = bookingCount > 0;
                return (
                  <motion.button
                    type="button"
                    key={date.toISOString()}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setCurrentDate(new Date(date))}
                    className={`flex flex-col items-center rounded-xl py-2 transition-all ${
                      isSelected
                        ? 'bg-[#1A56DB] text-white'
                        : isToday
                          ? 'bg-secondary text-[#1A56DB]'
                          : 'text-foreground'
                    }`}
                  >
                    <span
                      className={`text-[10px] ${
                        isSelected
                          ? 'text-white/80'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {DAYS[date.getDay()]}
                    </span>
                    <span className="mt-0.5 text-sm font-bold">
                      {date.getDate()}
                    </span>
                    {hasBooking && (
                      <span
                        className={`mt-1 rounded-full px-1 text-[9px] font-bold ${
                          isSelected
                            ? 'bg-white text-[#1A56DB]'
                            : 'bg-[#1A56DB] text-white'
                        }`}
                      >
                        {bookingCount}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="mb-5">
              <p className="mb-2 text-sm font-semibold text-foreground">
                {role === 'worker' ? 'Trabajos del día' : 'Servicios del día'} —{' '}
                {currentDate.getDate()} {MONTHS[currentDate.getMonth()]}
              </p>

              {cargando ? (
                <div className="flex justify-center py-6">
                  <Loader className="h-6 w-6 animate-spin text-[#1A56DB]" />
                </div>
              ) : selectedDayBookings.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {selectedDayBookings.map((servicio) => (
                    <div
                      key={isAgendaReserva(servicio) ? servicio.id_reserva : servicio.id_servicio}
                      className="rounded-xl border border-[#1A56DB]/20 bg-[#EFF4FF] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {obtenerDescripcion(servicio)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {obtenerClienteLabel(servicio)} • {obtenerCategoriaLabel(servicio)}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#E0E7FF] px-3 py-1 text-xs font-semibold text-[#1A56DB]">
                          {STATUS_LABELS[String(obtenerEstado(servicio)).trim().toLowerCase()] ?? obtenerEstado(servicio)}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          {crearFechaLocal(servicio.fecha).toLocaleDateString('es-HN')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          {obtenerRangoHorario(servicio)}
                        </div>
                        {!isAgendaReserva(servicio) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5" />
                            {servicio.direccion}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay servicios para esta fecha.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[10px] font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="mb-4 grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }, (_, index) => (
                <div key={`empty-${index}`} />
              ))}

              {Array.from({ length: daysInMonth }, (_, index) => {
                const day = index + 1;
                const date = new Date(year, month, day);
                const isToday =
                  date.toDateString() === today.toDateString();
                const isSelected =
                  date.toDateString() === currentDate.toDateString();
                const bookingCount = getBookingsCount(date);
                const hasBooking = bookingCount > 0;
                return (
                  <motion.button
                    type="button"
                    key={day}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setCurrentDate(date)}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#1A56DB] text-white'
                        : isToday
                          ? 'bg-secondary text-[#1A56DB]'
                          : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {day}
                    {hasBooking && (
                      <span
                        className={`mt-1 rounded-full px-1 text-[9px] font-bold ${
                          isSelected
                            ? 'bg-white text-[#1A56DB]'
                            : 'bg-[#1A56DB] text-white'
                        }`}
                      >
                        {bookingCount}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-4 pb-6">
          <p className="mb-3 text-sm font-bold text-foreground">
            {role === 'worker'
              ? 'Todos los trabajos asignados'
              : 'Todas mis solicitudes'}
          </p>

          {cargando ? (
            <div className="flex justify-center py-8">
              <Loader className="h-7 w-7 animate-spin text-[#1A56DB]" />
            </div>
          ) : servicios.length > 0 ? (
            <div className="flex flex-col gap-3">
              {servicios.map((servicio) => {
                const estado = obtenerEstado(servicio);
                const status = obtenerEstadoVisual(estado);
                const StatusIcon = status.icon;
                const estadoClave = String(estado)
                  .trim()
                  .toLowerCase();
                const titulo = obtenerTitulo(servicio);
                const descripcion = obtenerDescripcion(servicio);
                const mostrarDescripcion =
                  descripcion && descripcion !== titulo;

                return (
                  <motion.div
                    key={isAgendaReserva(servicio) ? servicio.id_reserva : servicio.id_servicio}
                    whileTap={{ scale: 0.98 }}
                   onClick={() => {
                    if (role === 'worker') {
                      navigate(`/home/trabajo/${servicio.id_servicio}`);
                    } else {
                      navigate(`/home/contratacion/${servicio.id_servicio}`);
                    }
                  }}
                    className="cursor-pointer rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {titulo}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {obtenerSubtitulo(servicio)}
                        </p>
                      </div>

                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {STATUS_LABELS[estadoClave] ?? obtenerEstado(servicio)}
                      </span>
                    </div>

                    {mostrarDescripcion && (
                      <p className="mb-3 text-sm font-medium text-foreground">
                        {descripcion}
                      </p>
                    )}

                    <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#64748B]" />
                        <span>{crearFechaLocal(servicio.fecha).toLocaleDateString('es-HN')}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#64748B]" />
                        <span>{obtenerRangoHorario(servicio)}</span>
                      </div>

                      {!isAgendaReserva(servicio) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#64748B]" />
                          <span>{servicio.direccion}</span>
                        </div>
                      )}
                    </div>

                    {!isAgendaReserva(servicio) && (
                      <div className="mt-3 flex items-center justify-between rounded-2xl bg-[#EFF4FF] p-3 text-sm font-semibold text-[#1A56DB]">
                        <span>Presupuesto</span>
                        <span>{formatearPrecio(servicio.presupuesto)}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay servicios en la agenda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}