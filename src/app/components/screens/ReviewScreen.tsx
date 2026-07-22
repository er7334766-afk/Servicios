import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Send } from 'lucide-react';
import { StarRating } from '../shared/StarRating';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { MOCK_BOOKINGS, MOCK_WORKERS } from '../../data/mockData';
import { toast } from 'sonner';

export default function ReviewScreen() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const booking = MOCK_BOOKINGS.find((b) => b.id === bookingId) ?? MOCK_BOOKINGS[0];
  const worker = MOCK_WORKERS.find((w) => w.id === booking.workerId) ?? MOCK_WORKERS[0];

  const [overall, setOverall] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (overall === 0) {
      toast.error('Selecciona una calificación general');
      return;
    }
    toast.success('Reseña enviada', {
      description: `Gracias por calificar a ${worker.name}`,
    });
    setTimeout(() => navigate('/home'), 800);
  };

  const criteria = [
    { label: 'Puntualidad', value: punctuality, setter: setPunctuality },
    { label: 'Calidad del trabajo', value: quality, setter: setQuality },
    { label: 'Comunicación', value: communication, setter: setCommunication },
  ];

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
          <h1 className="text-lg font-bold text-foreground">Calificar servicio</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Worker summary */}
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 mb-6">
          <ImageWithFallback
            src={worker.avatarUrl}
            alt={worker.name}
            className="w-14 h-14 rounded-xl object-cover"
          />
          <div>
            <p className="font-semibold text-foreground">{worker.name}</p>
            <p className="text-xs text-muted-foreground">{booking.description}</p>
            <p className="text-xs text-muted-foreground">{booking.date} · {booking.timeSlot}</p>
          </div>
        </div>

        {/* Overall rating */}
        <div className="text-center mb-8">
          <p className="text-base font-semibold text-foreground mb-4">¿Cómo fue tu experiencia?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((v) => (
              <motion.button
                key={v}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOverall(v)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                    v <= overall ? 'bg-amber-100 scale-110' : 'bg-muted'
                  }`}
                >
                  {v <= overall ? '⭐' : '☆'}
                </div>
                <span className="text-[10px] text-muted-foreground">{v}</span>
              </motion.button>
            ))}
          </div>
          {overall > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-semibold text-amber-600 mt-3"
            >
              {['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][overall]}
            </motion.p>
          )}
        </div>

        {/* Sub-criteria */}
        <div className="flex flex-col gap-4 mb-6">
          {criteria.map(({ label, value, setter }) => (
            <div key={label} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <span className="text-xs text-muted-foreground">{value > 0 ? `${value}/5` : 'Sin calificar'}</span>
              </div>
              <StarRating value={value} interactive onChange={setter} size="lg" />
            </div>
          ))}
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-2 block">Comentario</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos más sobre tu experiencia con este trabajador..."
            rows={4}
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30 resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/300</p>
        </div>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          className="w-full bg-[#1A56DB] text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#1A56DB]/30 mb-6"
        >
          <Send className="w-4 h-4" />
          Enviar reseña
        </motion.button>
      </div>
    </div>
  );
}
