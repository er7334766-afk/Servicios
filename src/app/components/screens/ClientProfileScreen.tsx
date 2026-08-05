//ClientProfileScreen.tsx
import { useNavigate } from 'react-router';

import { motion } from 'motion/react';
import { Settings, Star, Briefcase, MapPin, Calendar, ChevronRight, LogOut } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { useApp } from '../../context/AppContext';
import {
  useEffect,
  useState,
} from 'react';

// No mock categories imported — use a safe empty list until real categories are loaded
const SERVICE_CATEGORIES_LOCAL: any[] = [];
import EditProfileScreen from './EditProfileScreen'; //agregado

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

interface HistorialServicio {
  id_servicio: number;
  id_cliente: number;
  id_categoria?: number;
  fk_empleado?: number | null;
  titulo?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  presupuesto?: number | null;
  fecha?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  estado:
    | 'pending'
    | 'accepted'
    | 'in_progress'
    | 'completed'
    | 'cancelled';
  nombre_categoria?: string | null;
  id_empleado?: number | null;
  nombre_empleado?: string | null;
  foto_empleado?: string | null;
  id_reserva?: number | null;
  id_resena?: number | null;
  tiene_resena?: number | boolean;
}

interface HistorialResena {
  id: number;
  bookingId: number;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
}

interface HistorialRespuesta {
  servicios: HistorialServicio[];
  resenas: HistorialResena[];
  total_servicios: number;
  total_resenas: number;
}

