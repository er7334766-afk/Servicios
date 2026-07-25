//SearchScreen.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, MapPin, Calendar, X } from 'lucide-react';
import { useForm } from "react-hook-form";
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { WorkerCard } from '../shared/WorkerCard';
import { ServiceCategoryGrid } from '../shared/ServiceCategoryGrid';
import type { ServiceCategory, Worker } from '../../types';

// APIs
import { crearSolicitud, obtenerCategoriasDB } from '../../services/solicitudesApi';

type SortBy = 'distance' | 'rating' | 'price';

interface PostJobForm {
  title: string;
  description: string;
  budget: number;
  address: string;
  fecha: string; // Cambiado a string para el input date
}

interface CategoriaDB {
  id_categoria: number;
  nombre: string;
  subCatgeoria: string;
}

interface EmpleadoDB {
  id_empleado: number;
  nombre_E: string;
  correo?: string;
  celular?: string;
  titulo?: string;
  direccion?: string;
  estado?: string;
  N_trabajos?: number;
  sobre_mi?: string;
  foto?: string;
  precio_hora?: number;
  calificacion?: number;
  cantidad_resenas?: number;

  categorias?: Array<{
    id_categoria: number;
    nombre?: string;
  }>;

  servicios?: Array<{
    id_servicio: number;
    nombre_servicio?: string;
    nombre?: string;
  }>;
}

const CATEGORY_ID_MAP: Record<number, ServiceCategory> = {
  1: 'plomeria',
  2: 'electricidad',
  3: 'limpieza',
  4: 'construccion',
  5: 'pintura',
  6: 'carpinteria',
  7: 'jardineria',
  8: 'electrodomesticos',
};

const normalizeCategory = (value?: string | number | null): ServiceCategory | null => {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return CATEGORY_ID_MAP[value] ?? null;
  }

  const normalized = value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const categoryMap: Record<string, ServiceCategory> = {
    plomeria: 'plomeria',
    electricidad: 'electricidad',
    limpieza: 'limpieza',
    construccion: 'construccion',
    pintura: 'pintura',
    carpinteria: 'carpinteria',
    jardineria: 'jardineria',
    electrodomesticos: 'electrodomesticos',
  };

  return categoryMap[normalized] ?? null;
};

