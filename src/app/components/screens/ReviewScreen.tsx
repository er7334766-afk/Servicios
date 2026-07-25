// ReviewScreen.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Send } from 'lucide-react';
import { StarRating } from '../shared/StarRating';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';

interface Reserva {
  id_reserva: number;
  id_empleado: number;
  descripcion?: string;
  fecha?: string;
  hora?: string;
  nombre_empleado?: string;
  foto_empleado?: string;
}

export default function ReviewScreen() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const [overall, setOverall] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const obtenerReserva = async () => {
      try {
        setCargando(true);
        setError('');

        const respuesta = await fetch(
          `http://localhost:3000/api/reservas/${bookingId}`
        );

        if (!respuesta.ok) {
          throw new Error('No se pudo obtener la reserva');
        }

        const datos = await respuesta.json();

        console.log('Reserva recibida:', datos);

        setReserva(datos.reserva ?? datos);
      } catch (error) {
        console.error('Error al obtener la reserva:', error);
        setError('No se pudo cargar la información del servicio');
      } finally {
        setCargando(false);
      }
    };

    if (bookingId) {
      obtenerReserva();
    } else {
      setError('No se recibió el identificador de la reserva');
      setCargando(false);
    }
  }, [bookingId]);

  const handleSubmit = async () => {
    if (overall === 0) {
      toast.error('Selecciona una calificación general');
      return;
    }

    if (!reserva) {
      toast.error('No se encontró la información de la reserva');
      return;
    }

    try {
      setEnviando(true);

      const respuesta = await fetch(
        'http://localhost:3000/api/resenas',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_reserva: reserva.id_reserva,
            id_empleado: reserva.id_empleado,
            calificacion_general: overall,
            puntualidad: punctuality,
            calidad: quality,
            comunicacion: communication,
            comentario: comment.trim(),
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || 'No se pudo enviar la reseña');
      }

      toast.success('Reseña enviada', {
        description: `Gracias por calificar a ${
          reserva.nombre_empleado || 'este trabajador'
        }`,
      });

      setTimeout(() => navigate('/home'), 800);
    } catch (error) {
      console.error('Error al enviar la reseña:', error);

      toast.error(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la reseña'
      );
    } finally {
      setEnviando(false);
    }
  };

  const criteria = [
    {
      label: 'Puntualidad',
      value: punctuality,
      setter: setPunctuality,
    },
    {
      label: 'Calidad del trabajo',
      value: quality,
      setter: setQuality,
    },
    {
      label: 'Comunicación',
      value: communication,
      setter: setCommunication,
    },
  ];

  if (cargando) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Cargando servicio...
        </p>
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center px-6">
        <p className="text-sm text-red-500 text-center">
          {error || 'Reserva no encontrada'}
        </p>

        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-sm font-semibold text-[#1A56DB]"
        >
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="bg-card px-4 pt-10 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-bold text-foreground">
            Calificar servicio
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 mb-6">
          <ImageWithFallback
            src={
              reserva.foto_empleado ||
              'https://via.placeholder.com/150'
            }
            alt={reserva.nombre_empleado || 'Trabajador'}
            className="w-14 h-14 rounded-xl object-cover"
          />

          <div>
            <p className="font-semibold text-foreground">
              {reserva.nombre_empleado || 'Trabajador'}
            </p>

            <p className="text-xs text-muted-foreground">
              {reserva.descripcion || 'Servicio realizado'}
            </p>

            <p className="text-xs text-muted-foreground">
              {reserva.fecha || 'Fecha no disponible'}
              {reserva.hora ? ` · ${reserva.hora}` : ''}
            </p>
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-base font-semibold text-foreground mb-4">
            ¿Cómo fue tu experiencia?
          </p>

          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map((valor) => (
              <motion.button
                key={valor}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOverall(valor)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${
                    valor <= overall
                      ? 'bg-amber-100 scale-110'
                      : 'bg-muted'
                  }`}
                >
                  {valor <= overall ? '⭐' : '☆'}
                </div>

                <span className="text-[10px] text-muted-foreground">
                  {valor}
                </span>
              </motion.button>
            ))}
          </div>

          {overall > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm font-semibold text-amber-600 mt-3"
            >
              {
                [
                  '',
                  'Malo',
                  'Regular',
                  'Bueno',
                  'Muy bueno',
                  'Excelente',
                ][overall]
              }
            </motion.p>
          )}
        </div>

        <div className="flex flex-col gap-4 mb-6">
          {criteria.map(({ label, value, setter }) => (
            <div
              key={label}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">
                  {label}
                </p>

                <span className="text-xs text-muted-foreground">
                  {value > 0 ? `${value}/5` : 'Sin calificar'}
                </span>
              </div>

              <StarRating
                value={value}
                interactive
                onChange={setter}
                size="lg"
              />
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Comentario
          </label>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Cuéntanos más sobre tu experiencia con este trabajador..."
            rows={4}
            maxLength={300}
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30 resize-none"
          />

          <p className="text-xs text-muted-foreground text-right mt-1">
            {comment.length}/300
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
          disabled={enviando}
          className="w-full bg-[#1A56DB] text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#1A56DB]/30 mb-6 disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
          {enviando ? 'Enviando...' : 'Enviar reseña'}
        </motion.button>
      </div>
    </div>
  );
}