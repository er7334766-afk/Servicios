// SearchScreen.tsx
import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useApp } from '../../context/AppContext';
import { WorkerCard } from '../shared/WorkerCard';
import {
  crearSolicitud,
  obtenerCategoriasDB,
} from '../../services/solicitudesApi';

type SortBy = 'distance' | 'rating' | 'price';
type WorkerCardData = ComponentProps<typeof WorkerCard>['worker'];
type ServiceCategory = WorkerCardData['categories'][number];

interface PostJobForm {
  title: string;
  description: string;
  budget: number;
  address: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

interface CategoriaDB {
  id_categoria: number;
  nombre: string;
}


interface CategoriaEmpleadoDB {
  id_categoria?: number | string;
  nombre?: string;
}

interface ServicioEmpleadoDB {
  nombre_servicio?: string;
  nombre?: string;
}

interface EmpleadoDB {
  id_empleado: number | string;
  nombre_E?: string;
  correo?: string;
  celular?: string | number | null;
  titulo?: string | null;
  direccion?: string | null;
  estado?: string | null;
  N_trabajos?: number | string | null;
  sobre_mi?: string | null;
  foto?: string | null;
  calificacion?: number | string | null;
  cantidad_resenas?: number | string | null;
  precio_hora?: number | string | null;
  distancia_km?: number | string | null;
  id_categoria?: number | string | null;
  fk_categoria?: number | string | null;
  categoria?: string | null;
  categorias?: CategoriaEmpleadoDB[];
  servicios?: ServicioEmpleadoDB[];
}

const API_URL = 'http://localhost:3000';

const CATEGORY_ID_MAP: Record<number, ServiceCategory> = {
  1: 'plomeria' as ServiceCategory,
  2: 'electricidad' as ServiceCategory,
  3: 'limpieza' as ServiceCategory,
  4: 'construccion' as ServiceCategory,
  5: 'pintura' as ServiceCategory,
  6: 'carpinteria' as ServiceCategory,
  7: 'jardineria' as ServiceCategory,
  8: 'electrodomesticos' as ServiceCategory,
};

const normalizeCategory = (
  value?: string | number | null
): ServiceCategory | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return CATEGORY_ID_MAP[value] ?? null;
  }

  const numericValue = Number(value);
  if (Number.isInteger(numericValue) && String(numericValue) === value.trim()) {
    return CATEGORY_ID_MAP[numericValue] ?? null;
  }

  const normalized = value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const categoryMap: Record<string, ServiceCategory> = {
    plomeria: 'plomeria' as ServiceCategory,
    electricidad: 'electricidad' as ServiceCategory,
    limpieza: 'limpieza' as ServiceCategory,
    construccion: 'construccion' as ServiceCategory,
    pintura: 'pintura' as ServiceCategory,
    carpinteria: 'carpinteria' as ServiceCategory,
    jardineria: 'jardineria' as ServiceCategory,
    electrodomesticos: 'electrodomesticos' as ServiceCategory,
  };

  return categoryMap[normalized] ?? null;
};

const extractArray = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const possibleLists = [
      record.empleados,
      record.trabajadores,
      record.data,
      record.resultados,
      record.categorias,
      record.subcategorias,
    ];

    const found = possibleLists.find(Array.isArray);
    if (found) return found as T[];
  }

  return [];
};

const getErrorMessage = (payload: unknown, fallback: string): string => {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const message = record.mensaje ?? record.message ?? record.error;
    if (typeof message === 'string' && message.trim()) return message;
  }

  return fallback;
};

