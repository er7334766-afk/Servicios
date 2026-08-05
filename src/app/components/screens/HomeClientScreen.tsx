import {
  useEffect,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Bell,
  Search,
  MapPin,
  Star,
  Briefcase,
  ChevronRight,
  Plus,
  RefreshCw,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ServiceCategoryGrid } from '../shared/ServiceCategoryGrid';
import { useApp } from '../../context/AppContext';

import { obtenerCategoriasDB } from '../../services/solicitudesApi';

import type {
  ServiceCategory,
  ServiceCategoryItem,
} from '../../types';

import {
  obtenerSolicitudesCliente,
  type SolicitudCliente,
} from '../../services/SolicitudesClienteApi';

function formatearPresupuesto(
  presupuesto: number | string
): string {
  const valor = Number(presupuesto);

  if (Number.isNaN(valor)) {
    return String(presupuesto);
  }

  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(valor);
}

function obtenerTitulo(
  solicitud: SolicitudCliente
): string {
  const titulo = String(
    solicitud.titulo ?? ''
  ).trim();

  if (titulo) {
    return titulo;
  }

  const categoria = String(
    solicitud.nombre_categoria ?? ''
  ).trim();

  if (categoria) {
    return categoria;
  }

  return 'Solicitud de servicio';
}

function convertirEstado(
  estado?: string | null
): string {
  const valor = String(estado ?? '')
    .trim()
    .toLowerCase();

  switch (valor) {
    case 'pendiente':
      return 'Pendiente';

    case 'asignado':
      return 'Asignado';

    case 'en_proceso':
    case 'en proceso':
      return 'En proceso';

    case 'completado':
      return 'Completado';

    case 'cancelado':
      return 'Cancelado';

    default:
      return estado || 'Sin estado';
  }
}

function colorEstado(
  estado?: string | null
): string {
  const valor = String(estado ?? '')
    .trim()
    .toLowerCase();

  switch (valor) {
    case 'asignado':
      return 'bg-blue-100 text-blue-700';

    case 'en_proceso':
    case 'en proceso':
      return 'bg-purple-100 text-purple-700';

    case 'completado':
      return 'bg-green-100 text-green-700';

    case 'cancelado':
      return 'bg-red-100 text-red-700';

    default:
      return 'bg-amber-100 text-amber-700';
  }
}

interface EmpleadoDisponible {
  id_empleado: number;
  nombre: string;
  correo: string;
  telefono: string;
  dni?: string | null;
  titulo: string | null;
  antecedentes?: string | null;
  direccion: string | null;
  estado: string;
  numero_trabajos: number;
  rating: number;
  cantidad_resenas?: number;
  sobre_mi: string | null;
  foto_url?: string | null;
  fecha_creacion?: string | null;
  ultima_actividad?: string | null;
}

interface EmpleadoDB {
  id_empleado: number | string;
  nombre_E: string;
  correo?: string;
  celular?: string;
  titulo?: string | null;
  direccion?: string | null;
  estado?: string | null;
  N_trabajos?: number | null;
  categoria?: string;
  foto?: string | null;
  foto_url?: string | null;
  calificacion?: number | null;
  cantidad_resenas?: number | null;
}

interface ResumenEmpleado {
  total_trabajos?: number;
  total_resenas?: number;
  promedio_calificacion?: number;
}

