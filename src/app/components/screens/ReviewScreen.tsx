import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Send } from 'lucide-react';
import { StarRating } from '../shared/StarRating';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';

import {
  crearResena,
  obtenerReservaPorId,
  obtenerReservaPorServicio,
  type ReservaDetalle,
} from '../../services/reservasApi';

export default function ReviewScreen() {
  const { idServicio } = useParams<{ idServicio: string }>();
  const navigate = useNavigate();

  const [reserva, setReserva] = useState<ReservaDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const [overall, setOverall] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [comment, setComment] = useState('');

  const parseRouteId = (value?: string): number | null => {
    if (!value) return null;

    const trimmed = value.trim();
    const numeric = Number(trimmed);

    if (Number.isInteger(numeric) && numeric > 0) {
      return numeric;
    }

    const match = /^b(\d+)$/i.exec(trimmed);

    if (match) {
      const extracted = Number(match[1]);

      if (Number.isInteger(extracted) && extracted > 0) {
        return extracted;
      }
    }

    return null;
  };

  useEffect(() => {
    async function cargarReserva() {
      try {
        setCargando(true);
        setError('');

        const idSolicitado = parseRouteId(idServicio);

        if (!idSolicitado) {
          throw new Error('El identificador del servicio no es válido');
        }

        let reservaEncontrada: ReservaDetalle | null = null;

        try {
          reservaEncontrada = await obtenerReservaPorId(idSolicitado);
        } catch {
          try {
            reservaEncontrada =
              await obtenerReservaPorServicio(idSolicitado);
          } catch {
            reservaEncontrada = null;
          }
        }

        if (!reservaEncontrada) {
          throw new Error(
            'No se encontró la reserva o servicio asociado',
          );
        }

        setReserva(reservaEncontrada);
      } catch (errorDesconocido) {
        console.error(
          'Error al obtener la reserva:',
          errorDesconocido,
        );

        setReserva(null);
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se pudo cargar la información del servicio',
        );
      } finally {
        setCargando(false);
      }
    }

    void cargarReserva();
  }, [idServicio]);

  async function handleSubmit() {
    if (!reserva) {
      toast.error(
        'No se encontró la información de la reserva.',
      );
      return;
    }

    if (overall < 1 || overall > 5) {
      toast.error(
        'Selecciona una calificación general.',
      );
      return;
    }

    if (
      punctuality < 1 ||
      punctuality > 5
    ) {
      toast.error(
        'Selecciona una calificación de puntualidad.',
      );
      return;
    }

    if (
      quality < 1 ||
      quality > 5
    ) {
      toast.error(
        'Selecciona una calificación de calidad.',
      );
      return;
    }

    if (
      communication < 1 ||
      communication > 5
    ) {
      toast.error(
        'Selecciona una calificación de comunicación.',
      );
      return;
    }

    try {
      setEnviando(true);


      await crearResena({
        id_reserva: reserva.id_reserva,
        id_empleado: reserva.id_empleado,
        calificacion_general: overall,
        puntualidad: punctuality || null,
        calidad: quality || null,
        comunicacion: communication || null,
        comentario: comment.trim() || null,
      });


      toast.success(
        'Reseña enviada',
        {
          description:
            `Gracias por calificar a ${
              reserva.nombre_empleado ||
              'este trabajador'
            }.`,
        },
      );

      window.setTimeout(() => {
        navigate(
          `/home/contratacion/${reserva.id_servicio}`,
        );
      }, 800);
    } catch (errorDesconocido) {
      console.error(
        'Error al enviar la reseña:',
        errorDesconocido,
      );

      toast.error(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo enviar la reseña.',
      );
    } finally {
      setEnviando(false);
    }
  }

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

  const formularioValido =
    overall >= 1 &&
    punctuality >= 1 &&
    quality >= 1 &&
    communication >= 1 &&
    !enviando;

  if (cargando) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Cargando servicio...
        </p>
      </div>
    );
  }

  if (error || !reserva) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6">
        <p className="text-center text-sm text-red-500">
          {error ||
            'Reserva no encontrada.'}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 text-sm font-semibold text-[#1A56DB]"
        >
          Regresar
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-border bg-card px-4 pb-4 pt-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Regresar"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-lg font-bold text-foreground">
              Calificar servicio
            </h1>

            <p className="text-xs text-muted-foreground">
              Servicio #{reserva.id_servicio}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <ImageWithFallback
            src={
              reserva.foto_empleado ||
              'https://via.placeholder.com/150'
            }
            alt={
              reserva.nombre_empleado ||
              'Trabajador'
            }
            className="h-14 w-14 rounded-xl object-cover"
          />

          <div>
            <p className="font-semibold text-foreground">
              {reserva.nombre_empleado ||
                'Trabajador'}
            </p>

            <p className="text-xs text-muted-foreground">
              {reserva.descripcion ||
                'Servicio realizado'}
            </p>

            <p className="text-xs text-muted-foreground">
              {reserva.fecha ||
                'Fecha no disponible'}

              {reserva.hora
                ? ` · ${reserva.hora}`
                : ''}
            </p>
          </div>
        </div>

        <div className="mb-8 text-center">
          <p className="mb-4 text-base font-semibold text-foreground">
            ¿Cómo fue tu experiencia?
          </p>

          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(
              (valor) => (
                <motion.button
                  key={valor}
                  type="button"
                  whileHover={{
                    scale: 1.15,
                  }}
                  whileTap={{
                    scale: 0.9,
                  }}
                  onClick={() =>
                    setOverall(valor)
                  }
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-all ${
                      valor <= overall
                        ? 'scale-110 bg-amber-100'
                        : 'bg-muted'
                    }`}
                  >
                    {valor <= overall
                      ? '⭐'
                      : '☆'}
                  </div>

                  <span className="text-[10px] text-muted-foreground">
                    {valor}
                  </span>
                </motion.button>
              ),
            )}
          </div>

          {overall > 0 && (
            <motion.p
              initial={{
                opacity: 0,
                y: 5,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="mt-3 text-sm font-semibold text-amber-600"
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

        <div className="mb-6 flex flex-col gap-4">
          {criteria.map(
            ({
              label,
              value,
              setter,
            }) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {label}
                  </p>

                  <span className="text-xs text-muted-foreground">
                    {value > 0
                      ? `${value}/5`
                      : 'Sin calificar'}
                  </span>
                </div>

                <StarRating
                  value={value}
                  interactive
                  onChange={setter}
                  size="lg"
                />
              </div>
            ),
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="comentario-resena"
            className="mb-2 block text-sm font-semibold text-foreground"
          >
            Comentario
          </label>

          <textarea
            id="comentario-resena"
            value={comment}
            onChange={(evento) =>
              setComment(
                evento.target.value,
              )
            }
            placeholder="Cuéntanos más sobre tu experiencia con este trabajador..."
            rows={4}
            maxLength={300}
            className="w-full resize-none rounded-xl bg-input-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
          />

          <p className="mt-1 text-right text-xs text-muted-foreground">
            {comment.length}/300
          </p>
        </div>

        <motion.button
          whileTap={{
            scale: 0.97,
          }}
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!formularioValido}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A56DB] py-3.5 font-semibold text-white shadow-lg shadow-[#1A56DB]/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />

          {enviando
            ? 'Enviando...'
            : 'Enviar reseña'}
        </motion.button>
      </div>
    </div>
  );
}