export default function SearchScreen() {
  const navigate = useNavigate();
  const { currentUser, role } = useApp();

  const [tab, setTab] = useState<'explore' | 'post'>('explore');
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [searchText, setSearchText] = useState('');

  const [categoriasDb, setCategoriasDb] = useState<CategoriaDB[]>([]);
  const [cargandoCats, setCargandoCats] = useState(true);

  const [empleadosDb, setEmpleadosDb] = useState<EmpleadoDB[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(true);
  const [errorEmpleados, setErrorEmpleados] = useState('');

  const [postCat, setPostCat] = useState<number | null>(null);

  const [publicando, setPublicando] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors },
  } = useForm<PostJobForm>({
    defaultValues: {
      budget: 500,
      title: '',
      description: '',
      address: '',
      fecha: '',
      hora_inicio: '',
      hora_fin: '',
    },
  });

  const currentBudget = watch('budget');

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        setCargandoCats(true);
        const data = await obtenerCategoriasDB();
        setCategoriasDb(extractArray<CategoriaDB>(data));
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        toast.error('Error al cargar las categorías desde la base de datos');
        setCategoriasDb([]);
      } finally {
        setCargandoCats(false);
      }
    };

    void fetchCategorias();
  }, []);

  useEffect(() => {
    const cargarEmpleados = async () => {
      try {
        setCargandoEmpleados(true);
        setErrorEmpleados('');

        const url = selectedCat
          ? `${API_URL}/api/categorias/${selectedCat}/empleados`
          : `${API_URL}/api/empleados`;

        const respuesta = await fetch(url);
        const datos: unknown = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            getErrorMessage(datos, 'No se pudieron cargar los trabajadores')
          );
        }

        const listaEmpleados = extractArray<EmpleadoDB>(datos);
        console.log('Empleados recibidos:', listaEmpleados);
        setEmpleadosDb(listaEmpleados);
      } catch (error) {
        const mensaje =
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los trabajadores';

        console.error('Error al cargar trabajadores:', error);
        setErrorEmpleados(mensaje);
        setEmpleadosDb([]);
        toast.error(mensaje);
      } finally {
        setCargandoEmpleados(false);
      }
    };

    void cargarEmpleados();
  }, [selectedCat]);

  

  const trabajadoresConvertidos = useMemo<WorkerCardData[]>(() => {
    return empleadosDb.map((empleado) => {
      const categoriasFuente: Array<string | number> = [];

      for (const categoria of empleado.categorias ?? []) {
        if (categoria.id_categoria !== undefined) {
          categoriasFuente.push(categoria.id_categoria);
        } else if (categoria.nombre) {
          categoriasFuente.push(categoria.nombre);
        }
      }

      if (categoriasFuente.length === 0) {
        const categoriaSimple =
          empleado.id_categoria ?? empleado.fk_categoria ?? empleado.categoria;

        if (categoriaSimple !== null && categoriaSimple !== undefined) {
          categoriasFuente.push(categoriaSimple);
        }
      }

      const categories = categoriasFuente
        .map(normalizeCategory)
        .filter(
          (categoria): categoria is ServiceCategory => categoria !== null
        );

      const services = (empleado.servicios ?? [])
        .map(
          (servicio) =>
            servicio.nombre_servicio?.trim() || servicio.nombre?.trim() || ''
        )
        .filter(Boolean);

      if (services.length === 0) {
        services.push(
          empleado.titulo?.trim() ||
            empleado.categoria?.trim() ||
            'Servicios generales'
        );
      }

      const estadoNormalizado = empleado.estado?.trim().toLowerCase();

      return {
        id: String(empleado.id_empleado),
        name: empleado.nombre_E?.trim() || 'Trabajador',
        email: empleado.correo?.trim() || '',
        phone:
          empleado.celular !== null &&
          empleado.celular !== undefined
            ? String(empleado.celular).trim()
            : '',
        role: 'worker',
        avatarUrl: empleado.foto?.trim() || '',
        location: empleado.direccion?.trim() || 'Dirección no especificada',
        joinedDate: '',
        categories,
        rating: Number(empleado.calificacion ?? 0),
        reviewCount: Number(empleado.cantidad_resenas ?? 0),
        jobCount: Number(empleado.N_trabajos ?? 0),
        bio:
          empleado.sobre_mi?.trim() ||
          empleado.titulo?.trim() ||
          'Sin descripción disponible',
        distanceKm: Number(empleado.distancia_km ?? 0),
        pricePerHour: Number(empleado.precio_hora ?? 0),
        isAvailable:
          estadoNormalizado === 'disponible' || estadoNormalizado === 'activo',
        galleryUrls: [],
        services,
      } as WorkerCardData;
    });
  }, [empleadosDb]);

  const filteredWorkers = useMemo(() => {
    const texto = searchText.trim().toLowerCase();

    return trabajadoresConvertidos
      .filter((worker) => {
        if (!texto) return true;

        const coincideNombre = worker.name.toLowerCase().includes(texto);
        const coincideServicio = worker.services.some((servicio) =>
          servicio.toLowerCase().includes(texto)
        );
        const coincideDireccion = worker.location
          .toLowerCase()
          .includes(texto);

        return coincideNombre || coincideServicio || coincideDireccion;
      })
      .sort((a, b) => {
        if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
        if (sortBy === 'rating') return b.rating - a.rating;
        return a.pricePerHour - b.pricePerHour;
      });
  }, [trabajadoresConvertidos, searchText, sortBy]);

  const seleccionarCategoriaPublicacion = (categoria: CategoriaDB) => {
    const idCategoria = Number(categoria.id_categoria);
    const seleccionada = postCat === idCategoria;

    setPostCat(
      seleccionada ? null : idCategoria
    );
  };

  const onSubmit = async (data: PostJobForm) => {
    if (!postCat) {
      toast.error('Completa la categoría del servicio');
      return;
    }


    const idCliente = Number(currentUser?.id);

    if (!Number.isInteger(idCliente) || idCliente <= 0) {
      toast.error('No se pudo obtener el ID del cliente');
      return;
    }

    try {
      setPublicando(true);

      await crearSolicitud({
        fk_cliente: idCliente,
        categoria: postCat,
        titulo: data.title.trim(),
        descripcion: data.description.trim(),
        presupuesto: Number(data.budget),
        direccion: data.address.trim(),
        fecha: data.fecha.trim(),
        hora_inicio: data.hora_inicio.trim(),
        hora_fin: data.hora_fin.trim(),
      });

      toast.success('Solicitud publicada');

      reset({
        budget: 500,
        title: '',
        description: '',
        address: '',
        fecha: '',
        hora_inicio: '',
        hora_fin: '',
      });

      setPostCat(null);
      setTab('explore');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al publicar');
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-5 pb-4 pt-10">
        <h1 className="mb-3 text-lg font-bold text-foreground">
          Buscar servicios
        </h1>

        <div className="flex rounded-xl bg-muted p-1">
          {(
            [
              ['explore', 'Explorar servicios'],
              [
                'post',
                role === 'client' ? 'Publicar servicio' : 'Publicar trabajo',
              ],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                tab === key
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'explore' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pb-2 pt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Buscar trabajador o servicio..."
                  className="w-full rounded-xl bg-input-background py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>

              <button
                type="button"
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1A56DB]"
                aria-label="Abrir filtros"
              >
                <SlidersHorizontal className="h-4 w-4 text-white" />
              </button>
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto">
              {(
                [
                  ['rating', 'Mejor valorados'],
                  ['distance', 'Más cercanos'],
                  ['price', 'Menor precio'],
                ] as const
              ).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    sortBy === key
                      ? 'border-[#1A56DB] bg-[#1A56DB] text-white'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* categoria */}
          {/* Categorías desde MySQL */}
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">
                Categorías
              </p>

              {selectedCat !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedCat(null)}
                  className="flex items-center gap-1 text-xs text-[#1A56DB]"
                >
                  <X className="w-3 h-3" />
                  Limpiar filtro
                </button>
              )}
            </div>

            {cargandoCats ? (
              <p className="text-xs text-muted-foreground">
                Cargando categorías...
              </p>
            ) : categoriasDb.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {categoriasDb.map((categoria) => {
                  const seleccionada =
                    selectedCat === Number(categoria.id_categoria);

                  const estilosCategorias: Record<
                    string,
                    {
                      texto: string;
                      borde: string;
                      fondo: string;
                      fondoSeleccionado: string;
                    }
                  > = {
                    plomeria: {
                      texto: 'text-blue-600',
                      borde: 'border-blue-200',
                      fondo: 'bg-blue-50/40',
                      fondoSeleccionado: 'bg-blue-100',
                    },
                    electricidad: {
                      texto: 'text-orange-600',
                      borde: 'border-orange-200',
                      fondo: 'bg-orange-50/40',
                      fondoSeleccionado: 'bg-orange-100',
                    },
                    limpieza: {
                      texto: 'text-emerald-600',
                      borde: 'border-emerald-200',
                      fondo: 'bg-emerald-50/40',
                      fondoSeleccionado: 'bg-emerald-100',
                    },
                    construccion: {
                      texto: 'text-slate-600',
                      borde: 'border-slate-200',
                      fondo: 'bg-slate-50',
                      fondoSeleccionado: 'bg-slate-100',
                    },
                    pintura: {
                      texto: 'text-pink-600',
                      borde: 'border-pink-200',
                      fondo: 'bg-pink-50/40',
                      fondoSeleccionado: 'bg-pink-100',
                    },
                    carpinteria: {
                      texto: 'text-amber-700',
                      borde: 'border-amber-200',
                      fondo: 'bg-amber-50/40',
                      fondoSeleccionado: 'bg-amber-100',
                    },
                    jardineria: {
                      texto: 'text-green-600',
                      borde: 'border-green-200',
                      fondo: 'bg-green-50/40',
                      fondoSeleccionado: 'bg-green-100',
                    },
                    electrodomesticos: {
                      texto: 'text-violet-600',
                      borde: 'border-violet-200',
                      fondo: 'bg-violet-50/40',
                      fondoSeleccionado: 'bg-violet-100',
                    },
                  };

                  const nombreNormalizado = categoria.nombre
                    .toLowerCase()
                    .trim()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                  const estilo =
                    estilosCategorias[nombreNormalizado] ?? {
                      texto: 'text-gray-600',
                      borde: 'border-gray-200',
                      fondo: 'bg-gray-50',
                      fondoSeleccionado: 'bg-gray-100',
                    };

                  return (
                    <button
                      type="button"
                      key={categoria.id_categoria}
                      onClick={() =>
                        setSelectedCat(
                          seleccionada
                            ? null
                            : Number(categoria.id_categoria)
                        )
                      }
                      className={`p-3 rounded-xl border text-center flex items-center justify-center transition-all
                        ${estilo.borde}
                        ${
                          seleccionada
                            ? `${estilo.fondoSeleccionado} shadow-sm`
                            : estilo.fondo
                        }
                      `}
                    >
                      <span
                        className={`block text-sm font-semibold ${estilo.texto}`}
                      >
                        {categoria.nombre.charAt(0).toUpperCase() + categoria.nombre.slice(1).toLowerCase()}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No hay categorías disponibles.
              </p>
            )}
          </div>

          <div className="px-5 pb-6">
            <p className="mb-3 text-sm font-semibold text-foreground">
              {cargandoEmpleados
                ? 'Buscando trabajadores...'
                : `${filteredWorkers.length} trabajadores encontrados`}
            </p>

            <div className="flex flex-col gap-3">
              {cargandoEmpleados ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    Cargando trabajadores...
                  </p>
                </div>
              ) : errorEmpleados ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-red-500">{errorEmpleados}</p>
                </div>
              ) : filteredWorkers.length > 0 ? (
                filteredWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/home/worker/${worker.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        navigate(`/home/worker/${worker.id}`);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <WorkerCard worker={worker} variant="full" />
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    No se encontraron trabajadores
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCat(null);
                      setSearchText('');
                    }}
                    className="mt-1 text-sm text-[#1A56DB]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pb-6 pt-4">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                Categoría del servicio *
              </label>

              {cargandoCats ? (
                <p className="text-xs text-muted-foreground">
                  Cargando categorías...
                </p>
              ) : categoriasDb.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {categoriasDb.map((categoria) => {
                    const idCategoria = Number(categoria.id_categoria);
                    const seleccionada = postCat === idCategoria;

                    const iconosCategorias: Record<string, string> = {
                      plomeria: '🔧',
                      electricidad: '⚡',
                      limpieza: '🧹',
                      construccion: '🏗️',
                      pintura: '🎨',
                      carpinteria: '🪚',
                      jardineria: '🌿',
                      electrodomesticos: '🔌',
                    };

                    const nombreNormalizado = categoria.nombre
                      .toLowerCase()
                      .trim()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '');

                    const icono = iconosCategorias[nombreNormalizado] || '🛠️';

                    return (
                      <motion.button
                        type="button"
                        key={categoria.id_categoria}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => seleccionarCategoriaPublicacion(categoria)}
                        className={`relative rounded-2xl border p-4 text-left transition-all ${
                          seleccionada
                            ? 'border-[#1A56DB] bg-[#EFF4FF] shadow-md shadow-[#1A56DB]/10'
                            : 'border-border bg-card hover:border-[#1A56DB]/40'
                        }`}
                      >
                        {seleccionada && (
                          <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#1A56DB] text-[10px] text-white">
                            ✓
                          </div>
                        )}

                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`text-sm font-semibold ${
                              seleccionada
                                ? 'text-[#1A56DB]'
                                : 'text-foreground'
                            }`}
                          >
                            {categoria.nombre}
                          </span>

                          <span className="text-base">{icono}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No hay categorías disponibles.
                </p>
              )}
            </div>

            

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Título de la solicitud *
              </label>

              <input
                {...register('title', {
                  required: 'El título es obligatorio',
                })}
                placeholder="Ej: Reparación de fuga en baño"
                className="w-full rounded-xl bg-input-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
              />

              {errors.title && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Descripción
              </label>

              <textarea
                {...register('description')}
                placeholder="Describe lo que necesitas con el mayor detalle posible..."
                rows={3}
                className="w-full resize-none rounded-xl bg-input-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  Presupuesto
                </label>

                <span className="text-sm font-bold text-[#1A56DB]">
                  L {Number(currentBudget || 0).toLocaleString('es-HN')}
                </span>
              </div>

              <input
                type="range"
                min={500}
                max={5000}
                step={500}
                {...register('budget', { valueAsNumber: true })}
                className="w-full accent-[#1A56DB]"
              />

              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>L 500</span>
                <span>L 5000</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Dirección *
              </label>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  {...register('address', {
                    required: 'La dirección es obligatoria',
                  })}
                  placeholder="Tu dirección"
                  className="w-full rounded-xl bg-input-background py-3 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>

              {errors.address && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Fecha para realizar el trabajo *
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="date"
                  {...register('fecha', {
                    required: 'La fecha es obligatoria',
                  })}
                  className="w-full rounded-xl bg-input-background py-3 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>

              {errors.fecha && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.fecha.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Hora de inicio *
                </label>

                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    type="time"
                    {...register('hora_inicio', {
                      required: 'La hora de inicio es obligatoria',
                    })}
                    className="w-full rounded-xl bg-input-background py-3 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                  />
                </div>

                {errors.hora_inicio && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.hora_inicio.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-foreground">
                  Hora de finalización *
                </label>

                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    type="time"
                    {...register('hora_fin', {
                      required: 'La hora de finalización es obligatoria',
                      validate: (horaFin) => {
                        const horaInicio = getValues('hora_inicio');

                        if (!horaInicio || !horaFin) return true;

                        return (
                          horaFin > horaInicio ||
                          'La hora final debe ser posterior a la hora inicial'
                        );
                      },
                    })}
                    className="w-full rounded-xl bg-input-background py-3 pl-9 pr-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                  />
                </div>

                {errors.hora_fin && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.hora_fin.message}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full rounded-xl bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-700">
              El horario es una estimación y podrá ajustarse de común acuerdo
              con el trabajador seleccionado.
            </div>

            <motion.button
              whileTap={{ scale: publicando ? 1 : 0.97 }}
              type="submit"
              disabled={publicando || cargandoCats}
              className="mt-2 w-full rounded-xl bg-[#1A56DB] py-3.5 font-semibold text-white shadow-lg shadow-[#1A56DB]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publicando
                ? 'Publicando...'
                : role === 'client'
                  ? 'Publicar servicio'
                  : 'Publicar trabajo'}
            </motion.button>
          </form>
        </div>
      )}
    </div>
  );
}