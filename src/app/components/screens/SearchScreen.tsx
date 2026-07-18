import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, MapPin, Calendar, X } from 'lucide-react';
import { useForm } from "react-hook-form";
import { toast } from 'sonner';
import { useApp } from '../../context/AppContext';
import { WorkerCard } from '../shared/WorkerCard';
import { ServiceCategoryGrid } from '../shared/ServiceCategoryGrid';
import { MOCK_WORKERS, SERVICE_CATEGORIES } from '../../data/mockData';

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

export default function SearchScreen() {
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [tab, setTab] = useState<'explore' | 'post'>('explore');
  const [selectedCat, setSelectedCat] = useState<number | string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [searchText, setSearchText] = useState('');

  // Estados específicos para la publicación y Base de Datos
  const [postCat, setPostCat] = useState<number | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [categoriasDb, setCategoriasDb] = useState<CategoriaDB[]>([]);
  const [cargandoCats, setCargandoCats] = useState(true);
  const [postDate, setPostDate] = useState('');



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

  
  // Configuración de react-hook-form
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<PostJobForm>({
    defaultValues: {
      budget: 0 // Valor inicial en Lempiras
    }
  });

  const currentBudget = watch('budget');

  // Filtro de trabajadores (Usa MOCK por ahora para explorar)
  const filteredWorkers = MOCK_WORKERS
    .filter((w) => {
      if (selectedCat && !w.categories.includes(String(selectedCat) as any)) return false;
      if (searchText && !w.name.toLowerCase().includes(searchText.toLowerCase()) &&
          !w.services.some((s) => s.toLowerCase().includes(searchText.toLowerCase()))) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price') return a.pricePerHour - b.pricePerHour;
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
  ? MOCK_WORKERS.filter((w) => w.categories.includes(String(postCat) as any)).slice(0, 3)
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
              {key === 'explore' ? 'Explorar servicios' : 'Publicar trabajo'}
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
              onSelect={(cat: any) => setSelectedCat(selectedCat === cat ? null : cat)}
              selected={selectedCat as any}
            />
          </div>

          {/* Results */}
          <div className="px-5 pb-6">
            <p className="text-sm font-semibold text-foreground mb-3">
              {filteredWorkers.length} trabajadores encontrados
            </p>
            <div className="flex flex-col gap-3">
              {filteredWorkers.map((w) => (
                <WorkerCard key={w.id} worker={w} variant="full" />
              ))}
              {filteredWorkers.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-muted-foreground text-sm">No se encontraron trabajadores</p>
                  <button onClick={() => { setSelectedCat(null); setSearchText(''); }} className="text-[#1A56DB] text-sm mt-1">
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>
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
                <div className="grid grid-cols-2 gap-2">
                  {categoriasDb.map((cat) => {
                    const isSelected = postCat === cat.id_categoria;
                    return (
                      <button
                        type="button"
                        key={cat.id_categoria}
                        onClick={() => setPostCat(isSelected ? null : cat.id_categoria)}
                        className={`flex flex-col items-start p-3 rounded-xl border transition-all ${
                          isSelected ? 'border-[#1A56DB] bg-[#EFF4FF]' : 'border-border bg-card'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${isSelected ? 'text-[#1A56DB]' : 'text-foreground'}`}>
                          {cat.nombre}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {cat.subCatgeoria}
                        </span>
                      </button>
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
              {publicando ? 'Publicando...' : 'Publicar solicitud'}
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