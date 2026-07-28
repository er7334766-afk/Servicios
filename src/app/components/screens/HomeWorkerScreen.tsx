//HomeWorkerScreen.tsx
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Bell,
  TrendingUp,
  Briefcase,
  Star,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../context/AppContext';

import {
  MOCK_BOOKINGS,
  MOCK_WORKERS,
  SERVICE_CATEGORIES,
} from '../../data/mockData';

import {
  actualizarDisponibilidad,
} from '../../services/estadoApi';

import {
  obtenerPostulacionesEmpleado,
  obtenerServiciosDisponibles,
  postularEmpleadoServicio,
  type ServicioDisponible,
} from '../../services/serviciosApi';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-[#1A56DB]',
  in_progress:
    'bg-purple-100 text-purple-700',
  completed:
    'bg-green-100 text-green-700',
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

  const {
    currentUser,
    workerAvailability,
    setWorkerAvailability,
    unreadNotifications,
  } = useApp();

  const [servicios, setServicios] =
    useState<ServicioDisponible[]>([]);

  const [
    serviciosPostulados,
    setServiciosPostulados,
  ] = useState<number[]>([]);

  const [postulandoId, setPostulandoId] =
    useState<number | null>(null);

  const [cargandoServicios, setCargandoServicios] =
    useState(true);

  const [actualizandoServicios, setActualizandoServicios] =
    useState(false);

  const [errorServicios, setErrorServicios] =
    useState('');
  const idEmpleado = Number(
    currentUser?.idEmpleado ?? currentUser?.id
  );

  const nombreEmpleado =
    currentUser?.name?.trim() || 'Empleado';

  /*
   * Estas secciones siguen usando datos mock.
   * Solo "Nuevas solicitudes" se conecta
   * con MySQL.
   */
  const workerProfile = MOCK_WORKERS[0];

  const myBookings = useMemo(
    () =>
      MOCK_BOOKINGS.filter(
        (booking) =>
          booking.workerId === 'w1' &&
          [
            'accepted',
            'in_progress',
            'pending',
          ].includes(booking.status)
      ).slice(0, 3),
    []
  );

  const weekEarnings = useMemo(
    () =>
      MOCK_BOOKINGS.filter(
        (booking) =>
          booking.workerId === 'w1' &&
          booking.status === 'completed'
      ).reduce(
        (total, booking) =>
          total + booking.price,
        0
      ),
    []
  );

  const cargarServicios = async (
    mostrarCargaInicial = false
  ) => {
    try {
      if (mostrarCargaInicial) {
        setCargandoServicios(true);
      } else {
        setActualizandoServicios(true);
      }

      setErrorServicios('');

      const lista =
        await obtenerServiciosDisponibles();

      setServicios(lista.slice(0, 3));
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las solicitudes';

      console.error(
        'Error al cargar servicios:',
        error
      );

      setErrorServicios(mensaje);
    } finally {
      setCargandoServicios(false);
      setActualizandoServicios(false);
    }
  };

  const cargarPostulacionesEmpleado =
    async () => {
      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return;
      }

      try {
        const ids =
          await obtenerPostulacionesEmpleado(
            idEmpleado
          );

        setServiciosPostulados(ids);
      } catch (error) {
        console.error(
          'No se pudieron cargar las postulaciones:',
          error
        );
      }
    };

  useEffect(() => {
    cargarServicios(true);
  }, []);

  useEffect(() => {
    cargarPostulacionesEmpleado();
  }, [idEmpleado]);

  /*
   * Actualiza las solicitudes cada 10 segundos.
   */
  useEffect(() => {
    const intervalo = window.setInterval(
      () => {
        cargarServicios(false);
      },
      10000
    );

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  const handleToggle = async () => {
    const nuevoEstado =
      !workerAvailability;

    setWorkerAvailability(nuevoEstado);

    try {
      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        throw new Error(
          'No se encontró el ID del empleado'
        );
      }

      await actualizarDisponibilidad(
        String(idEmpleado),
        nuevoEstado
      );
    } catch (error) {
      console.error(
        'Error al actualizar disponibilidad:',
        error
      );

      setWorkerAvailability(
        !nuevoEstado
      );

      alert(
        'No se pudo actualizar el estado.'
      );
    }
  };

  const handlePostularse = async (
    idServicio: number
  ) => {
    if (postulandoId !== null) {
      return;
    }

    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      alert(
        'No se encontró el ID del empleado. Inicia sesión nuevamente.'
      );

      return;
    }

    try {
      setPostulandoId(idServicio);

      const resultado =
        await postularEmpleadoServicio(
          idServicio,
          idEmpleado
        );

      setServiciosPostulados(
        (actuales) => {
          if (
            actuales.includes(idServicio)
          ) {
            return actuales;
          }

          return [
            ...actuales,
            idServicio,
          ];
        }
      );

      alert(
        resultado.mensaje ||
          'Te postulaste correctamente'
      );
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo registrar la postulación';

      console.error(
        'Error al postularse:',
        error
      );

      const yaPostulado =
        mensaje
          .toLowerCase()
          .includes('ya te postulaste') ||
        mensaje
          .toLowerCase()
          .includes('ya se postuló');

      if (yaPostulado) {
        setServiciosPostulados(
          (actuales) => {
            if (
              actuales.includes(idServicio)
            ) {
              return actuales;
            }

            return [
              ...actuales,
              idServicio,
            ];
          }
        );
      }

      alert(mensaje);
    } finally {
      setPostulandoId(null);
    }
  };

  const obtenerTituloServicio = (
    servicio: ServicioDisponible
  ) => {
    const titulo = String(
      servicio.titulo ?? ''
    ).trim();

    if (titulo) {
      return titulo;
    }

    const descripcion = String(
      servicio.descripcion ?? ''
    ).trim();

    if (descripcion.length <= 45) {
      return (
        descripcion ||
        'Solicitud de servicio'
      );
    }

    return `${descripcion.slice(
      0,
      45
    )}...`;
  };

  const obtenerNombreCliente = (
    servicio: ServicioDisponible
  ) => {
    return (
      servicio.nombre_cliente ||
      `Cliente #${servicio.fk_cliente}`
    );
  };

  const obtenerCategoria = (
    servicio: ServicioDisponible
  ) => {
    return (
      servicio.nombre_categoria ||
      'Servicio'
    );
  };

  return (
    <div className="pb-4">
      {/* Encabezado */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ImageWithFallback
              src={workerProfile.avatarUrl}
              alt={nombreEmpleado}
              className="w-11 h-11 rounded-full object-cover border-2 border-white/50"
            />

            <div>
              <p className="text-white/70 text-xs">
                Hola,
              </p>

              <p className="text-white font-bold">
                {nombreEmpleado
                  .split(' ')[0]}
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() =>
              navigate(
                '/home/notifications'
              )
            }
            className="relative w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <Bell className="w-5 h-5 text-white" />

            {unreadNotifications >
              0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-[#1A56DB]" />
            )}
          </motion.button>
        </div>

        {/* Disponibilidad */}
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between border border-white/20">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                workerAvailability
                  ? 'bg-green-400'
                  : 'bg-slate-400'
              }`}
            />

            <span className="text-white text-sm font-medium">
              {workerAvailability
                ? 'Disponible para trabajos'
                : 'No disponible'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleToggle}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              workerAvailability
                ? 'bg-green-400'
                : 'bg-white/30'
            }`}
          >
            <motion.div
              animate={{
                x: workerAvailability
                  ? 24
                  : 2,
              }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
            />
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="px-5 mt-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: TrendingUp,
              label: 'Esta semana',
              value: `$${weekEarnings.toLocaleString()}`,
              color: '#1A56DB',
            },
            {
              icon: Briefcase,
              label: 'Trabajos',
              value: `${workerProfile.jobCount}`,
              color: '#16A34A',
            },
            {
              icon: Star,
              label: 'Calificación',
              value: `${workerProfile.rating}★`,
              color: '#D97706',
            },
          ].map(
            ({
              icon: Icon,
              label,
              value,
              color,
            }) => (
              <div
                key={label}
                className="bg-card rounded-2xl border border-border p-3 text-center"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                  style={{
                    backgroundColor:
                      color + '15',
                  }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color }}
                  />
                </div>

                <p className="text-xs font-bold text-foreground">
                  {value}
                </p>

                <p className="text-[10px] text-muted-foreground">
                  {label}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Próximos trabajos */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">
            Próximos trabajos
          </h2>

          <button
            type="button"
            className="text-xs text-[#1A56DB] flex items-center gap-0.5"
            onClick={() =>
              navigate('/home/agenda')
            }
          >
            Ver agenda

            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {myBookings.length === 0 ? (
          <div className="bg-muted rounded-2xl p-5 text-center">
            <p className="text-muted-foreground text-sm">
              No tienes trabajos próximos
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myBookings.map(
              (booking) => {
                const categoria =
                  SERVICE_CATEGORIES.find(
                    (item) =>
                      item.id ===
                      booking.category
                  );

                return (
                  <motion.div
                    key={booking.id}
                    whileTap={{
                      scale: 0.98,
                    }}
                    className="bg-card rounded-2xl border border-border p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {
                            booking.clientName
                          }
                        </p>

                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor:
                              categoria?.bgColor,
                            color:
                              categoria?.color,
                          }}
                        >
                          {
                            categoria?.label
                          }
                        </span>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          STATUS_COLORS[
                            booking.status
                          ]
                        }`}
                      >
                        {
                          STATUS_LABELS[
                            booking.status
                          ]
                        }
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mb-2">
                      {
                        booking.description
                      }
                    </p>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />

                        <span className="text-xs text-muted-foreground">
                          {booking.date}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />

                        <span className="text-xs text-muted-foreground">
                          {
                            booking.timeSlot
                          }
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Nuevas solicitudes */}
      <div className="px-5 mt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">
            Nuevas solicitudes
          </h2>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                cargarServicios(false)
              }
              disabled={
                actualizandoServicios
              }
              className="text-[#1A56DB] disabled:opacity-50"
              title="Actualizar solicitudes"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  actualizandoServicios
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>

            <button
              type="button"
              className="text-xs text-[#1A56DB] flex items-center gap-0.5"
              onClick={() =>
                navigate('/home/search')
              }
            >
              Ver todas

              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {cargandoServicios ? (
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center">
            <RefreshCw className="w-6 h-6 text-[#1A56DB] animate-spin mb-2" />

            <p className="text-xs text-muted-foreground">
              Cargando solicitudes...
            </p>
          </div>
        ) : errorServicios ? (
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <p className="text-xs text-red-600">
              {errorServicios}
            </p>

            <button
              type="button"
              onClick={() =>
                cargarServicios(true)
              }
              className="mt-3 px-4 py-2 rounded-full bg-[#1A56DB] text-white text-xs font-semibold"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : servicios.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <p className="text-sm font-semibold text-foreground">
              No hay solicitudes disponibles
            </p>

            <p className="text-xs text-muted-foreground mt-1">
              Cuando un cliente publique un
              trabajo aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {servicios.map(
              (servicio) => {
                const idServicio =
                  Number(
                    servicio.id_servicio
                  );

                const postulado =
                  serviciosPostulados.includes(
                    idServicio
                  );

                const postulando =
                  postulandoId ===
                  idServicio;

                return (
                  <motion.div
  key={idServicio}
  role="button"
  tabIndex={0}
  whileTap={{
    scale: 0.98,
  }}
  onClick={() => {
    console.log(
      'Abriendo servicio:',
      idServicio
    );

    navigate(
      `/home/solicitud/${idServicio}`
    );
  }}
  onKeyDown={(evento) => {
    if (
      evento.key === 'Enter' ||
      evento.key === ' '
    ) {
      evento.preventDefault();

      navigate(
        `/home/solicitud/${idServicio}`
      );
    }
  }}
  className="bg-card rounded-2xl border border-border p-4 cursor-pointer"
>
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageWithFallback
                          src={
                            servicio.foto_cliente ??
                            ''
                          }
                          alt={obtenerNombreCliente(
                            servicio
                          )}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {obtenerTituloServicio(
                              servicio
                            )}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {obtenerNombreCliente(
                              servicio
                            )}
                          </p>

                          <p className="text-[10px] text-[#1A56DB] mt-0.5">
                            {obtenerCategoria(
                              servicio
                            )}
                          </p>
                        </div>
                      </div>

                      <span className="text-sm font-bold text-[#1A56DB] flex-shrink-0">
                        $
                        {Number(
                          servicio.presupuesto
                        ).toLocaleString(
                          'es-HN'
                        )}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2 mb-3 line-clamp-2">
                      {servicio.descripcion}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />

                        <span className="text-xs text-muted-foreground truncate">
                          {servicio.direccion}
                        </span>
                      </div>

                      <motion.button
                        type="button"
                        whileTap={
                          postulado
                            ? undefined
                            : {
                                scale: 0.95,
                              }
                        }
                        onClick={(
                          evento
                        ) => {
                          evento.stopPropagation();

                          handlePostularse(
                            idServicio
                          );
                        }}
                        disabled={
                          postulado ||
                          postulando
                        }
                        className={`text-xs px-4 py-1.5 rounded-full font-semibold flex-shrink-0 ${
                          postulado
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                            : postulando
                              ? 'bg-blue-300 text-white cursor-wait'
                              : 'bg-[#1A56DB] text-white'
                        }`}
                      >
                        {postulado
                          ? 'Postulado'
                          : postulando
                            ? 'Enviando...'
                            : 'Me interesa'}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}