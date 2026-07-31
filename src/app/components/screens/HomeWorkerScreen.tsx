import {
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Bell,
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

// Categories loaded at runtime; keep a typed empty list to satisfy TypeScript
const SERVICE_CATEGORIES_RUNTIME: Array<{
  id: string;
  label?: string;
  bgColor?: string;
  color?: string;
}> = [];


export default function HomeWorkerScreen() {
  const navigate = useNavigate();

  const {
    currentUser,
    setCurrentUser,
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
  const [successMessage, setSuccessMessage] = useState('');

  const [totalTrabajos, setTotalTrabajos] =
    useState(0);

  const [
    promedioCalificacion,
    setPromedioCalificacion,
  ] = useState(0);

  const [cargandoResumen, setCargandoResumen] =
    useState(true);

  const idEmpleado = Number(
    currentUser?.idEmpleado ?? currentUser?.id
  );

  const nombreEmpleado =
    currentUser?.name?.trim() || 'Empleado';

  const myBookings: any[] = [];

  const normalizarDisponibilidad = (
    valor: unknown
  ) => {
    const texto =
      String(valor ?? '').trim().toLowerCase();

    return (
      texto === 'disponible' ||
      texto === 'activo' ||
      texto === 'activa' ||
      texto === 'available' ||
      texto === 'true' ||
      texto === '1'
    );
  };

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
    let isMounted = true;

    const cargarDisponibilidad = async () => {
      const estadoActual = String(
        currentUser?.estado ?? ''
      ).trim().toLowerCase();

      if (
        estadoActual === 'disponible' ||
        estadoActual === 'activo'
      ) {
        if (isMounted) {
          setWorkerAvailability(true);
        }
        return;
      }

      if (
        estadoActual === 'no disponible' ||
        estadoActual === 'ocupado' ||
        estadoActual === 'bloqueado' ||
        estadoActual === 'descansando' ||
        estadoActual === 'pausa' ||
        estadoActual === 'break'
      ) {
        if (isMounted) {
          setWorkerAvailability(false);
        }
        return;
      }

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        return;
      }

      try {
        const respuesta = await fetch(
          `http://localhost:3000/api/empleados/${idEmpleado}`
        );

        if (!respuesta.ok) {
          throw new Error(
            'No se pudo obtener la disponibilidad del trabajador'
          );
        }

        const datos = await respuesta.json();

        if (isMounted) {
          setWorkerAvailability(
            normalizarDisponibilidad(
              datos?.estado
            )
          );
        }
      } catch (error) {
        console.error(
          'No se pudo cargar la disponibilidad:',
          error
        );
      }
    };

    cargarDisponibilidad();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.estado, idEmpleado, setWorkerAvailability]);

  useEffect(() => {
    cargarPostulacionesEmpleado();
  }, [idEmpleado]);

  useEffect(() => {
    const cargarResumenEmpleado = async () => {
      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        setTotalTrabajos(0);
        setPromedioCalificacion(0);
        setCargandoResumen(false);
        return;
      }

      try {
        setCargandoResumen(true);

        const respuesta = await fetch(
          `http://localhost:3000/api/empleados/${idEmpleado}/resumen-perfil`,
          {
            cache: 'no-store',
          }
        );

        const texto = await respuesta.text();

        let datos: {
          total_trabajos?: number;
          promedio_calificacion?: number;
          mensaje?: string;
          detalle?: string;
        } = {};

        if (texto.trim()) {
          try {
            datos = JSON.parse(texto);
          } catch {
            throw new Error(
              `El servidor devolvió una respuesta inválida. Código ${respuesta.status}`
            );
          }
        }

        if (!respuesta.ok) {
          throw new Error(
            datos.detalle ||
              datos.mensaje ||
              'No se pudo cargar el resumen del trabajador'
          );
        }

        setTotalTrabajos(
          Number(datos.total_trabajos) || 0
        );

        setPromedioCalificacion(
          Number(datos.promedio_calificacion) || 0
        );
      } catch (error) {
        console.error(
          'Error al cargar resumen del trabajador:',
          error
        );

        setTotalTrabajos(0);
        setPromedioCalificacion(0);
      } finally {
        setCargandoResumen(false);
      }
    };

    void cargarResumenEmpleado();
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

      const respuesta = await actualizarDisponibilidad(
        String(idEmpleado),
        nuevoEstado,
        String(idEmpleado)
      );

      const estadoServidor =
        String(
          respuesta?.nuevoEstado ?? ''
        ).trim().toLowerCase();

      const disponibilidadFinal =
        estadoServidor
          ? normalizarDisponibilidad(
              estadoServidor
            )
          : nuevoEstado;

      setWorkerAvailability(
        disponibilidadFinal
      );

      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          estado: disponibilidadFinal
            ? 'Activo'
            : 'Descansando',
        });
      }
    } catch (error) {
      console.error(
        'Error al actualizar disponibilidad:',
        error
      );

      setWorkerAvailability(
        !nuevoEstado
      );
      setErrorServicios('No se pudo actualizar el estado.');
      window.setTimeout(() => setErrorServicios(''), 4000);
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
      setErrorServicios('No se encontró el ID del empleado. Inicia sesión nuevamente.');
      window.setTimeout(() => setErrorServicios(''), 4000);

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
      setSuccessMessage(resultado.mensaje || 'Te postulaste correctamente');
      window.setTimeout(() => setSuccessMessage(''), 3000);
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

      setErrorServicios(mensaje);
      window.setTimeout(() => setErrorServicios(''), 4000);
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
              src={currentUser?.avatarUrl || ''}
              alt={nombreEmpleado}
              className="w-11 h-11 rounded-full object-cover border-2 border-white/50"
            />

            <div>
              <p className="text-white/70 text-xs">
                Hola,
                {successMessage && (
                  <div className="mb-3 rounded-2xl border border-green-200 bg-green-50 p-3 text-center">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                )}
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
                ? 'Activo'
                : 'Descansando'}
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
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{
                backgroundColor: '#16A34A15',
              }}
            >
              <Briefcase
                className="w-4 h-4"
                style={{
                  color: '#16A34A',
                }}
              />
            </div>

            <p className="text-base font-bold text-foreground">
              {cargandoResumen
                ? '...'
                : totalTrabajos}
            </p>

            <p className="text-[11px] text-muted-foreground">
              Trabajos completados
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{
                backgroundColor: '#D9770615',
              }}
            >
              <Star
                className="w-4 h-4"
                style={{
                  color: '#D97706',
                }}
              />
            </div>

            <p className="text-base font-bold text-foreground">
              {cargandoResumen
                ? '...'
                : `${promedioCalificacion.toFixed(1)}★`}
            </p>

            <p className="text-[11px] text-muted-foreground">
              Calificación
            </p>
          </div>
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
                  SERVICE_CATEGORIES_RUNTIME.find(
                    (item: { id: string }) =>
                      item.id === booking.category
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