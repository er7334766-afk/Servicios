import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';

const API_URL = 'http://localhost:3000';

const MOTIVOS_CLIENTE = [
  'El trabajador no llegó',
  'El trabajo quedó incompleto',
  'El trabajador fue irrespetuoso',
  'El cobro no coincide con lo acordado',
  'El servicio no fue realizado correctamente',
  'Otro motivo',
];

const MOTIVOS_TRABAJADOR = [
  'El cliente no permitió realizar el trabajo',
  'El cliente fue irrespetuoso',
  'La dirección proporcionada era incorrecta',
  'El cliente cambió las condiciones acordadas',
  'No recibí el pago acordado',
  'Otro motivo',
];

interface Reserva {
  id_reserva: number;
  id_servicio: number;
  id_empleado: number;
  descripcion?: string | null;
  fecha?: string | null;
  hora?: string | null;
  nombre_empleado?: string | null;
  foto_empleado?: string | null;
}

interface RespuestaReserva {
  reserva?: Reserva;
  mensaje?: string;
  detalle?: string;
}

interface RespuestaReporte {
  mensaje?: string;
  detalle?: string;
}

async function leerRespuestaJson<T>(
  respuesta: Response,
): Promise<T> {
  const texto = await respuesta.text();

  if (!texto.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new Error(
      `El servidor devolvió una respuesta inválida. Código ${respuesta.status}.`,
    );
  }
}