export default function ClientProfileScreen() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useApp();
  const [isEditing, setIsEditing] = useState(false); //agregado
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [myBookings, setMyBookings] =
  useState<HistorialServicio[]>([]);

  const [myReviews, setMyReviews] =
    useState<HistorialResena[]>([]);

  const [cargandoHistorial, setCargandoHistorial] =
    useState(true);


    useEffect(() => {
  async function cargarHistorial() {
    try {
      setCargandoHistorial(true);
      setErrorMessage('');

      const idCliente = Number(
        currentUser?.id,
      );

      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        throw new Error(
          'No se encontró el identificador del cliente',
        );
      }

      const respuesta = await fetch(
        `https://servicios-59g4.onrender.com/api/clientes/${idCliente}/historial`,
        {
          cache: 'no-store',
        },
      );

      const texto =
        await respuesta.text();

      let datos: Partial<HistorialRespuesta> & {
        mensaje?: string;
        detalle?: string;
      } = {};

      if (texto.trim()) {
        try {
          datos = JSON.parse(texto);
        } catch {
          throw new Error(
            `El servidor devolvió una respuesta inválida. Código ${respuesta.status}`,
          );
        }
      }

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo cargar el historial',
        );
      }

      setMyBookings(
        Array.isArray(datos.servicios)
          ? datos.servicios
          : [],
      );

      setMyReviews(
        Array.isArray(datos.resenas)
          ? datos.resenas
          : [],
      );
    } catch (error) {
      console.error(
        'Error al cargar historial:',
        error,
      );

      setMyBookings([]);
      setMyReviews([]);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el historial',
      );
    } finally {
      setCargandoHistorial(false);
    }
  }

  if (currentUser?.id) {
    void cargarHistorial();
  } else {
    setCargandoHistorial(false);
  }
}, [currentUser?.id]);

  //agregado
  const handleCancelarServicio = (booking: any) => {

    const fechaServicio = new Date(booking.date);
    const fechaActual = new Date();

    const diferenciaTiempo = fechaServicio.getTime() - fechaActual.getTime();
    const horasRestantes = diferenciaTiempo / (1000 * 60 * 60);

    if (horasRestantes < 24) {
      const confirmaUrgente = window.confirm(
        `🚨 Faltan menos de 24 horas para el servicio.\n\nAl cancelar con poca antelación se podría aplicar un cargo por penalización.\n\n¿Deseas continuar con la cancelación de todas formas?`
      );
      if (!confirmaUrgente) return;
    } else {
      const confirmaNormal = window.confirm(
        `¿Estás seguro de que deseas cancelar el servicio con ${booking.workerName}?`
      );
      if (!confirmaNormal) return;
    }

    booking.status = 'cancelled';
    setSuccessMessage('El servicio ha sido cancelado exitosamente.');
    window.setTimeout(() => setSuccessMessage(''), 4000);

    navigate('/home/profile');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    const ok = window.confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción es irreversible.');
    if (!ok) return;

    try {
      setDeletingAccount(true);
      const resp = await fetch('/api/account', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data.mensaje || 'Error al eliminar la cuenta');
      }

      alert('Cuenta eliminada correctamente');
      setCurrentUser(null);
      navigate('/');
    } catch (error) {
      console.error('Eliminar cuenta:', error);
      alert(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta');
    } finally {
      setDeletingAccount(false);
    }
  };

  //agregado
  if (isEditing) {
    return (
      <EditProfileScreen
        usuarioActual={currentUser} // Pasa los datos del contexto (nombre, correo, etc.)
        rol="client"                // Le avisa al formulario que oculte los campos de empleado
        onBack={() => setIsEditing(false)}
      />
    );
  }
 

  return (
    <div className="pb-6">
      {errorMessage && (
        <div className="px-5 mt-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="px-5 mt-3">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">Mi Perfil</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
            >
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
              
          </div>
        </div>
      </div>

      {/* Historial de contrataciones */}
<div className="px-5 mt-5">
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-base font-bold text-foreground">
      Historial de contrataciones
    </h2>
  </div>

  {cargandoHistorial ? (
    <div className="rounded-2xl border border-border bg-card p-6 text-center">
      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />

      <p className="mt-3 text-sm text-muted-foreground">
        Cargando historial...
      </p>
    </div>
  ) : myBookings.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <Briefcase className="h-6 w-6 text-[#1A56DB]" />
      </div>

      <h3 className="mt-4 text-sm font-bold text-foreground">
        Aún no tienes contrataciones
      </h3>

      <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
        Publica un trabajo para comenzar a recibir propuestas de trabajadores.
      </p>

      <motion.button
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={() => navigate('/home')}
        className="mt-5 rounded-xl bg-[#1A56DB] px-5 py-3 text-sm font-semibold text-white"
      >
        Crear un trabajo
      </motion.button>
    </div>
  ) : (
    <div className="flex flex-col gap-3">
      {myBookings.map((booking) => (
        <motion.button
          key={booking.id_servicio}
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            navigate(
              `/home/contratacion/${booking.id_servicio}`,
            )
          }
          className="w-full rounded-2xl border border-border bg-card p-4 text-left"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <ImageWithFallback
                src={
                  booking.foto_empleado ||
                  ''
                }
                alt={
                  booking.nombre_empleado ||
                  'Trabajador'
                }
                className="h-11 w-11 rounded-xl object-cover"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {booking.nombre_empleado ||
                    'Trabajador sin asignar'}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {booking.nombre_categoria ||
                    booking.titulo ||
                    'Servicio'}
                </p>
              </div>
            </div>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
                STATUS_COLORS[
                  booking.estado
                ] ||
                'bg-gray-100 text-gray-600'
              }`}
            >
              {STATUS_LABELS[
                booking.estado
              ] || booking.estado}
            </span>
          </div>

          <p className="mb-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {booking.descripcion ||
              'Sin descripción'}
          </p>

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />

                <span className="text-xs text-muted-foreground">
                  {booking.fecha
                    ? new Date(
                        booking.fecha,
                      ).toLocaleDateString(
                        'es-HN',
                      )
                    : 'Fecha no disponible'}
                </span>
              </div>

              
            </div>

            <span className="text-sm font-bold text-[#1A56DB]">
              {new Intl.NumberFormat(
                'es-HN',
                {
                  style: 'currency',
                  currency: 'HNL',
                },
              ).format(
                Number(
                  booking.presupuesto ||
                    0,
                ),
              )}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-[#1A56DB]">
              Ver detalles
              <ChevronRight className="h-4 w-4" />
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  )}
</div>

      {/* Account options */}
      <div className="px-5 mt-6">
        <h2 className="text-base font-bold text-foreground mb-3">Cuenta</h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {[
            { label: 'Editar perfil', icon: Settings, action: () => setIsEditing(true) }, //agregue

            {
              label: 'Reportar problema de la aplicación',
              icon: Briefcase,
              action: () =>
                navigate('/home/report', {
                  state: {
                    tipoReporte: 'aplicacion',
                  },
                }),
            },
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
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="w-full mt-3 bg-white border border-red-200 text-red-600 rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {deletingAccount ? 'Eliminando...' : 'Eliminar cuenta'}
        </motion.button>
      </div>
    </div>
  );
}


