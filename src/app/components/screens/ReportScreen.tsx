import { useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Upload, X, AlertTriangle, Send } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { id: 'behavior',    label: 'Conducta inapropiada',   color: '#DC2626', bg: '#FEF2F2' },
  { id: 'quality',     label: 'Mala calidad del trabajo', color: '#D97706', bg: '#FFFBEB' },
  { id: 'no_show',     label: 'No se presentó',          color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'payment',     label: 'Problema de pago',        color: '#1A56DB', bg: '#EFF4FF' },
  { id: 'other',       label: 'Otro motivo',             color: '#475569', bg: '#F1F5F9' },
];

export default function ReportScreen() {
  const navigate = useNavigate();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = () => {
    if (!selectedCat) {
      toast.error('Selecciona una categoría');
      return;
    }
    if (description.length < 20) {
      toast.error('La descripción debe tener al menos 20 caracteres');
      return;
    }
    toast.success('Reporte enviado', {
      description: 'Nuestro equipo revisará tu caso en menos de 48 horas',
    });
    setTimeout(() => navigate(-1), 1000);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="bg-card px-4 pt-10 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Reportar problema</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Warning banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Los reportes falsos pueden resultar en la suspensión de tu cuenta. Asegúrate de que la información sea veraz.
          </p>
        </div>

        {/* Category selection */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-3 block">Categoría del problema *</label>
          <div className="flex flex-col gap-2">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedCat(cat.id)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                  selectedCat === cat.id
                    ? 'border-[#1A56DB] bg-secondary'
                    : 'border-border bg-card'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cat.bg }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <span className="text-sm font-medium text-foreground">{cat.label}</span>
                {selectedCat === cat.id && (
                  <div className="ml-auto w-5 h-5 bg-[#1A56DB] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">Descripción *</label>
            <span className={`text-xs ${description.length >= 20 ? 'text-green-600' : 'text-muted-foreground'}`}>
              {description.length}/500
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="Describe con detalle lo que ocurrió, incluyendo fecha, hora y cualquier información relevante..."
            rows={5}
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30 resize-none"
          />
          {description.length > 0 && description.length < 20 && (
            <p className="text-xs text-red-500 mt-1">Mínimo 20 caracteres (faltan {20 - description.length})</p>
          )}
        </div>

        {/* Photo evidence */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-2 block">Evidencia fotográfica (opcional)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          {photos.length < 4 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-[#1A56DB]/40 rounded-2xl p-6 flex flex-col items-center gap-2 bg-secondary/50"
            >
              <Upload className="w-6 h-6 text-[#1A56DB]" />
              <p className="text-sm text-[#1A56DB] font-medium">Agregar fotos</p>
              <p className="text-xs text-muted-foreground">Máximo 4 fotos · JPG, PNG</p>
            </motion.button>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                  <img src={src} alt={`Evidencia ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          className="w-full bg-red-600 text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 mb-6"
        >
          <Send className="w-4 h-4" />
          Enviar reporte
        </motion.button>
      </div>
    </div>
  );
}