export default function ServiceReportScreen() {
  const navigate = useNavigate();
  const { idServicio } = useParams();

  const {
    currentUser,
    role,
  } = useApp();

  const esTrabajador =
    currentUser?.role === 'worker' ||
    role === 'worker';

  const [motivo, setMotivo] = useState('');
  const [otroMotivo, setOtroMotivo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [idEmpleadoReportado, setIdEmpleadoReportado] =
    useState<number | null>(null);

  const [cargandoReserva, setCargandoReserva] =
    useState(true);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const motivosDisponibles = esTrabajador
    ? MOTIVOS_TRABAJADOR
    : MOTIVOS_CLIENTE;

  const motivoFinal = useMemo(() => {
    if (motivo === 'Otro motivo') {
      return otroMotivo.trim();
    }

    return motivo.trim();
  }, [motivo, otroMotivo]);

  const idReportante = useMemo(() => {
    const numero = Number(currentUser?.id);

    if (!Number.isInteger(numero) || numero <= 0) {
      return null;
    }

    return numero;
  }, [currentUser?.id]);

  const formularioValido =
    motivoFinal.length >= 5 &&
    descripcion.trim().length >= 20 &&
    Boolean(idReportante) &&
    Boolean(idEmpleadoReportado) &&
    !cargandoReserva &&
    !enviando;

  useEffect(() => {
    async function obtenerReserva() {
      if (!idServicio) {
        setCargandoReserva(false);
        return;
      }

      try {
        setCargandoReserva(true);
        setError('');

        const respuesta = await fetch(
          `${API_URL}/api/reservas/servicio/${idServicio}`,
        );

        const datos =
          await leerRespuestaJson<RespuestaReserva>(
            respuesta,
          );

        if (!respuesta.ok) {
          throw new Error(
            datos.detalle ||
              datos.mensaje ||
              'No se encontró la reserva del servicio.',
          );
        }

        const idEmpleado = Number(
          datos.reserva?.id_empleado,
        );

        if (
          !Number.isInteger(idEmpleado) ||
          idEmpleado <= 0
        ) {
          throw new Error(
            'La reserva no tiene un trabajador asignado.',
          );
        }

        setIdEmpleadoReportado(idEmpleado);
      } catch (errorDesconocido) {
        setIdEmpleadoReportado(null);

        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se pudo obtener la reserva del servicio.',
        );
      } finally {
        setCargandoReserva(false);
      }
    }

    void obtenerReserva();
  }, [idServicio]);

  async function enviarReporte() {
    if (!idServicio) {
      setError(
        'No se recibió el identificador del servicio.',
      );
      return;
    }

    if (!currentUser) {
      setError(
        'No hay una sesión activa. Inicia sesión nuevamente.',
      );
      return;
    }

    if (!idReportante) {
      setError(
        'El usuario actual no tiene un identificador válido.',
      );
      return;
    }

    if (!idEmpleadoReportado) {
      setError(
        'No se encontró el trabajador relacionado con este servicio.',
      );
      return;
    }

    if (motivoFinal.length < 5) {
      setError(
        'Selecciona o escribe un motivo válido.',
      );
      return;
    }

    if (descripcion.trim().length < 20) {
      setError(
        'La descripción debe tener al menos 20 caracteres.',
      );
      return;
    }

    try {
      setEnviando(true);
      setError('');

      const respuesta = await fetch(
        `${API_URL}/api/reportes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tipoReporte: 'usuario',
            idReportante,
            tipoReportante: esTrabajador
              ? 'empleado'
              : 'cliente',
            idServicio: Number(idServicio),
            idReportado: idEmpleadoReportado,
            tipoReportado: 'empleado',
            categoria: motivoFinal,
            descripcion: descripcion.trim(),
            fotos: [],
          }),
        },
      );

      const datos =
        await leerRespuestaJson<RespuestaReporte>(
          respuesta,
        );

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo enviar el reporte.',
        );
      }

      setEnviado(true);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo enviar el reporte.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (!idServicio) {
    return (
      <div className="min-h-full bg-background px-5 py-8">
        <p className="text-center text-sm text-red-600">
          No se recibió el identificador del servicio.
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 w-full rounded-xl bg-[#1A56DB] px-4 py-3 font-semibold text-white"
        >
          Regresar
        </button>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-background px-5">
        <div className="w-full rounded-3xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />

          <h1 className="mt-4 text-xl font-bold text-green-700">
            Reporte enviado
          </h1>

          <p className="mt-2 text-sm leading-6 text-green-600">
            Tu reporte fue registrado correctamente y será
            revisado.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                `/home/contratacion/${idServicio}`,
              )
            }
            className="mt-6 w-full rounded-xl bg-[#1A56DB] px-4 py-3 font-bold text-white"
          >
            Volver al servicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border bg-card px-4 pb-4 pt-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="Regresar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-lg font-bold text-foreground">
              Reportar problema
            </h1>

            <p className="text-xs text-muted-foreground">
              Servicio #{idServicio}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />

            <div>
              <p className="text-sm font-bold text-amber-700">
                Reporte sobre el servicio
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-600">
                Describe lo ocurrido con claridad. Este
                reporte estará relacionado con el servicio #
                {idServicio}.
              </p>
            </div>
          </div>
        </section>

        {cargandoReserva && (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              Buscando la reserva y el trabajador asignado...
            </p>
          </section>
        )}

        {!currentUser && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              No hay una sesión activa. Inicia sesión
              nuevamente.
            </p>
          </section>
        )}

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">
            ¿Qué ocurrió?
          </h2>

          <div className="space-y-2">
            {motivosDisponibles.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => {
                  setMotivo(opcion);
                  setError('');
                }}
                className={`w-full rounded-xl border p-4 text-left text-sm font-medium ${
                  motivo === opcion
                    ? 'border-[#1A56DB] bg-blue-50 text-[#1A56DB]'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {opcion}
              </button>
            ))}
          </div>
        </section>

        {motivo === 'Otro motivo' && (
          <section>
            <label
              htmlFor="otro-motivo"
              className="mb-2 block text-sm font-bold text-foreground"
            >
              Especifica el motivo
            </label>

            <input
              id="otro-motivo"
              type="text"
              value={otroMotivo}
              onChange={(evento) => {
                setOtroMotivo(evento.target.value);
                setError('');
              }}
              maxLength={100}
              placeholder="Escribe el motivo..."
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[#1A56DB]"
            />

            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>Mínimo 5 caracteres</span>
              <span>{otroMotivo.length}/100</span>
            </div>
          </section>
        )}

        <section>
          <label
            htmlFor="descripcion"
            className="mb-2 block text-sm font-bold text-foreground"
          >
            Descripción
          </label>

          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(evento) => {
              setDescripcion(evento.target.value);
              setError('');
            }}
            rows={5}
            maxLength={500}
            placeholder="Explica detalladamente qué ocurrió..."
            className="w-full resize-none rounded-xl border border-border bg-card p-4 text-sm outline-none focus:border-[#1A56DB]"
          />

          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Mínimo 20 caracteres</span>
            <span>{descripcion.length}/500</span>
          </div>
        </section>

        <motion.button
          whileTap={{ scale: 0.98 }}
          type="button"
          disabled={!formularioValido}
          onClick={() => void enviarReporte()}
          className="w-full rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cargandoReserva
            ? 'Cargando servicio...'
            : enviando
              ? 'Enviando...'
              : 'Enviar reporte'}
        </motion.button>
      </main>
    </div>
  );
}