export default function HomeClientScreen() {
  const navigate = useNavigate();

  const {
    currentUser,
  } = useApp();

  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<
    EmpleadoDisponible[]
    >([]);
  const [empleadosDestacados, setEmpleadosDestacados] = useState<
    EmpleadoDisponible[]
    >([]);

  const [cargandoDestacados, setCargandoDestacados] = useState(true);

   const [cargandoEmpleados, setCargandoEmpleados] = useState(true);

  const [
    misSolicitudes,
    setMisSolicitudes,
  ] = useState<SolicitudCliente[]>([]);

  const [
    cargandoSolicitudes,
    setCargandoSolicitudes,
  ] = useState(true);

  const [
    actualizando,
    setActualizando,
  ] = useState(false);

  const [
    errorSolicitudes,
    setErrorSolicitudes,
  ] = useState('');

  const idCliente = Number(currentUser?.id);

  const [
    notificacionesSinLeer,
    setNotificacionesSinLeer,
  ] = useState(0);

  const [categories, setCategories] = useState<ServiceCategoryItem[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const cats = await obtenerCategoriasDB();

      
        const mapped: ServiceCategoryItem[] = (cats || []).map((c: any) => {
          const idLabel = String(c.id ?? c.nombre ?? c.label ?? '').toLowerCase();

          let fallbackIcon: string | undefined;

          if (/plom/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/plomeria.ico';
          } else if (/carp/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/carpinteria.ico';
          } else if (/electrodomest/.test(idLabel) || /electro\b/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/electrodomestico.ico';
          } else if (/\belectricidad\b/.test(idLabel) || /\belectr/i.test(idLabel) || /electric/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/electricidad.ico';
          } else if (/constr|constru/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/construccion.ico';
          } else if (/jard/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/jardineria.ico';
          } else if (/limp/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/limpieza.ico';
          } else if (/pint/.test(idLabel)) {
            fallbackIcon = 'https://serviapp.blob.core.windows.net/img/pintura.ico';
          }

          const nombreNormalizado = String(c.nombre ?? c.label ?? '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

          const estilosPorCategoria: Record<
            string,
            { color: string; bgColor: string }
          > = {
            plomeria: {
              color: '#2563EB',
              bgColor: '#DBEAFE',
            },
            electricidad: {
              color: '#F59E0B',
              bgColor: '#FEF3C7',
            },
            limpieza: {
              color: '#10B981',
              bgColor: '#D1FAE5',
            },
            construccion: {
              color: '#64748B',
              bgColor: '#E2E8F0',
            },
            pintura: {
              color: '#EC4899',
              bgColor: '#FCE7F3',
            },
            carpinteria: {
              color: '#EA580C',
              bgColor: '#FED7AA',
            },
            jardineria: {
              color: '#22C55E',
              bgColor: '#DCFCE7',
            },
            electrodomesticos: {
              color: '#7C3AED',
              bgColor: '#E9D5FF',
            },
          };

        const estilo =
          estilosPorCategoria[nombreNormalizado] ?? {
            color: '#1A56DB',
            bgColor: '#EFF4FF',
          };

          return {
            id: String(c.id_categoria ?? c.id) as any,
            label: c.nombre ?? c.label ?? 'Categoría',
            icon: 'Wrench',
            color: estilo.color,
            bgColor: estilo.bgColor,
            iconUrl: c.iconUrl ?? fallbackIcon,
          };

         
        });

        console.log('DEBUG: categorías mapeadas =>', mapped);

        if (mapped.length > 0) setCategories(mapped);
      } catch (err) {
        console.error('No se pudieron cargar categorías:', err);
      }
    })();

    (async () => {
      try {
        setCargandoDestacados(true);

        const respuesta = await fetch('https://servicios-59g4.onrender.com/api/empleados', {
          cache: 'no-store',
        });

        const texto = await respuesta.text();
        let datos: unknown = [];

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
          const errorApi = datos as {
            mensaje?: string;
            detalle?: string;
          };

          throw new Error(
            errorApi.detalle ||
              errorApi.mensaje ||
              'No se pudieron cargar empleados'
          );
        }

        const empleadosBase: EmpleadoDB[] = Array.isArray(datos) ? (datos as EmpleadoDB[]) : [];

        const empleadosConResumen = await Promise.all(
          empleadosBase.map(async (empleado) => {
           const idEmpleado = Number(
              empleado.id_empleado
            );

            if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
              return empleado;
            }

            try {
              const respuestaResumen = await fetch(
                `https://servicios-59g4.onrender.com/api/empleados/${idEmpleado}/resumen-perfil`,
                { cache: 'no-store' }
              );

              const textoResumen = await respuestaResumen.text();
              let resumen: ResumenEmpleado = {};

              if (textoResumen.trim()) {
                resumen = JSON.parse(textoResumen) as ResumenEmpleado;
              }

              if (!respuestaResumen.ok) {
                return empleado;
              }

              return {
                ...empleado,
                N_trabajos: Number(resumen.total_trabajos) || 0,
                calificacion: Number(resumen.promedio_calificacion) || 0,
                cantidad_resenas: Number(resumen.total_resenas) || 0,
              };
            } catch (error) {
              console.error(
                `No se pudo cargar el resumen del empleado ${idEmpleado}:`,
                error
              );

              return empleado;
            }
          })
        );

        const mapped: EmpleadoDisponible[] = empleadosConResumen
          .map((e: any) => ({
            id_empleado: Number(e.id_empleado ?? e.id ?? e._id),
            nombre: String(e.nombre ?? e.nombre_E ?? 'Trabajador'),
            correo: String(e.correo ?? ''),
            telefono: String(e.telefono ?? e.celular ?? ''),
            dni: e.dni ?? null,
            titulo: e.titulo ?? null,
            antecedentes: e.antecedentes ?? null,
            direccion: e.direccion ?? null,
            estado: String(e.estado ?? 'Disponible'),
            numero_trabajos: Number(e.N_trabajos ?? e.numero_trabajos ?? 0),
            rating: Number(e.calificacion ?? e.promedio_calificacion ?? 0),
            cantidad_resenas: Number(e.cantidad_resenas ?? 0),
            sobre_mi: e.sobre_mi ?? e.descripcion ?? null,
            foto_url: e.foto_url ?? e.foto ?? e.avatarUrl ?? null,
            fecha_creacion: e.fecha_creacion ?? e.fechaCreacion ?? null,
            ultima_actividad: e.ultima_actividad ?? null,
          }))
          .sort((a, b) => {
            const ratingDiff = Number(b.rating ?? 0) - Number(a.rating ?? 0);
            if (ratingDiff !== 0) return ratingDiff;
            return Number(b.numero_trabajos ?? 0) - Number(a.numero_trabajos ?? 0);
          });

        setEmpleadosDestacados(mapped.slice(0, 5));
      } catch (err) {
        console.error('No se pudieron cargar empleados destacados:', err);
        setEmpleadosDestacados([]);
      } finally {
        setCargandoDestacados(false);
      }
    })();
  }, []);

  const cargarSolicitudes = async (
    cargaInicial = false
  ) => {
    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0
    ) {
      setMisSolicitudes([]);
      setCargandoSolicitudes(false);
      return;
    }

    try {
      if (cargaInicial) {
        setCargandoSolicitudes(true);
      } else {
        setActualizando(true);
      }

      setErrorSolicitudes('');

      const lista =
        await obtenerSolicitudesCliente(
          idCliente
        );

      setMisSolicitudes(lista);
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar tus solicitudes';

      setErrorSolicitudes(mensaje);
    } finally {
      setCargandoSolicitudes(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    cargarSolicitudes(true);
  }, [idCliente]);

  const handleCategorySelect = (
    categoria:
      | ServiceCategory
      | ServiceCategoryItem
      | string
  ) => {
    const valorRecibido =
      typeof categoria === 'object' &&
      categoria !== null
        ? String(
            (categoria as ServiceCategoryItem).id ??
              (categoria as ServiceCategoryItem).label ??
              ''
          )
        : String(categoria ?? '');

    const categoriaEncontrada =
      categories.find((item) => {
        return (
          String(item.id) === valorRecibido ||
          String(item.label)
            .trim()
            .toLowerCase() ===
            valorRecibido
              .trim()
              .toLowerCase()
        );
      });

    const parametro =
      categoriaEncontrada?.id ??
      valorRecibido;

    navigate(
      `/home/search?cat=${encodeURIComponent(
        String(parametro)
      )}`
    );
  };

  // Empleados disponibles ordenados por experiencia real.
  // Se consultan todos los empleados porque el endpoint
  // /api/empleados/disponibles puede excluir perfiles cuyo estado
  // esté guardado como "Activo" en lugar de "Disponible".
  useEffect(() => {
    const normalizarEstadoEmpleado = (
      estado?: string | null
    ): string =>
      String(estado ?? '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const esEstadoDisponible = (
      estado?: string | null
    ): boolean => {
      const valor =
        normalizarEstadoEmpleado(estado);

      return [
        'disponible',
        'activo',
        'activa',
        'active',
        'available',
        'en linea',
        'online',
      ].includes(valor);
    };

    const cargarEmpleadosDisponibles =
      async () => {
        try {
          setCargandoEmpleados(true);

          const respuesta = await fetch(
            'https://servicios-59g4.onrender.com/api/empleados',
            {
              cache: 'no-store',
            }
          );

          const texto =
            await respuesta.text();

          let datos: unknown = [];

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
            const errorApi = datos as {
              mensaje?: string;
              detalle?: string;
            };

            throw new Error(
              errorApi.detalle ||
                errorApi.mensaje ||
                'No se pudieron cargar los empleados'
            );
          }

          const empleadosBase: any[] =
            Array.isArray(datos)
              ? datos
              : [];

          const empleadosActivos =
            empleadosBase.filter(
              (empleado: any) =>
                esEstadoDisponible(
                  empleado.estado
                )
            );

          const empleadosConResumen =
            await Promise.all(
              empleadosActivos.map(
                async (empleado: any) => {
                  const idEmpleado = Number(
                    empleado.id_empleado ??
                      empleado.id ??
                      0
                  );

                  if (
                    !Number.isInteger(
                      idEmpleado
                    ) ||
                    idEmpleado <= 0
                  ) {
                    return empleado;
                  }

                  try {
                    const respuestaResumen =
                      await fetch(
                        `https://servicios-59g4.onrender.com/api/empleados/${idEmpleado}/resumen-perfil`,
                        {
                          cache: 'no-store',
                        }
                      );

                    const textoResumen =
                      await respuestaResumen.text();

                    if (
                      !respuestaResumen.ok ||
                      !textoResumen.trim()
                    ) {
                      return empleado;
                    }

                    const resumen =
                      JSON.parse(
                        textoResumen
                      ) as ResumenEmpleado;

                    return {
                      ...empleado,
                      N_trabajos:
                        Number(
                          resumen.total_trabajos
                        ) || 0,
                      numero_trabajos:
                        Number(
                          resumen.total_trabajos
                        ) || 0,
                      calificacion:
                        Number(
                          resumen.promedio_calificacion
                        ) || 0,
                      rating:
                        Number(
                          resumen.promedio_calificacion
                        ) || 0,
                      cantidad_resenas:
                        Number(
                          resumen.total_resenas
                        ) || 0,
                    };
                  } catch (error) {
                    console.error(
                      `No se pudo cargar el resumen del empleado ${idEmpleado}:`,
                      error
                    );

                    return empleado;
                  }
                }
              )
            );

          const empleadosNormalizados:
            EmpleadoDisponible[] =
            empleadosConResumen
              .map(
                (
                  empleado: any
                ): EmpleadoDisponible => ({
                  id_empleado: Number(
                    empleado.id_empleado ??
                      empleado.id ??
                      0
                  ),
                  nombre: String(
                    empleado.nombre ??
                      empleado.nombre_E ??
                      'Trabajador'
                  ),
                  correo: String(
                    empleado.correo ?? ''
                  ),
                  telefono: String(
                    empleado.telefono ??
                      empleado.celular ??
                      ''
                  ),
                  dni:
                    empleado.dni != null
                      ? String(empleado.dni)
                      : null,
                  titulo:
                    empleado.titulo != null
                      ? String(
                          empleado.titulo
                        )
                      : null,
                  antecedentes:
                    empleado.antecedentes != null
                      ? String(
                          empleado.antecedentes
                        )
                      : null,
                  direccion:
                    empleado.direccion != null
                      ? String(
                          empleado.direccion
                        )
                      : null,
                  estado: 'Disponible',
                  numero_trabajos: Number(
                    empleado.numero_trabajos ??
                      empleado.N_trabajos ??
                      empleado.numeroTrabajos ??
                      0
                  ),
                  rating: Number(
                    empleado.rating ??
                      empleado.calificacion ??
                      empleado.promedio_calificacion ??
                      0
                  ),
                  cantidad_resenas: Number(
                    empleado.cantidad_resenas ??
                      empleado.total_resenas ??
                      0
                  ),
                  sobre_mi:
                    empleado.sobre_mi != null
                      ? String(
                          empleado.sobre_mi
                        )
                      : empleado.descripcion !=
                          null
                        ? String(
                            empleado.descripcion
                          )
                        : null,
                  foto_url:
                    empleado.foto_url != null
                      ? String(
                          empleado.foto_url
                        )
                      : empleado.foto != null
                        ? String(
                            empleado.foto
                          )
                        : null,
                  fecha_creacion:
                    empleado.fecha_creacion ??
                    empleado.fechaCreacion ??
                    null,
                  ultima_actividad:
                    empleado.ultima_actividad ??
                    null,
                })
              )
              .filter(
                (empleado) =>
                  Number.isInteger(
                    empleado.id_empleado
                  ) &&
                  empleado.id_empleado > 0
              )
              .sort((a, b) => {
                const trabajosA = Number(
                  a.numero_trabajos ?? 0
                );
                const trabajosB = Number(
                  b.numero_trabajos ?? 0
                );

                if (trabajosB !== trabajosA) {
                  return trabajosB - trabajosA;
                }

                const ratingA = Number(
                  a.rating ?? 0
                );
                const ratingB = Number(
                  b.rating ?? 0
                );

                if (ratingB !== ratingA) {
                  return ratingB - ratingA;
                }

                const resenasA = Number(
                  a.cantidad_resenas ?? 0
                );
                const resenasB = Number(
                  b.cantidad_resenas ?? 0
                );

                if (resenasB !== resenasA) {
                  return resenasB - resenasA;
                }

                return a.nombre.localeCompare(
                  b.nombre,
                  'es'
                );
              });

          console.log(
            'Disponibles ordenados:',
            empleadosNormalizados.map(
              (empleado) => ({
                id: empleado.id_empleado,
                nombre: empleado.nombre,
                trabajos:
                  empleado.numero_trabajos,
                rating: empleado.rating,
              })
            )
          );

          setEmpleadosDisponibles(
            empleadosNormalizados
          );
        } catch (error) {
          console.error(
            'Error al cargar empleados disponibles:',
            error
          );

          setEmpleadosDisponibles([]);
        } finally {
          setCargandoEmpleados(false);
        }
      };

    void cargarEmpleadosDisponibles();
  }, []);

  const cargarCantidadNotificaciones = async () => {
    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0
    ) {
      setNotificacionesSinLeer(0);
      return;
    }

    try {
      const respuesta = await fetch(
        `https://servicios-59g4.onrender.com/api/clientes/${idCliente}/notificaciones`,
        {
          cache: 'no-store',
        }
      );

      const texto = await respuesta.text();

      if (!texto.trim()) {
        setNotificacionesSinLeer(0);
        return;
      }

      let datos: any;

      try {
        datos = JSON.parse(texto);
      } catch {
        throw new Error(
          `El servidor devolvió una respuesta inválida. Código ${respuesta.status}`
        );
      }

      if (!respuesta.ok) {
        throw new Error(
          datos?.detalle ||
            datos?.mensaje ||
            'No se pudieron cargar las notificaciones'
        );
      }

      const cantidad = Number(
        datos?.no_leidas ??
          (
            Array.isArray(datos?.notificaciones)
              ? datos.notificaciones.filter(
                  (notificacion: any) =>
                    !Boolean(notificacion.leida)
                ).length
              : 0
          )
      );

      setNotificacionesSinLeer(
        Number.isFinite(cantidad)
          ? cantidad
          : 0
      );
    } catch (error) {
      console.error(
        'Error al cargar cantidad de notificaciones:',
        error
      );

      setNotificacionesSinLeer(0);
    }
  };

  useEffect(() => {
    void cargarCantidadNotificaciones();

    const intervalo = window.setInterval(() => {
      void cargarCantidadNotificaciones();
    }, 15000);

    const actualizarAlVolver = () => {
      void cargarCantidadNotificaciones();
    };

    window.addEventListener(
      'focus',
      actualizarAlVolver
    );

    window.addEventListener(
      'pageshow',
      actualizarAlVolver
    );

    return () => {
      window.clearInterval(intervalo);

      window.removeEventListener(
        'focus',
        actualizarAlVolver
      );

      window.removeEventListener(
        'pageshow',
        actualizarAlVolver
      );
    };
  }, [idCliente]);

  return (
    <div className="pb-4">
      {/* Encabezado */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">
              Hola bienvenido(a),
            </p>

            <p className="text-white font-bold text-lg">
              {currentUser?.name?.split(
                ' '
              )[0] ?? 'Usuario'}{' '}
              👋
            </p>
          </div>

          <div className="flex items-center gap-2">
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

              {notificacionesSinLeer > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-[#1A56DB] flex items-center justify-center">
                  {notificacionesSinLeer > 99
                    ? '99+'
                    : notificacionesSinLeer}
                </span>
              )}
            </motion.button>

            <ImageWithFallback
              src={
                currentUser?.avatarUrl ??
                ''
              }
              alt={
                currentUser?.name ??
                'Cliente'
              }
              className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
            />
          </div>
        </div>

        <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/home/search')}
        className="w-full bg-white rounded-xl flex items-center gap-3 px-4 py-3 shadow-lg"
      >
        <Search className="w-5 h-5 text-muted-foreground" />

        <span className="text-muted-foreground text-sm">
          ¿Qué servicio necesitas?
        </span>
      </motion.button>
      </div>

      {/* Categorías */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">
            Categorías
          </h2>

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

        <ServiceCategoryGrid
          onSelect={handleCategorySelect}
          categories={categories.length ? categories : undefined}
        />
      </div>

      {/* Trabajadores destacados */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-5">
          <h2 className="text-base font-bold text-foreground">
            Trabajadores destacados
          </h2>

          <button
            type="button"
            className="text-xs text-[#1A56DB] flex items-center gap-0.5"
            onClick={() =>
              navigate('/home/search')
            }
          >
            Ver todos

            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>        

        {cargandoDestacados ? (
        <div className="px-5">
          <p className="text-sm text-muted-foreground">
            Cargando trabajadores destacados...
          </p>
        </div>
      ) : empleadosDestacados.length === 0 ? (
        <div className="px-5">
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No hay trabajadores destacados todavía.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-6">
          <p className="text-sm font-semibold text-foreground mb-3">
            {empleadosDestacados.length} trabajadores destacados
          </p>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {empleadosDestacados.map((worker) => (
              <div
                key={worker.id_empleado}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/home/worker/${worker.id_empleado}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    navigate(`/home/worker/${worker.id_empleado}`);
                  }
                }}
                className="w-[220px] flex-shrink-0 cursor-pointer"
              >
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-[#1A56DB]/40">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <ImageWithFallback
                        src={worker.foto_url ?? ''}
                        alt={worker.nombre}
                        className="w-14 h-14 rounded-xl object-cover object-center flex-shrink-0"
                      />

                      {String(worker.estado ?? '').trim().toLowerCase() === 'disponible' && (
                        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {worker.nombre}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-semibold text-foreground">
                            {worker.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({worker.cantidad_resenas ?? 0})
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4 text-[#1A56DB]" />
                          <span className="text-xs text-muted-foreground">
                            {worker.numero_trabajos ?? 0}{' '}
                            {worker.numero_trabajos === 1 ? 'trabajo' : 'trabajos'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        
      </div>
        
      {/* Mis solicitudes reales */}
      <div className="mt-6 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">
            Mis solicitudes
          </h2>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                cargarSolicitudes(false)
              }
              disabled={actualizando}
              className="text-[#1A56DB] disabled:opacity-50"
              title="Actualizar solicitudes"
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  actualizando
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                navigate('/home/search')
              }
              className="w-7 h-7 bg-[#1A56DB] rounded-full flex items-center justify-center"
            >
              <Plus className="w-4 h-4 text-white" />
            </motion.button>
          </div>
        </div>

        {cargandoSolicitudes ? (
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col items-center">
            <RefreshCw className="w-6 h-6 text-[#1A56DB] animate-spin mb-2" />

            <p className="text-xs text-muted-foreground">
              Cargando tus solicitudes...
            </p>
          </div>
        ) : errorSolicitudes ? (
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <p className="text-xs text-red-600">
              {errorSolicitudes}
            </p>

            <button
              type="button"
              onClick={() =>
                cargarSolicitudes(true)
              }
              className="mt-3 bg-[#1A56DB] text-white text-xs font-semibold px-4 py-2 rounded-full"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : misSolicitudes.length ===
          0 ? (
          <div className="bg-muted rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No tienes solicitudes publicadas
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/home/search')
              }
              className="text-[#1A56DB] text-sm font-semibold mt-1"
            >
              Publicar una solicitud →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {misSolicitudes
              .slice(0, 3)
              .map((solicitud) => {
                const idServicio =
                  Number(
                    solicitud.id_servicio
                  );

                return (
                  <motion.div
                    key={idServicio}
                    role="button"
                    tabIndex={0}
                    whileTap={{
                      scale: 0.98,
                    }}
                    onClick={() =>
                      navigate(
                        `/home/mis-solicitudes/${idServicio}`
                      )
                    }
                    onKeyDown={(
                      evento
                    ) => {
                      if (
                        evento.key ===
                          'Enter' ||
                        evento.key === ' '
                      ) {
                        evento.preventDefault();

                        navigate(
                          `/home/mis-solicitudes/${idServicio}`
                        );
                      }
                    }}
                    className="bg-card rounded-2xl border border-border p-4 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-[#1A56DB]">
                            {solicitud.nombre_categoria ||
                              'Servicio'}
                          </span>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colorEstado(
                              solicitud.estado
                            )}`}
                          >
                            {convertirEstado(
                              solicitud.estado
                            )}
                          </span>
                        </div>

                        <p className="text-sm font-semibold text-foreground">
                          {obtenerTitulo(
                            solicitud
                          )}
                        </p>

                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {
                            solicitud.descripcion
                          }
                        </p>
                      </div>

                      <span className="text-sm font-bold text-[#1A56DB] flex-shrink-0">
                        {formatearPresupuesto(
                          solicitud.presupuesto
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-3">
                      <div className="flex items-center gap-1 min-w-0">
                        <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />

                        <span className="text-xs text-muted-foreground truncate">
                          {
                            solicitud.direccion
                          }
                        </span>
                      </div>

                      <span className="text-xs font-semibold text-[#1A56DB] flex-shrink-0">
                        {solicitud.cantidad_postulaciones ??
                          0}{' '}
                        interesados
                      </span>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Disponibles ahora */}
          <div className="mt-6 px-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">
                Disponibles ahora
              </h2>

              <button
                type="button"
                className="text-xs text-[#1A56DB] flex items-center gap-1"
                onClick={() => navigate('/home/search')}
              >
                Ver todos
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

        {cargandoEmpleados ? (
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Cargando trabajadores disponibles...
            </p>
          </div>
        ) : empleadosDisponibles.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No hay trabajadores disponibles en este momento.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {empleadosDisponibles.slice(0, 3).map((worker) => (
              <motion.button
                key={worker.id_empleado}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  navigate(`/home/worker/${worker.id_empleado}`)
                }
                className="w-full bg-card rounded-2xl border border-border p-3 text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar temporal */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-[#EFF4FF] flex items-center justify-center">
                      <span className="text-xl font-bold text-[#1A56DB]">
                        {worker.nombre?.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    </div>

                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {worker.nombre ?? 'Trabajador'}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      {worker.numero_trabajos ?? 0}{' '}
                      {worker.numero_trabajos === 1
                        ? 'trabajo realizado'
                        : 'trabajos realizados'}
                    </p>

                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />

                      <span className="text-xs text-green-600 font-medium">
                        {worker.estado || 'Disponible'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
