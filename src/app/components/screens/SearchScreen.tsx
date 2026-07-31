import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Calendar,
  Clock,
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

interface ServicioDB {
  id_servicio: number;
  fk_cliente: number;
  fk_categoria: number;
  titulo?: string;
  descripcion: string;
  direccion: string;
  presupuesto: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado?: string;
  nombre_cliente?: string;
  nombre_categoria?: string;
}

type WorkerCardData =
  ComponentProps<typeof WorkerCard>['worker'];

function formatearFecha(
  fecha?: string | null
): string {
  if (!fecha) {
    return 'Fecha no disponible';
  }

  const valor = String(fecha).trim();

  const parteFecha = valor.includes('T')
    ? valor.split('T')[0]
    : valor;

  const [anio, mes, dia] = parteFecha
    .split('-')
    .map(Number);

  if (
    Number.isNaN(anio) ||
    Number.isNaN(mes) ||
    Number.isNaN(dia)
  ) {
    return valor;
  }

  const objetoFecha = new Date(
    anio,
    mes - 1,
    dia
  );

  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(objetoFecha);
}

function formatearHora(
  hora?: string | null
): string {
  if (!hora) {
    return 'No especificada';
  }

  const valor = String(hora).trim();

  const parteHora = valor.includes('T')
    ? valor.split('T')[1]?.split('.')[0]
    : valor;

  if (!parteHora) {
    return valor;
  }

  const [horas, minutos] = parteHora
    .split(':')
    .map(Number);

  if (
    Number.isNaN(horas) ||
    Number.isNaN(minutos)
  ) {
    return valor;
  }

  const fechaTemporal = new Date();

  fechaTemporal.setHours(
    horas,
    minutos,
    0,
    0
  );

  return new Intl.DateTimeFormat('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(fechaTemporal);
}



export default function SearchScreen() {
  const navigate = useNavigate();
  const { currentUser, role } = useApp();
  const esCliente = role === 'client';
  const esTrabajador = role === 'worker';
  const [mostrarFiltros, setMostrarFiltros] = useState(false); //agregado

  
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

  const [serviciosDb, setServiciosDb] =
    useState<ServicioDB[]>([]);

  const [cargandoServicios, setCargandoServicios] =
    useState(false);

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
      const texto = await respuesta.text();
      const datos = texto ? JSON.parse(texto) : null;

      if (!respuesta.ok) {
        throw new Error(
          datos?.mensaje ||
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
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los trabajadores'
      );

      setEmpleadosDb([]);
    } finally {
      setCargandoEmpleados(false);
    }
  };


  const cargarServicios = async () => {
  try {
    setCargandoServicios(true);

    const respuesta = await fetch(
      'http://localhost:3000/api/servicios'
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos?.mensaje ||
          'No se pudieron cargar los trabajos'
      );
    }

    setServiciosDb(
      Array.isArray(datos) ? datos : []
    );
  } catch (error) {
    console.error(
      'Error al cargar trabajos:',
      error
    );

    toast.error(
      error instanceof Error
        ? error.message
        : 'No se pudieron cargar los trabajos'
    );

    setServiciosDb([]);
  } finally {
    setCargandoServicios(false);
  }
};

  useEffect(() => {
    if (esCliente) {
      cargarEmpleados(selectedCat);
    }
  }, [selectedCat, esCliente]);

  useEffect(() => {
    if (esTrabajador) {
      cargarServicios();
    }
  }, [esTrabajador]);

  const trabajosFiltrados = serviciosDb.filter((servicio) => {
    const coincideCategoria =
      selectedCat === null ||
      Number(servicio.fk_categoria) === Number(selectedCat);

    const texto = searchText.trim().toLowerCase();

    const coincideBusqueda =
      !texto ||
      servicio.titulo?.toLowerCase().includes(texto) ||
      servicio.descripcion?.toLowerCase().includes(texto) ||
      servicio.direccion?.toLowerCase().includes(texto) ||
      servicio.nombre_categoria?.toLowerCase().includes(texto) ||
      servicio.nombre_cliente?.toLowerCase().includes(texto);

      ;

    return coincideCategoria && Boolean(coincideBusqueda);
  });

      console.log('ROL:', role);
      console.log('CATEGORÍA SELECCIONADA:', selectedCat);
      console.log('SERVICIOS:', serviciosDb);
      console.log('TRABAJOS FILTRADOS:', trabajosFiltrados)

  // ==========================================
  // CONVERTIR EMPLEADOS DE MYSQL AL FORMATO
  // QUE NECESITA WORKERCARD
  // ==========================================
 const trabajadoresConvertidos: WorkerCardData[] =
  empleadosDb.map((empleado) => {
    const worker: WorkerCardData = {
      id: String(empleado.id_empleado),
      name: empleado.nombre_E || 'Trabajador',
      email: '',
      phone: '',
      avatarUrl: '',
      role: 'worker',
      location: empleado.direccion?.trim() || 'Dirección no especificada',
      joinedDate: '',
      categories: empleado.id_categoria
        ? [String(empleado.id_categoria) as any]
        : [],
      rating: 0,
      reviewCount: 0,
      jobCount: Number(empleado.N_trabajos ?? 0),
      bio: '',
      distanceKm: 0,
      pricePerHour: 0,
      isAvailable: empleado.estado?.trim().toLowerCase() === 'disponible',
      galleryUrls: [],
      services: [
        empleado.titulo?.trim() || empleado.categoria || 'Servicios generales',
      ],
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
        hora_inicio: data.hora_inicio.trim(),
        hora_fin: data.hora_fin.trim(),
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
        hora_inicio: '',
        hora_fin: '',
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

  const trabajadoresOrdenados =
  sortBy === 'rating'
    ? [...filteredWorkers].sort((a, b) => {
        const diferenciaRating =
          Number(b.rating ?? 0) -
          Number(a.rating ?? 0);

        if (diferenciaRating !== 0) {
          return diferenciaRating;
        }

        return (
          Number(b.reviewCount ?? 0) -
          Number(a.reviewCount ?? 0)
        );
      })
    : filteredWorkers;

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado */}
      <div className="bg-card px-5 pt-10 pb-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground mb-3">
          Buscar servicios
        </h1>

        {/* Pestañas */}
        <div className="flex bg-muted rounded-xl p-1">
          <button
            type="button"
            onClick={() => setTab('explore')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === 'explore'
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            {esCliente ? 'Explorar trabajadores' : 'Explorar trabajos'}
          </button>

          {esCliente && (
            <button
              type="button"
              onClick={() => setTab('post')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === 'post'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              Publicar servicio
            </button>
          )}
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
                  placeholder={
                    esCliente
                      ? 'Buscar trabajador o servicio...'
                      : 'Buscar trabajo, categoría o dirección...'
                  }
                  className="w-full bg-input-background rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>

              <button
                type="button"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="w-10 h-10 bg-[#1A56DB] rounded-xl flex items-center justify-center flex-shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-white" />
              </button>
            </div>

            {mostrarFiltros && esCliente && (
              <div className="mt-2 flex justify-end">
                <div className="w-44 rounded-xl border border-border bg-card p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy('rating');
                      setMostrarFiltros(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all ${
                      sortBy === 'rating'
                        ? 'bg-[#EFF4FF] text-[#1A56DB] font-semibold'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    ⭐ Mejor valorados
                  </button>
                </div>
              </div>
            )}

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
              <div className="grid grid-cols-2 gap-3">
                {categoriasDb.map((categoria) => {
                  const idCategoria = Number(categoria.id_categoria);

                  const seleccionada =
                    selectedCat === idCategoria;

                  const nombre = categoria.nombre
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');

                  const colores: Record<string, string> = {
                    carpinteria:
                      'border-orange-300 text-orange-600',
                    construccion:
                      'border-slate-300 text-slate-600',
                    electricidad:
                      'border-orange-200 text-orange-500',
                    electrodomesticos:
                      'border-violet-300 text-violet-600',
                    jardineria:
                      'border-emerald-200 text-emerald-600',
                    limpieza:
                      'border-teal-300 text-teal-600',
                    pintura:
                      'border-pink-200 text-pink-500',
                    plomeria:
                      'border-blue-300 text-blue-600',
                  };

                  const color =
                    colores[nombre] ??
                    'border-slate-300 text-slate-600';

                  return (
                    <button
                      type="button"
                      key={categoria.id_categoria}
                      onClick={() =>
                        setSelectedCat(
                          seleccionada
                            ? null
                            : idCategoria
                        )
                      }
                      className={`rounded-2xl border bg-white py-4 px-3 transition-all ${
                        seleccionada
                          ? 'border-[#1A56DB] bg-[#EFF4FF] ring-1 ring-[#1A56DB]'
                          : color
                      }`}
                    >
                      <span
                        className={`block text-sm font-semibold ${
                          seleccionada
                            ? 'text-[#1A56DB]'
                            : ''
                        }`}
                      >
                        {categoria.nombre.charAt(0).toUpperCase() + categoria.nombre.slice(1)}
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

          

          {/* Resultados para clientes */}
          {esCliente && (
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
                    {trabajadoresOrdenados.map((worker) => (
                      <div
                        key={worker.id}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigate(`/home/worker/${worker.id}`)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === 'Enter' ||
                            event.key === ' '
                          ) {
                            navigate(`/home/worker/${worker.id}`);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <WorkerCard worker={worker} variant="full" />
                      </div>
                    ))}

                    {filteredWorkers.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-muted-foreground text-sm">
                          No se encontraron trabajadores
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCat(null);
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
          )}

          {/* Resultados para trabajadores */}
          {esTrabajador && (
            <div className="px-5 pb-6">
              <p className="text-sm font-semibold text-foreground mb-3">
                {cargandoServicios
                  ? 'Buscando trabajos...'
                  : `${trabajosFiltrados.length} trabajos encontrados`}
              </p>

              <div className="flex flex-col gap-3">
                {cargandoServicios ? (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-sm">
                      Cargando trabajos...
                    </p>
                  </div>
                ) : (
                  <>
                    {trabajosFiltrados.map((servicio) => (
                      <button
                        key={servicio.id_servicio}
                        type="button"
                        onClick={() =>
                          navigate(`/home/solicitud/${servicio.id_servicio}`)
                        }
                        className="w-full text-left bg-card border border-border rounded-xl p-4 transition-all hover:border-[#1A56DB]/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground">
                              {servicio.titulo?.trim() ||
                                servicio.nombre_categoria ||
                                'Solicitud de servicio'}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {servicio.descripcion}
                            </p>
                          </div>

                          <span className="text-sm font-bold text-[#1A56DB] whitespace-nowrap">
                            L {Number(servicio.presupuesto ?? 0).toLocaleString()}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {servicio.nombre_categoria && (
                            <p>Categoría: {servicio.nombre_categoria}</p>
                          )}
                          <p>{servicio.direccion}</p>
                          <p>{formatearFecha(servicio.fecha)}</p>

                            <p>
                              {formatearHora(servicio.hora_inicio)}
                              {' - '}
                              {formatearHora(servicio.hora_fin)}
                            </p>
                        </div>
                      </button>
                    ))}

                    {trabajosFiltrados.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-muted-foreground text-sm">
                          No hay trabajos disponibles en esta categoría
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCat(null);
                            setSearchText('');
                          }}
                          className="text-[#1A56DB] text-sm mt-2"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : esCliente ? (
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
                <div className="grid grid-cols-2 gap-3">
                  {categoriasDb.map((categoria) => {
                    const seleccionada =
                      postCat === Number(categoria.id_categoria);

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

                    const coloresCategorias: Record<
                      string,
                      {
                        borde: string;
                        texto: string;
                      }
                    > = {
                      plomeria: {
                        borde: 'border-blue-300',
                        texto: 'text-blue-700',
                      },
                      electricidad: {
                        borde: 'border-orange-300',
                        texto: 'text-orange-700',
                      },
                      limpieza: {
                        borde: 'border-emerald-300',
                        texto: 'text-emerald-700',
                      },
                      construccion: {
                        borde: 'border-slate-300',
                        texto: 'text-slate-700',
                      },
                      pintura: {
                        borde: 'border-pink-300',
                        texto: 'text-pink-700',
                      },
                      carpinteria: {
                        borde: 'border-amber-300',
                        texto: 'text-amber-700',
                      },
                      jardineria: {
                        borde: 'border-green-300',
                        texto: 'text-green-700',
                      },
                      electrodomesticos: {
                        borde: 'border-violet-300',
                        texto: 'text-violet-700',
                      },
                    };

                    const nombreNormalizado = categoria.nombre
                      .toLowerCase()
                      .trim()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '');

                    const icono = iconosCategorias[nombreNormalizado] || '🛠️';

                    const estilo =
                      coloresCategorias[nombreNormalizado] ?? {
                        borde: 'border-gray-300',
                        texto: 'text-gray-700',
                      };

                    return (
                      <motion.button
                        type="button"
                        key={categoria.id_categoria}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        animate={{
                          scale: seleccionada ? 1.02 : 1,
                        }}
                        transition={{
                          duration: 0.18,
                          ease: 'easeOut',
                        }}

                        onClick={() =>
                          setPostCat(
                            seleccionada
                              ? null
                              : Number(categoria.id_categoria)
                          )
                        }
                        className={`relative rounded-2xl border-2 p-4 text-left bg-white transition-all ${
                          seleccionada
                            ? 'border-[#1A56DB] bg-[#EFF4FF] shadow-md shadow-[#1A56DB]/10'
                            : `${estilo.borde} hover:shadow-sm`
                        }`}
                      >
                        {seleccionada && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1A56DB] text-white text-[10px] flex items-center justify-center">
                            ✓
                          </div>
                        )}

                        <div className="flex justify-center gap-2 mb-2">
                          <span
                            className={`text-sm font-semibold ${
                              seleccionada
                                ? 'text-[#1A56DB]'
                                : estilo.texto
                            }`}
                          >
                            {categoria.nombre.charAt(0).toUpperCase() +
                              categoria.nombre.slice(1)}
                          </span>

                          <span className="text-base leading-none">
                            {icono}
                          </span>
                        </div>

                        {categoria.subCatgeoria && (
                          <p className="text-[11px] leading-4 text-muted-foreground">
                            {categoria.subCatgeoria}
                          </p>
                        )}
                      </motion.button>
                    );
                  })}
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
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Presupuesto
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  L
                </span>

                <input
                  type="number"
                  min={100}
                  step={100}
                  {...register('budget', {
                    valueAsNumber: true,
                    required: 'El presupuesto es obligatorio',
                    min: {
                      value: 100,
                      message:
                        'El presupuesto debe ser al menos L 100',
                    },
                  })}
                  className="w-full bg-input-background rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                  placeholder="Ingresa el presupuesto"
                />
              </div>

              {errors.budget && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.budget.message}
                </p>
              )}

              <p className="mt-2 text-xs text-muted-foreground">
                Presupuesto mínimo L 100. Puedes ingresar cualquier valor numérico.
              </p>
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

            {/* Horario */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Hora de inicio *
                </label>

                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

                  <input
                    type="time"
                    {...register('hora_inicio', {
                      required:
                        'La hora de inicio es obligatoria',
                    })}
                    className="w-full bg-input-background rounded-xl pl-9 pr-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                  />
                </div>

                {errors.hora_inicio && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.hora_inicio.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Hora de finalización *
                </label>

                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

                  <input
                    type="time"
                    {...register('hora_fin', {
                      required:
                        'La hora de finalización es obligatoria',
                      validate: (horaFin) => {
                        const horaInicio =
                          getValues('hora_inicio');

                        if (!horaInicio || !horaFin) {
                          return true;
                        }

                        return (
                          horaFin > horaInicio ||
                          'La hora final debe ser posterior a la hora inicial'
                        );
                      },
                    })}
                    className="w-full bg-input-background rounded-xl pl-9 pr-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                  />
                </div>

                {errors.hora_fin && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.hora_fin.message}
                  </p>
                )}
                
              </div>
              
            </div>
             <div className="w-full bg-blue-50 text-blue-700 text-sm rounded-xl px-4 py-3 leading-relaxed">
              El horario es una estimación y podrá ajustarse de común acuerdo
              con el trabajador seleccionado.
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
              {publicando ? 'Publicando...' : 'Publicar servicio'}
            </motion.button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-5">
          <p className="text-sm text-muted-foreground text-center">
            Los trabajadores pueden explorar solicitudes publicadas por clientes.
          </p>
        </div>
      )}
    </div>
  );
}
