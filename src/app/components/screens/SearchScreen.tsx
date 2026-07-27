import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Calendar,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useApp } from '../../context/AppContext';
import { WorkerCard } from '../shared/WorkerCard';
import { MOCK_WORKERS } from '../../data/mockData';

import {
  crearSolicitud,
  obtenerCategoriasDB,
} from '../../services/solicitudesApi';

type SortBy = 'distance' | 'rating' | 'price';

interface PostJobForm {
  title: string;
  description: string;
  budget: number;
  address: string;
  fecha: string;
}

interface CategoriaDB {
  id_categoria: number;
  nombre: string;
  subCatgeoria?: string;
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
  id_categoria?: number | string;
  categoria?: string;
}

type WorkerCardData =
  ComponentProps<typeof WorkerCard>['worker'];

export default function SearchScreen() {
  const { currentUser } = useApp();

  const [tab, setTab] =
    useState<'explore' | 'post'>('explore');

  const [selectedCat, setSelectedCat] =
    useState<number | null>(null);

  const [sortBy, setSortBy] =
    useState<SortBy>('rating');

  const [searchText, setSearchText] =
    useState('');

  const [postCat, setPostCat] =
    useState<number | null>(null);

  const [publicando, setPublicando] =
    useState(false);

  const [categoriasDb, setCategoriasDb] =
    useState<CategoriaDB[]>([]);

  const [cargandoCats, setCargandoCats] =
    useState(true);

  const [empleadosDb, setEmpleadosDb] =
    useState<EmpleadoDB[]>([]);

  const [cargandoEmpleados, setCargandoEmpleados] =
    useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PostJobForm>({
    defaultValues: {
      budget: 500,
      title: '',
      description: '',
      address: '',
      fecha: '',
    },
  });

  const currentBudget = watch('budget');

  // ==========================================
  // CARGAR CATEGORÍAS DESDE MYSQL
  // ==========================================
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const data = await obtenerCategoriasDB();

        setCategoriasDb(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        console.error(
          'Error al cargar categorías:',
          error
        );

        toast.error(
          'Error al cargar las categorías desde la base de datos'
        );

        setCategoriasDb([]);
      } finally {
        setCargandoCats(false);
      }
    };

    fetchCategorias();
  }, []);

  // ==========================================
  // CARGAR EMPLEADOS DESDE MYSQL
  // ==========================================
  const cargarEmpleados = async (
    idCategoria: number | null
  ) => {
    try {
      setCargandoEmpleados(true);

      const url = idCategoria
        ? `http://localhost:3000/api/categorias/${idCategoria}/empleados`
        : 'http://localhost:3000/api/empleados';

      const respuesta = await fetch(url);

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            'No se pudieron cargar los trabajadores'
        );
      }

      setEmpleadosDb(
        Array.isArray(datos) ? datos : []
      );
    } catch (error) {
      console.error(
        'Error al cargar trabajadores:',
        error
      );

      toast.error(
        'No se pudieron cargar los trabajadores'
      );

      setEmpleadosDb([]);
    } finally {
      setCargandoEmpleados(false);
    }
  };

  useEffect(() => {
    cargarEmpleados(selectedCat);
  }, [selectedCat]);

  // ==========================================
  // CONVERTIR EMPLEADOS DE MYSQL AL FORMATO
  // QUE NECESITA WORKERCARD
  // ==========================================
 const trabajadoresConvertidos: WorkerCardData[] =
  empleadosDb.map((empleado, index) => {
    const plantilla =
      MOCK_WORKERS[
        index % MOCK_WORKERS.length
      ] ?? MOCK_WORKERS[0];

    const disponible =
      empleado.estado
        ?.trim()
        .toLowerCase() === 'disponible';

    const worker: WorkerCardData = {
      ...plantilla,

      id: empleado.id_empleado as typeof plantilla.id,

      name:
        empleado.nombre_E ||
        'Trabajador',

      location:
        empleado.direccion?.trim() ||
        'Dirección no especificada',

      services: [
        empleado.titulo?.trim() ||
          empleado.categoria ||
          'Servicios generales',
      ] as typeof plantilla.services,

      categories: empleado.id_categoria
        ? [
            String(
              empleado.id_categoria
            ),
          ] as typeof plantilla.categories
        : [],

      jobCount: Number(
        empleado.N_trabajos ?? 0
      ),

      rating: 0,
      reviewCount: 0,
      pricePerHour: 0,
      distanceKm: 0,
      };

    return worker;
  });

  // ==========================================
  // FILTRAR Y ORDENAR TRABAJADORES
  // ==========================================
  const filteredWorkers =
    trabajadoresConvertidos
      .filter((worker) => {
        const texto = searchText
          .trim()
          .toLowerCase();

        if (!texto) {
          return true;
        }

        const coincideNombre = worker.name
          .toLowerCase()
          .includes(texto);

        const coincideServicio =
          worker.services.some((servicio) =>
            servicio
              .toLowerCase()
              .includes(texto)
          );

        const coincideDireccion =
          worker.location
            .toLowerCase()
            .includes(texto);

        return (
          coincideNombre ||
          coincideServicio ||
          coincideDireccion
        );
      })
      .sort((a, b) => {
        if (sortBy === 'distance') {
          return (
            a.distanceKm - b.distanceKm
          );
        }

        if (sortBy === 'rating') {
          return b.rating - a.rating;
        }

        if (sortBy === 'price') {
          return (
            a.pricePerHour -
            b.pricePerHour
          );
        }

        return 0;
      });

  // ==========================================
  // PUBLICAR SOLICITUD
  // ==========================================
  const onSubmit = async (
    data: PostJobForm
  ) => {
    if (!postCat) {
      toast.error(
        'Completa la categoría del servicio'
      );

      return;
    }

    const idCliente = Number(
      currentUser?.id
    );

    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0
    ) {
      toast.error(
        'No se pudo obtener el ID del cliente'
      );

      return;
    }

    try {
      setPublicando(true);

      await crearSolicitud({
        fk_cliente: idCliente,
        categoria: postCat,
        titulo: data.title.trim(),
        descripcion:
          data.description.trim(),
        presupuesto: Number(
          data.budget
        ),
        direccion: data.address.trim(),
        fecha: data.fecha.trim(),
      });

      toast.success(
        'Solicitud publicada'
      );

      reset({
        budget: 500,
        title: '',
        description: '',
        address: '',
        fecha: '',
      });

      setPostCat(null);
      setTab('explore');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al publicar'
      );
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado */}
      <div className="bg-card px-5 pt-10 pb-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground mb-3">
          Buscar servicios
        </h1>

        {/* Pestañas */}
        <div className="flex bg-muted rounded-xl p-1">
          {(
            [
              ['explore', 'Explorar servicios'],
              ['post', 'Publicar trabajo'],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
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
          {/* Buscar */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <input
                  value={searchText}
                  onChange={(e) =>
                    setSearchText(
                      e.target.value
                    )
                  }
                  placeholder="Buscar trabajador o servicio..."
                  className="w-full bg-input-background rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>

              <button
                type="button"
                className="w-10 h-10 bg-[#1A56DB] rounded-xl flex items-center justify-center flex-shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Ordenamiento */}
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {(
                [
                  [
                    'rating',
                    'Mejor valorados',
                  ],
                  [
                    'distance',
                    'Más cercanos',
                  ],
                  [
                    'price',
                    'Menor precio',
                  ],
                ] as const
              ).map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() =>
                    setSortBy(key)
                  }
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all whitespace-nowrap ${
                    sortBy === key
                      ? 'bg-[#1A56DB] text-white border-[#1A56DB]'
                      : 'bg-card text-muted-foreground border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Categorías desde MySQL */}
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">
                Categorías
              </p>

              {selectedCat !== null && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedCat(null)
                  }
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
                {categoriasDb.map(
                  (categoria) => {
                    const seleccionada =
                      selectedCat ===
                      Number(
                        categoria.id_categoria
                      );

                    return (
                      <button
                        type="button"
                        key={
                          categoria.id_categoria
                        }
                        onClick={() =>
                          setSelectedCat(
                            seleccionada
                              ? null
                              : Number(
                                  categoria.id_categoria
                                )
                          )
                        }
                        className={`p-3 rounded-xl border text-left transition-all ${
                          seleccionada
                            ? 'border-[#1A56DB] bg-[#EFF4FF]'
                            : 'border-border bg-card'
                        }`}
                      >
                        <span
                          className={`block text-sm font-semibold ${
                            seleccionada
                              ? 'text-[#1A56DB]'
                              : 'text-foreground'
                          }`}
                        >
                          {categoria.nombre}
                        </span>

                        {categoria.subCatgeoria && (
                          <span className="block text-[10px] text-muted-foreground mt-1">
                            {
                              categoria.subCatgeoria
                            }
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No hay categorías disponibles.
              </p>
            )}
          </div>

          {/* Resultados */}
          <div className="px-5 pb-6">
            <p className="text-sm font-semibold text-foreground mb-3">
              {cargandoEmpleados
                ? 'Buscando trabajadores...'
                : `${filteredWorkers.length} trabajadores encontrados`}
            </p>

            <div className="flex flex-col gap-3">
              {cargandoEmpleados ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm">
                    Cargando trabajadores...
                  </p>
                </div>
              ) : (
                <>
                  {filteredWorkers.map(
                    (worker) => (
                      <WorkerCard
                        key={worker.id}
                        worker={worker}
                        variant="full"
                      />
                    )
                  )}

                  {filteredWorkers.length ===
                    0 && (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground text-sm">
                        No se encontraron
                        trabajadores
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCat(
                            null
                          );

                          setSearchText('');
                        }}
                        className="text-[#1A56DB] text-sm mt-1"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
          <form
            onSubmit={handleSubmit(
              onSubmit
            )}
            className="flex flex-col gap-4"
          >
            {/* Categorías para publicar */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">
                Categoría del servicio *
              </label>

              {cargandoCats ? (
                <p className="text-xs text-muted-foreground">
                  Cargando categorías...
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {categoriasDb.map(
                    (categoria) => {
                      const seleccionada =
                        postCat ===
                        Number(
                          categoria.id_categoria
                        );

                      return (
                        <button
                          type="button"
                          key={
                            categoria.id_categoria
                          }
                          onClick={() =>
                            setPostCat(
                              seleccionada
                                ? null
                                : Number(
                                    categoria.id_categoria
                                  )
                            )
                          }
                          className={`flex flex-col items-start p-3 rounded-xl border transition-all ${
                            seleccionada
                              ? 'border-[#1A56DB] bg-[#EFF4FF]'
                              : 'border-border bg-card'
                          }`}
                        >
                          <span
                            className={`text-sm font-semibold ${
                              seleccionada
                                ? 'text-[#1A56DB]'
                                : 'text-foreground'
                            }`}
                          >
                            {categoria.nombre}
                          </span>

                          {categoria.subCatgeoria && (
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {
                                categoria.subCatgeoria
                              }
                            </span>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* Título */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Título de la solicitud *
              </label>

              <input
                {...register('title', {
                  required:
                    'El título es obligatorio',
                })}
                placeholder="Ej: Reparación de fuga en baño"
                className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
              />

              {errors.title && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Descripción
              </label>

              <textarea
                {...register(
                  'description'
                )}
                placeholder="Describe lo que necesitas con el mayor detalle posible..."
                rows={3}
                className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30 resize-none"
              />
            </div>

            {/* Presupuesto */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-foreground">
                  Presupuesto
                </label>

                <span className="text-sm font-bold text-[#1A56DB]">
                  L{' '}
                  {Number(
                    currentBudget
                  ).toLocaleString()}
                </span>
              </div>

              <input
                type="range"
                min={500}
                max={5000}
                step={500}
                {...register('budget', {
                  valueAsNumber: true,
                })}
                className="w-full accent-[#1A56DB]"
              />

              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>L 500</span>
                <span>L 5000</span>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Dirección *
              </label>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <input
                  {...register('address', {
                    required:
                      'La dirección es obligatoria',
                  })}
                  placeholder="Tu dirección"
                  className="w-full bg-input-background rounded-xl pl-9 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>

              {errors.address && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* Fecha */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Fecha para realizar el trabajo *
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <input
                  type="date"
                  {...register('fecha', {
                    required:
                      'La fecha es obligatoria',
                  })}
                  className="w-full bg-input-background rounded-xl pl-9 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>

              {errors.fecha && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.fecha.message}
                </p>
              )}
            </div>

            <motion.button
              whileTap={{
                scale: publicando
                  ? 1
                  : 0.97,
              }}
              type="submit"
              disabled={
                publicando ||
                cargandoCats
              }
              className="w-full bg-[#1A56DB] text-white rounded-xl py-3.5 font-semibold shadow-lg shadow-[#1A56DB]/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {publicando
                ? 'Publicando...'
                : 'Publicar trabajo'}
            </motion.button>
          </form>
        </div>
      )}
    </div>
  );
}