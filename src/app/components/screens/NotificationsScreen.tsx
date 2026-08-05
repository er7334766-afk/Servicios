import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router';

import { motion } from 'motion/react';

import {
  ChevronLeft,
  Briefcase,
  MessageCircle,
  Star,
  Calendar,
  Bell,
  RefreshCw,
  UserRoundCheck,
  CheckCircle2,
  PlayCircle,
  XCircle,
  MoreVertical,
  CheckCheck,
  Trash2,
} from 'lucide-react';

import type {
  LucideIcon,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';

const API_URL =
  'https://servicios-59g4.onrender.com/api';

interface NotificacionDB {
  id_notificacion: number;
  id_cliente: number;
  id_empleado?: number | null;
  titulo: string;
  descripcion: string;
  tipo: string;
  leida: boolean | number;
  fecha: string;
  fk_servicio?: number | null;
  nombre_empleado?: string | null;
  foto_empleado?: string | null;
}

interface RespuestaNotificaciones {
  notificaciones?: NotificacionDB[];
  total?: number;
  no_leidas?: number;
  mensaje?: string;
  detalle?: string;
}

const TYPE_ICONS: Record<
  string,
  LucideIcon
> = {
  job_request: Briefcase,
  nuevo_servicio: Briefcase,
  postulacion: UserRoundCheck,
  postulacion_aceptada: CheckCircle2,
  trabajo_iniciado: PlayCircle,
  trabajo_finalizado: CheckCircle2,
  servicio_cancelado_cliente: XCircle,
  servicio_cancelado_empleado: XCircle,
  servicio_cancelado: XCircle,
  message: MessageCircle,
  review: Star,
  booking_update: Calendar,
};

const TYPE_COLORS: Record<
  string,
  string
> = {
  job_request: '#1A56DB',
  nuevo_servicio: '#1A56DB',
  postulacion: '#1A56DB',
  postulacion_aceptada: '#16A34A',
  trabajo_iniciado: '#2563EB',
  trabajo_finalizado: '#16A34A',
  servicio_cancelado_cliente: '#DC2626',
  servicio_cancelado_empleado: '#DC2626',
  servicio_cancelado: '#DC2626',
  message: '#16A34A',
  review: '#D97706',
  booking_update: '#7C3AED',
};

const TYPE_BG: Record<
  string,
  string
> = {
  job_request: '#EFF4FF',
  nuevo_servicio: '#EFF4FF',
  postulacion: '#EFF4FF',
  postulacion_aceptada: '#F0FDF4',
  trabajo_iniciado: '#EFF6FF',
  trabajo_finalizado: '#F0FDF4',
  servicio_cancelado_cliente: '#FEF2F2',
  servicio_cancelado_empleado: '#FEF2F2',
  servicio_cancelado: '#FEF2F2',
  message: '#F0FDF4',
  review: '#FFFBEB',
  booking_update: '#F5F3FF',
};

async function leerRespuestaJson<T>(
  respuesta: Response,
): Promise<T> {
  const texto =
    await respuesta.text();

  if (!texto.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error(
      `El servidor devolvió una respuesta inválida. Código ${respuesta.status}`,
    );
  }
}

function formatRelative(
  fechaTexto: string,
): string {
  const fecha =
    new Date(fechaTexto).getTime();

  if (Number.isNaN(fecha)) {
    return '';
  }

  const diferencia = Math.max(
    0,
    Date.now() - fecha,
  );

  const minutos = Math.floor(
    diferencia / 60000,
  );

  if (minutos < 1) {
    return 'Ahora';
  }

  if (minutos < 60) {
    return `Hace ${minutos} min`;
  }

  const horas = Math.floor(
    minutos / 60,
  );

  if (horas < 24) {
    return `Hace ${horas}h`;
  }

  const dias = Math.floor(
    horas / 24,
  );

  return `Hace ${dias} día${
    dias === 1 ? '' : 's'
  }`;
}

function esDeHoy(
  fechaTexto: string,
): boolean {
  const fecha =
    new Date(fechaTexto);

  if (
    Number.isNaN(fecha.getTime())
  ) {
    return false;
  }

  const ahora = new Date();

  return (
    fecha.getFullYear() ===
      ahora.getFullYear() &&
    fecha.getMonth() ===
      ahora.getMonth() &&
    fecha.getDate() ===
      ahora.getDate()
  );
}

export default function NotificationsScreen() {
  const navigate =
    useNavigate();

  const {
    currentUser,
    role,
  } = useApp();

  const [
    notifications,
    setNotifications,
  ] = useState<NotificacionDB[]>([]);

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    menuAbierto,
    setMenuAbierto,
  ] = useState(false);

  const [
    borrandoTodas,
    setBorrandoTodas,
  ] = useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(null);

  const esTrabajador = role === 'worker';

  const idUsuario = Number(
    esTrabajador
      ? currentUser?.idEmpleado ??
          currentUser?.idEmpleado ??
          currentUser?.id
      : currentUser?.id
  );

  const cargarNotificaciones =
    async (
      cargaInicial = false,
    ) => {
      if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        setNotifications([]);
        setError(
          esTrabajador
            ? 'No se pudo obtener el empleado autenticado.'
            : 'No se pudo obtener el cliente autenticado.',
        );
        setCargando(false);
        return;
      }

      try {
        if (cargaInicial) {
          setCargando(true);
        } else {
          setActualizando(true);
        }

        setError('');

        const respuesta =
          await fetch(
            esTrabajador
              ? `${API_URL}/empleados/${idUsuario}/notificaciones`
              : `${API_URL}/clientes/${idUsuario}/notificaciones`,
            {
              cache: 'no-store',
            },
          );

        const datos =
          await leerRespuestaJson<
            RespuestaNotificaciones |
            NotificacionDB[]
          >(respuesta);

        if (!respuesta.ok) {
          const datosError =
            datos as RespuestaNotificaciones;

          throw new Error(
            datosError.detalle ||
              datosError.mensaje ||
              'No se pudieron cargar las notificaciones.',
          );
        }

        const lista =
          Array.isArray(datos)
            ? datos
            : Array.isArray(
                  datos.notificaciones,
                )
              ? datos.notificaciones
              : [];

        setNotifications(lista);
      } catch (
        errorDesconocido
      ) {
        console.error(
          'Error al cargar notificaciones:',
          errorDesconocido,
        );

        setNotifications([]);

        setError(
          errorDesconocido instanceof
            Error
            ? errorDesconocido.message
            : 'No se pudieron cargar las notificaciones.',
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    };

  useEffect(() => {
    void cargarNotificaciones(
      true,
    );
  }, [idUsuario, esTrabajador]);


  useEffect(() => {
    const cerrarMenu = (
      evento: MouseEvent,
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          evento.target as Node,
        )
      ) {
        setMenuAbierto(false);
      }
    };

    document.addEventListener(
      'mousedown',
      cerrarMenu,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        cerrarMenu,
      );
    };
  }, []);

  const marcarComoLeida =
    async (
      notificacion:
        NotificacionDB,
    ) => {
      const idNotificacion =
        Number(
          notificacion.id_notificacion,
        );

      if (
        !Number.isInteger(
          idNotificacion,
        ) ||
        idNotificacion <= 0
      ) {
        return;
      }

      if (!Boolean(notificacion.leida)) {
        try {
          const respuesta =
            await fetch(
              `${API_URL}/notificaciones/${idNotificacion}/leer`,
              {
                method: 'PUT',
              },
            );

          const datos =
            await leerRespuestaJson<{
              mensaje?: string;
              detalle?: string;
            }>(respuesta);

          if (!respuesta.ok) {
            throw new Error(
              datos.detalle ||
                datos.mensaje ||
                'No se pudo marcar la notificación.',
            );
          }

          setNotifications(
            (anteriores) =>
              anteriores.map(
                (item) =>
                  item.id_notificacion ===
                  idNotificacion
                    ? {
                        ...item,
                        leida: true,
                      }
                    : item,
              ),
          );
        } catch (
          errorDesconocido
        ) {
          console.error(
            'Error al marcar notificación:',
            errorDesconocido,
          );
        }
      }

      const idServicio =
        Number(
          notificacion.fk_servicio,
        );

      if (
        Number.isInteger(idServicio) &&
        idServicio > 0
      ) {
        const tipo = String(
          notificacion.tipo ?? ''
        )
          .trim()
          .toLowerCase();

        if (esTrabajador) {
          if (tipo === 'nuevo_servicio') {
            navigate(
              `/home/solicitud/${idServicio}`
            );
          } else {
            navigate(
              `/home/trabajo/${idServicio}`
            );
          }

          return;
        }

        if (tipo === 'postulacion') {
          navigate(
            `/home/mis-solicitudes/${idServicio}`
          );
        } else {
          navigate(
            `/home/contratacion/${idServicio}`
          );
        }
      }
    };

  const marcarTodasComoLeidas =
    async () => {
      if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        return;
      }

      try {
        const respuesta =
          await fetch(
            esTrabajador
              ? `${API_URL}/empleados/${idUsuario}/notificaciones/leer-todas`
              : `${API_URL}/clientes/${idUsuario}/notificaciones/leer-todas`,
            {
              method: 'PUT',
            },
          );

        const datos =
          await leerRespuestaJson<{
            mensaje?: string;
            detalle?: string;
          }>(respuesta);

        if (!respuesta.ok) {
          throw new Error(
            datos.detalle ||
              datos.mensaje ||
              'No se pudieron marcar las notificaciones.',
          );
        }

        setNotifications(
          (anteriores) =>
            anteriores.map(
              (notificacion) => ({
                ...notificacion,
                leida: true,
              }),
            ),
        );
      } catch (
        errorDesconocido
      ) {
        console.error(
          'Error al marcar todas las notificaciones:',
          errorDesconocido,
        );

        setError(
          errorDesconocido instanceof
            Error
            ? errorDesconocido.message
            : 'No se pudieron marcar las notificaciones.',
        );
      }
    };

  const borrarTodasLasNotificaciones =
    async () => {
      if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        return;
      }

      const confirmar =
        window.confirm(
          '¿Deseas eliminar todas las notificaciones? Esta acción no se puede deshacer.',
        );

      if (!confirmar) {
        return;
      }

      try {
        setBorrandoTodas(true);
        setMenuAbierto(false);
        setError('');

        const respuesta =
          await fetch(
            esTrabajador
              ? `${API_URL}/empleados/${idUsuario}/notificaciones`
              : `${API_URL}/clientes/${idUsuario}/notificaciones`,
            {
              method: 'DELETE',
            },
          );

        const datos =
          await leerRespuestaJson<{
            mensaje?: string;
            detalle?: string;
          }>(respuesta);

        if (!respuesta.ok) {
          throw new Error(
            datos.detalle ||
              datos.mensaje ||
              'No se pudieron eliminar las notificaciones.',
          );
        }

        setNotifications([]);
      } catch (
        errorDesconocido
      ) {
        console.error(
          'Error al eliminar todas las notificaciones:',
          errorDesconocido,
        );

        setError(
          errorDesconocido instanceof
            Error
            ? errorDesconocido.message
            : 'No se pudieron eliminar las notificaciones.',
        );
      } finally {
        setBorrandoTodas(false);
      }
    };

  const today =
    notifications.filter(
      (notification) =>
        esDeHoy(
          notification.fecha,
        ),
    );

  const older =
    notifications.filter(
      (notification) =>
        !esDeHoy(
          notification.fecha,
        ),
    );

  const unread =
    notifications.filter(
      (notification) =>
        !Boolean(
          notification.leida,
        ),
    ).length;

  const renderNotificacion = (
    notification:
      NotificacionDB,
    index: number,
  ) => {
    const tipo =
      String(
        notification.tipo ||
          '',
      ).toLowerCase();

    const Icon =
      TYPE_ICONS[tipo] ??
      Bell;

    const background =
      TYPE_BG[tipo] ??
      '#F3F4F6';

    const color =
      TYPE_COLORS[tipo] ??
      '#6B7280';

    const noLeida =
      !Boolean(
        notification.leida,
      );

    return (
      <motion.button
        key={
          notification.id_notificacion
        }
        type="button"
        initial={{
          opacity: 0,
          x: -10,
        }}
        animate={{
          opacity: 1,
          x: 0,
        }}
        transition={{
          delay:
            index * 0.04,
        }}
        onClick={() =>
          void marcarComoLeida(
            notification,
          )
        }
        className={`flex w-full items-start gap-3 border-b border-border px-5 py-4 text-left transition-colors ${
          noLeida
            ? 'bg-secondary/50'
            : 'bg-card'
        }`}
      >
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl"
          style={{
            backgroundColor:
              background,
          }}
        >
          <Icon
            className="h-5 w-5"
            style={{
              color,
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm text-foreground ${
                noLeida
                  ? 'font-semibold'
                  : 'font-medium'
              }`}
            >
              {notification.titulo ||
                'Notificación'}
            </p>

            <span className="flex-shrink-0 text-[10px] text-muted-foreground">
              {formatRelative(
                notification.fecha,
              )}
            </span>
          </div>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {notification.descripcion}
          </p>

          {notification.nombre_empleado && (
            <p className="mt-2 text-[11px] font-medium text-[#1A56DB]">
              {notification.nombre_empleado}
            </p>
          )}
        </div>

        {noLeida && (
          <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#1A56DB]" />
        )}
      </motion.button>
    );
  };

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-card px-4 pb-4 pt-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Regresar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">
              Notificaciones
            </h1>

            {unread > 0 && (
              <p className="text-xs text-muted-foreground">
                {unread} sin leer
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void cargarNotificaciones(
                false,
              )
            }
            disabled={actualizando}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#1A56DB] hover:bg-muted disabled:opacity-50"
            aria-label="Actualizar notificaciones"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                actualizando
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>

          <div
            ref={menuRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() =>
                setMenuAbierto(
                  (valor) => !valor,
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
              aria-label="Opciones de notificaciones"
              aria-expanded={menuAbierto}
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {menuAbierto && (
              <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    void marcarTodasComoLeidas();
                  }}
                  disabled={unread === 0}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCheck className="h-4 w-4 text-[#1A56DB]" />

                  <span>
                    Marcar todas como leídas
                  </span>
                </button>

                <div className="h-px bg-border" />

                <button
                  type="button"
                  onClick={() =>
                    void borrarTodasLasNotificaciones()
                  }
                  disabled={
                    notifications.length === 0 ||
                    borrandoTodas
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />

                  <span>
                    {borrandoTodas
                      ? 'Borrando...'
                      : 'Borrar todas'}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-7 w-7 animate-spin text-[#1A56DB]" />

            <p className="mt-3 text-sm text-muted-foreground">
              Cargando notificaciones...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-5 py-20">
            <Bell className="h-8 w-8 text-red-400" />

            <p className="mt-3 text-center text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void cargarNotificaciones(
                  true,
                )
              }
              className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-semibold text-white"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : notifications.length ===
          0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>

            <p className="text-sm text-muted-foreground">
              No tienes notificaciones
            </p>
          </div>
        ) : (
          <>
            {today.length > 0 && (
              <>
                <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hoy
                </p>

                {today.map(
                  (
                    notification,
                    index,
                  ) =>
                    renderNotificacion(
                      notification,
                      index,
                    ),
                )}
              </>
            )}

            {older.length > 0 && (
              <>
                <p className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Anteriores
                </p>

                {older.map(
                  (
                    notification,
                    index,
                  ) =>
                    renderNotificacion(
                      notification,
                      today.length +
                        index,
                    ),
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
