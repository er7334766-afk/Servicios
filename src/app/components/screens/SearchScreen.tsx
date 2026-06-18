import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, SlidersHorizontal, MapPin, Calendar, X } from 'lucide-react';
import { WorkerCard } from '../shared/WorkerCard';
import { ServiceCategoryGrid } from '../shared/ServiceCategoryGrid';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { MOCK_WORKERS, MOCK_JOB_POSTS, SERVICE_CATEGORIES } from '../../data/mockData';
import type { ServiceCategory } from '../../types';
import { toast } from 'sonner';

type SortBy = 'distance' | 'rating' | 'price';

export default function SearchScreen() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'explore' | 'post'>('explore');
  const [selectedCat, setSelectedCat] = useState<ServiceCategory | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [searchText, setSearchText] = useState('');

  // Post job form
  const [postCat, setPostCat] = useState<ServiceCategory | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postBudget, setPostBudget] = useState(800);
  const [postAddress, setPostAddress] = useState('');

  const filteredWorkers = MOCK_WORKERS
    .filter((w) => {
      if (selectedCat && !w.categories.includes(selectedCat)) return false;
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

  const handlePost = () => {
    if (!postTitle || !postCat) {
      toast.error('Completa título y categoría');
      return;
    }
    toast.success('Solicitud publicada', { description: 'Los trabajadores podrán ver tu solicitud' });
    setPostTitle('');
    setPostDesc('');
    setPostCat(null);
  };

  const suggestedForPost = postCat
    ? MOCK_WORKERS.filter((w) => w.categories.includes(postCat)).slice(0, 3)
    : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card px-5 pt-10 pb-4 border-b border-border">
        <h1 className="text-lg font-bold text-foreground mb-3">Buscar servicios</h1>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1">
          {([['explore', 'Explorar servicios'], ['post', 'Publicar trabajo']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {label}
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
                  onClick={() => setSortBy(key)}
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
            <ServiceCategoryGrid
              onSelect={(cat) => setSelectedCat(selectedCat === cat ? null : cat)}
              selected={selectedCat}
            />
          </div>

          {/* Results */}
          <div className="px-5 pb-6">
            <p className="text-sm font-semibold text-foreground mb-3">
              {filteredWorkers.length} trabajadores{selectedCat ? ` · ${SERVICE_CATEGORIES.find((c) => c.id === selectedCat)?.label}` : ''}
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
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Categoría del servicio *</label>
              <div className="grid grid-cols-4 gap-2">
                {SERVICE_CATEGORIES.map((cat) => {
                  const isSelected = postCat === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setPostCat(isSelected ? null : cat.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-all ${
                        isSelected ? 'border-[#1A56DB] bg-[#EFF4FF]' : 'border-border bg-card'
                      }`}
                    >
                      <span style={{ color: cat.color }}>{cat.label.split('/')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Título de la solicitud *</label>
              <input
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Ej: Reparación de fuga en baño"
                className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Descripción</label>
              <textarea
                value={postDesc}
                onChange={(e) => setPostDesc(e.target.value)}
                placeholder="Describe lo que necesitas con el mayor detalle posible..."
                rows={3}
                className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-foreground">Presupuesto</label>
                <span className="text-sm font-bold text-[#1A56DB]">${postBudget.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min={200}
                max={10000}
                step={100}
                value={postBudget}
                onChange={(e) => setPostBudget(Number(e.target.value))}
                className="w-full accent-[#1A56DB]"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$200</span><span>$10,000</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={postAddress}
                  onChange={(e) => setPostAddress(e.target.value)}
                  placeholder="Tu dirección"
                  className="w-full bg-input-background rounded-xl pl-9 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handlePost}
              className="w-full bg-[#1A56DB] text-white rounded-xl py-3.5 font-semibold shadow-lg shadow-[#1A56DB]/30"
            >
              Publicar solicitud
            </motion.button>

            {suggestedForPost.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-3">Trabajadores sugeridos</p>
                <div className="flex flex-col gap-3">
                  {suggestedForPost.map((w) => (
                    <WorkerCard key={w.id} worker={w} variant="full" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
