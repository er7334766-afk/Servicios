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
  ChevronRight,
  Plus,
  RefreshCw,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { WorkerCard } from '../shared/WorkerCard';
import { ServiceCategoryGrid } from '../shared/ServiceCategoryGrid';
import { useApp } from '../../context/AppContext';

// Categories will be loaded from backend; using empty list for now
const SERVICE_CATEGORIES_RUNTIME: any[] = [];
import { obtenerCategoriasDB } from '../../services/solicitudesApi';
import { obtenerEmpleados } from '../../services/empleadosApi';

import type {
  ServiceCategory,ServiceCategoryItem, Worker
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
  nombre_E: string;
  correo: string;
  celular: string;
  titulo: string | null;
  direccion: string | null;
  fk_categoria: number | null;
  estado: string;
  N_trabajos: number;
  sobre_mi: string | null;
}

export default function HomeClientScreen() {
  const navigate = useNavigate();

  const {
    currentUser,
    unreadNotifications,
  } = useApp();

  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<
    EmpleadoDisponible[]
    >([]); //agregado
    const [empleadosDestacados, setEmpleadosDestacados] = useState<
    EmpleadoDisponible[]
    >([]); //agregado

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

  const [categories, setCategories] = useState<ServiceCategoryItem[]>([]);
  const [featured, setFeatured] = useState<Worker[]>([]);
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

          return {
            id: String(c.id) as any,
            label: c.nombre ?? c.label ?? 'Categoría',
            icon: 'Wrench',
            color: c.color ?? '#1A56DB',
            bgColor: c.bgColor ?? '#EFF4FF',
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
        const empleados = await obtenerEmpleados();

        const mapped: Worker[] = (empleados || []).slice(0, 8).map((e: any) => ({
          id: String(e.id_empleado ?? e.id ?? e._id),
          name: e.nombre_E || e.nombre || 'Trabajador',
          email: e.correo ?? '',
          phone: e.celular ?? '',
          avatarUrl: e.foto ?? e.avatarUrl ?? '',
          role: 'worker',
          location: e.direccion ?? 'No especificada',
          joinedDate: e.fechaCreacion ?? '',
          categories: e.id_categoria ? [String(e.id_categoria) as any] : [],
          rating: Number(e.rating ?? 0),
          reviewCount: Number(e.reviews ?? 0),
          jobCount: Number(e.N_trabajos ?? e.numeroTrabajos ?? 0),
          bio: e.descripcion ?? '',
          distanceKm: 0,
          pricePerHour: Number(e.precio ?? 0),
          isAvailable: String(e.estado ?? '').toLowerCase() === 'disponible',
          galleryUrls: [],
          services: [e.titulo?.trim() || e.categoria || 'Servicios generales'],
        }));

        setFeatured(mapped);
      } catch (err) {
        console.error('No se pudieron cargar empleados destacados:', err);
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
    categoria: ServiceCategory
  ) => {
    navigate(
      `/home/search?cat=${categoria}`
    );
  };

  //empleados disponibles
  useEffect(() => {
    const cargarEmpleadosDisponibles = async () => {
      try {
        setCargandoEmpleados(true);

        const respuesta = await fetch(
          'http://localhost:3000/api/empleados/disponibles'
        );

        if (!respuesta.ok) {
          throw new Error('No se pudieron cargar los empleados disponibles');
        }

        const datos = await respuesta.json();
        setEmpleadosDisponibles(datos);
      } catch (error) {
        console.error('Error al cargar empleados disponibles:', error);
        setEmpleadosDisponibles([]);
      } finally {
        setCargandoEmpleados(false);
      }
    };

    cargarEmpleadosDisponibles();
  }, []);

  return (
    <div className="pb-4">
      {/* Encabezado */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">
              Buenos días,
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

              {unreadNotifications >
                0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-[#1A56DB]" />
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
          onClick={() =>
            navigate('/home/search')
          }
          className="w-full bg-white rounded-xl flex items-center gap-3 px-4 py-3 shadow-lg"
        >
          <Search className="w-4 h-4 text-muted-foreground" />

          <span className="text-muted-foreground text-sm">
            ¿Qué servicio necesitas?
          </span>

          <div className="ml-auto flex items-center gap-1 bg-[#EFF4FF] px-2 py-1 rounded-lg">
            <MapPin className="w-3 h-3 text-[#1A56DB]" />

            <span className="text-[11px] text-[#1A56DB] font-medium">
              Condesa
            </span>
          </div>
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
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
          {empleadosDestacados.map((worker) => (
            <motion.button
              key={worker.id_empleado}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                navigate(`/home/worker/${worker.id_empleado}`)
              }
              className="min-w-[180px] bg-card rounded-2xl border border-border p-4 text-left shadow-sm"
            >
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-[#EFF4FF] flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#1A56DB]">
                    {worker.nombre_E.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-center text-sm">
                {worker.nombre_E}
              </h3>

              <p className="text-xs text-center text-muted-foreground mt-1">
                {worker.N_trabajos ?? 0} Trabajos realizados
              </p>

              <p className="text-xs text-center text-green-600 font-medium mt-2">
                {worker.estado || 'Disponible'}
              </p>
            </motion.button>
          ))}
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
        <h2 className="text-base font-bold text-foreground mb-3">
          Disponibles ahora
        </h2>

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
                        {worker.nombre_E.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {worker.nombre_E}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      {worker.N_trabajos ?? 0} trabajos realizados
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