export default function SearchScreen() {
  const navigate = useNavigate();
  const { currentUser, role } = useApp();
  const [tab, setTab] = useState<'explore' | 'post'>('explore');
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [searchText, setSearchText] = useState('');

  // Estados específicos para la publicación y Base de Datos
  const [postCat, setPostCat] = useState<number | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [categoriasDb, setCategoriasDb] = useState<CategoriaDB[]>([]);
  const [cargandoCats, setCargandoCats] = useState(true);
  // const [postDate, setPostDate] = useState('');
  const [empleados, setEmpleados] = useState<Worker[]>([]);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(true);
  const [errorEmpleados, setErrorEmpleados] = useState('');


  

  // Cargar categorías de la Base de Datos al abrir la pantalla
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const data = await obtenerCategoriasDB();
        setCategoriasDb(data);
      } catch (error) {
        toast.error('Error al cargar las categorías desde la base de datos');
      } finally {
        setCargandoCats(false);
      }
    };
    fetchCategorias();
  }, []);

  // Cargar empleado
 useEffect(() => {
  const obtenerEmpleados = async () => {
    try {
      setCargandoEmpleados(true);
      setErrorEmpleados('');

      const respuesta = await fetch(
        'http://localhost:3000/api/empleados'
      );

      if (!respuesta.ok) {
        throw new Error('No se pudieron obtener los trabajadores');
      }

      const datos = await respuesta.json();

      const listaEmpleados: EmpleadoDB[] = Array.isArray(datos)
        ? datos
        : datos.empleados || [];

      console.log('Empleados recibidos:', listaEmpleados);

      const trabajadoresAdaptados: Worker[] = listaEmpleados.map(
        (empleado) => ({
          id: String(empleado.id_empleado),
          name: empleado.nombre_E,
          email: empleado.correo || '',
          phone: empleado.celular || '',
          role: 'worker',
          avatarUrl: empleado.foto || '',
          location: empleado.direccion || 'Dirección no disponible',
          joinedDate: '',
          categories:
            (empleado.categorias ?? [])
              .map((categoria) =>
                normalizeCategory(categoria.id_categoria ?? categoria.nombre)
              )
              .filter(
                (categoria): categoria is ServiceCategory => categoria !== null
              ),
          rating: Number(empleado.calificacion || 0),
          reviewCount: Number(empleado.cantidad_resenas || 0),
          jobCount: Number(empleado.N_trabajos || 0),
          bio:
            empleado.sobre_mi ||
            empleado.titulo ||
            'Sin descripción disponible',
          distanceKm: 0,
          pricePerHour: Number(empleado.precio_hora || 0),
          isAvailable:
            empleado.estado?.toLowerCase() === 'disponible' ||
            empleado.estado?.toLowerCase() === 'activo',
          galleryUrls: [],
          services:
            empleado.servicios?.map(
              (servicio) =>
                servicio.nombre_servicio ||
                servicio.nombre ||
                'Servicio'
            ) || [],
        })
      );

      setEmpleados(trabajadoresAdaptados);
    } catch (error) {
      console.error('Error al cargar trabajadores:', error);

      setErrorEmpleados(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los trabajadores'
      );

      setEmpleados([]);
    } finally {
      setCargandoEmpleados(false);
    }
  };

  obtenerEmpleados();
}, []);

  
  // Configuración de react-hook-form
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PostJobForm>({
    defaultValues: {
      budget: 0 // Valor inicial en Lempiras
    }
  });

  const currentBudget = watch('budget');

  const filteredWorkers = empleados
  .filter((trabajador) => {
    if (selectedCat !== null && !trabajador.categories.includes(selectedCat)) {
      return false;
    }

    if (searchText.trim()) {
      const texto = searchText.toLowerCase().trim();

      const coincideNombre = trabajador.name
        .toLowerCase()
        .includes(texto);

      const coincideServicio = trabajador.services.some((servicio) =>
        servicio.toLowerCase().includes(texto)
      );

      if (!coincideNombre && !coincideServicio) {
        return false;
      }
    }

    return true;
  })
  .sort((a, b) => {
    if (sortBy === 'distance') {
      return a.distanceKm - b.distanceKm;
    }

    if (sortBy === 'rating') {
      return b.rating - a.rating;
    }

    if (sortBy === 'price') {
      return a.pricePerHour - b.pricePerHour;
    }

    return 0;
  });

  // Envío del formulario a la API
  const onSubmit = async (data: PostJobForm) => {
    if (!postCat) {
      toast.error('Completa la categoría del servicio');
      return;
    }

    try {
      setPublicando(true);

      await crearSolicitud({
        fk_cliente: Number(currentUser?.id),
        categoria: postCat,
        titulo: data.title.trim(),
        descripcion: data.description.trim(),
        presupuesto: Number(data.budget),
        direccion: data.address.trim(),
        fecha: data.fecha.trim(), // Aquí está el valor capturado por register
      });

      toast.success('Solicitud publicada');
      reset();
      setPostCat(null);
      setTab('explore');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al publicar');
    } finally {
      setPublicando(false);
    }
  };

  const suggestedForPost = postCat
    ? empleados
        .filter((trabajador) => {
          const categoriaSeleccionada = categoriasDb.find(
            (cat) => cat.id_categoria === postCat
          );
          const categoriaWorker = normalizeCategory(
            categoriaSeleccionada?.id_categoria ?? categoriaSeleccionada?.nombre
          );

          return categoriaWorker
            ? trabajador.categories.includes(categoriaWorker)
            : false;
        })
        .slice(0, 3)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card px-5 pt-10 pb-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground mb-3">Buscar servicios</h1>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1">
          {(['explore', 'post'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {
                key === 'explore'
                  ? 'Explorar servicios'
                  : role === 'client'
                    ? 'Publicar servicio'
                    : 'Publicar trabajo'
              }
            </button>
          ))}
        </div>
      </div>

      {tab === 'explore' ? (
        <div className="flex-1 overflow-y-auto">
          {/* Search + Filter */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar trabajador o servicio..."
                  className="w-full bg-input-background rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>
              <button className="w-10 h-10 bg-[#1A56DB] rounded-xl flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Sort chips */}
            <div className="flex gap-2 mt-3">
              {([['rating', 'Mejor valorados'], ['distance', 'Más cercanos'], ['price', 'Menor precio']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key as SortBy)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
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

          {/* Categories */}
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">Categorías</p>
              {selectedCat && (
                <button onClick={() => setSelectedCat(null)} className="flex items-center gap-1 text-xs text-[#1A56DB]">
                  <X className="w-3 h-3" /> Limpiar filtro
                </button>
              )}
            </div>
            {/* Seguimos usando el Grid para la pantalla de explorar por ahora */}
            <ServiceCategoryGrid
              onSelect={(cat) => setSelectedCat((current) => (current === cat ? null : cat))}
              selected={selectedCat}
            />
          </div>

        {/* Results */}
        <div className="px-5 pb-6">

          {cargandoEmpleados && (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">
                Cargando trabajadores...
              </p>
            </div>
          )}

          {errorEmpleados && !cargandoEmpleados && (
            <div className="text-center py-10">
              <p className="text-sm text-red-500">
                {errorEmpleados}
              </p>
            </div>
          )}

          {!cargandoEmpleados && !errorEmpleados && (
            <>
              <p className="text-sm font-semibold text-foreground mb-3">
                {filteredWorkers.length} trabajadores encontrados
              </p>

              <div className="flex flex-col gap-3">
                {filteredWorkers.map((w) => (
                  <div
                    key={w.id}
                    onClick={() => navigate(`/home/worker/${w.id}`)}
                    className="cursor-pointer"
                  >
                    <WorkerCard
                      worker={w}
                      variant="full"
                    />
                  </div>
                ))}

                {filteredWorkers.length === 0 && (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground text-sm">
                      No se encontraron trabajadores
                    </p>

                    <button
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
              </div>
            </>
          )}

        </div>
        </div>
        ) : (
          
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            
            {/* LISTA DE CATEGORÍAS DESDE LA BASE DE DATOS */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Categoría del servicio *</label>
              
              {cargandoCats ? (
                <p className="text-xs text-muted-foreground">Cargando categorías...</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {categoriasDb.map((cat) => {
                    const isSelected = postCat === cat.id_categoria;

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

                    const icono =
                      iconosCategorias[cat.nombre.toLowerCase()] || '🛠️';

                    return (
                      <motion.button
                        type="button"
                        key={cat.id_categoria}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPostCat(isSelected ? null : cat.id_categoria)}
                        className={`relative rounded-2xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-[#1A56DB] bg-[#EFF4FF] shadow-md shadow-[#1A56DB]/10'
                            : 'border-border bg-card hover:border-[#1A56DB]/40'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#1A56DB] text-white text-[10px] flex items-center justify-center">
                            ✓
                          </div>
                        )}

                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-sm font-semibold capitalize ${
                              isSelected ? 'text-[#1A56DB]' : 'text-foreground'
                            }`}
                          >
                            {cat.nombre}
                          </span>

                          <span className="text-base">
                            {icono}
                          </span>
                        </div>

                        <p className="text-[11px] leading-4 text-muted-foreground">
                          {cat.subCatgeoria}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Título de la solicitud *</label>
              <input
                {...register('title', { required: 'El título es obligatorio' })}
                placeholder="Ej: Reparación de fuga en baño"
                className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Descripción</label>
              <textarea
                {...register('description')}
                placeholder="Describe lo que necesitas con el mayor detalle posible..."
                rows={3}
                className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30 resize-none"
              />
            </div>

           <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-foreground">Presupuesto</label>
                {/* Cambiamos el símbolo a L (Lempiras) */}
                <span className="text-sm font-bold text-[#1A56DB]">L {Number(currentBudget).toLocaleString()}</span>
              </div>
              
              {/* Ajustamos los rangos para Lempiras */}
              <input
                type="range"
                min={500}
                max={5000}
                step={500}
                {...register('budget')}
                className="w-full accent-[#1A56DB]"
              />
              
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>L 0</span><span>L 5000</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...register('address', { required: 'La dirección es obligatoria' })}
                  placeholder="Tu dirección"
                  className="w-full bg-input-background rounded-xl pl-9 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>
              {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
            </div>
            
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Fecha para realizar el trabajo
              </label>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

                <input
                  type="date"
                  {...register('fecha', { required: 'La fecha es obligatoria' })}
                  className="w-full bg-input-background rounded-xl pl-9 pr-10 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />

              </div>
            </div>
            

            <motion.button
              whileTap={{ scale: publicando ? 1 : 0.97 }}
              type="submit"
              disabled={publicando || cargandoCats}
              className="w-full bg-[#1A56DB] text-white rounded-xl py-3.5 font-semibold shadow-lg shadow-[#1A56DB]/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {role === 'client' ? 'Publicar servicio' : 'Publicar trabajo'}
            </motion.button>

            {suggestedForPost.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-foreground mb-3">Trabajadores sugeridos</p>
                <div className="flex flex-col gap-3">
                  {suggestedForPost.map((w) => (
                    <WorkerCard key={w.id} worker={w} variant="full" />
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      )}

    </div>
  );
}