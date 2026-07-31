import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  User,
  X,
  AlertTriangle,
  Briefcase,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type EstadoServicio =
  | 'Asignado'
  | 'En proceso'
  | 'Completado'
  | 'Cancelado';

interface ServicioGestion {
  id_servicio: number;
  fk_cliente: number;
  fk_empleado: number | null;
  titulo: string;
  categoria: string;
  descripcion: string;
  direccion: string;
  presupuesto: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: EstadoServicio;
  nombre_cliente: string;
  nombre_empleado: string;
  tiene_resena?: boolean;
}

interface ServicioApi {
  id_servicio?: number | string;
  fk_cliente?: number | string;
  fk_empleado?: number | string | null;
  titulo?: string | null;
  nombre_categoria?: string | null;
  categoria?: string | null;
  descripcion?: string | null;
  direccion?: string | null;
  presupuesto?: number | string | null;
  fecha?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  estado?: string | null;
  nombre_cliente?: string | null;
  nombre_empleado?: string | null;
  nombre_E?: string | null;
}
const MOTIVOS_TRABAJADOR = [
  'Emergencia personal',
  'Problema de horario',
  'No puedo realizar el trabajo',
  'Problema de transporte',
  'Otro motivo',
];

const MOTIVOS_CLIENTE = [
  'El servicio ya no es necesario',
  'Problema de horario',
  'No se llegó a un acuerdo',
  'Contraté otro servicio',
  'Otro motivo',
];

function formatearFecha(fecha: string): string {
  if (!fecha) return 'Fecha no disponible';

  const fechaLimpia = fecha.includes('T') ? fecha.split('T')[0] : fecha;
  const [anio, mes, dia] = fechaLimpia.split('-').map(Number);

  if (!anio || !mes || !dia) return fecha;

  return new Date(anio, mes - 1, dia).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatearHora(hora: string): string {
  if (!hora) return 'No especificada';

  const [horas, minutos] = hora.split(':').map(Number);

  if (Number.isNaN(horas) || Number.isNaN(minutos)) return hora;

  const fecha = new Date();
  fecha.setHours(horas, minutos, 0, 0);

  return new Intl.DateTimeFormat('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
}

function normalizarEstado(estado?: string | null): EstadoServicio {
  const valor = String(estado ?? '')
    .trim()
    .toLowerCase()
    .replace('_', ' ');

  if (valor === 'en proceso') return 'En proceso';
  if (valor === 'completado' || valor === 'completada') return 'Completado';
  if (valor === 'cancelado' || valor === 'cancelada') return 'Cancelado';

  return 'Asignado';
}

function formatearPrecio(precio: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
  }).format(precio);
}

export default function ServiceManagementScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { idServicio } = useParams();
  const { role } = useApp();

  const esTrabajador = role === 'worker';
  const servicioId = Number(idServicio);
  const pagoCompletado = location.state?.paymentCompleted === true;
  const [pagoPersistido, setPagoPersistido] = useState(false);

  const [servicio, setServicio] = useState<ServicioGestion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [canceladoPor, setCanceladoPor] = useState<
    'cliente' | 'empleado' | null
  >(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  useEffect(() => {
    if (Number.isInteger(servicioId) && servicioId > 0) {
      const pago = localStorage.getItem(`servicio_pago_${servicioId}`) === 'true';
      setPagoPersistido(pago);
    }
  }, [servicioId]);

  useEffect(() => {
    if (pagoCompletado && Number.isInteger(servicioId) && servicioId > 0) {
      localStorage.setItem(`servicio_pago_${servicioId}`, 'true');
      setPagoPersistido(true);
    }
  }, [pagoCompletado, servicioId]);

  useEffect(() => {
    async function cargarServicio() {
      if (!Number.isInteger(servicioId) || servicioId <= 0) {
        setError('El servicio solicitado no es válido.');
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const respuesta = await fetch(
          `http://localhost:3000/api/servicios/${servicioId}`
        );

        const datos = (await respuesta.json()) as ServicioApi & {
          mensaje?: string;
          detalle?: string;
        };

        if (!respuesta.ok) {
          throw new Error(
            datos.detalle ||
              datos.mensaje ||
              'No se pudo cargar el servicio.'
          );
        }

        setServicio({
          id_servicio: Number(datos.id_servicio ?? servicioId),
          fk_cliente: Number(datos.fk_cliente ?? 0),
          fk_empleado:
            datos.fk_empleado === null || datos.fk_empleado === undefined
              ? null
              : Number(datos.fk_empleado),
          titulo:
            datos.titulo?.trim() ||
            datos.nombre_categoria?.trim() ||
            'Solicitud de servicio',
          categoria:
            datos.nombre_categoria?.trim() ||
            datos.categoria?.trim() ||
            'Sin categoría',
          descripcion:
            datos.descripcion?.trim() || 'Sin descripción disponible.',
          direccion:
            datos.direccion?.trim() || 'Dirección no disponible',
          presupuesto: Number(datos.presupuesto ?? 0),
          fecha: datos.fecha || '',
          hora_inicio: datos.hora_inicio || '',
          hora_fin: datos.hora_fin || '',
          estado: normalizarEstado(datos.estado),
          nombre_cliente:
            datos.nombre_cliente?.trim() || 'Cliente',
          nombre_empleado:
            datos.nombre_empleado?.trim() ||
            datos.nombre_E?.trim() ||
            'Trabajador asignado',
          tiene_resena:
            Number(datos.total_resenas ?? 0) > 0,
        });
      } catch (errorDesconocido) {
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se pudo cargar el servicio.'
        );
      } finally {
        setCargando(false);
      }
    }

    cargarServicio();
  }, [servicioId]);

  const motivosDisponibles = esTrabajador
    ? MOTIVOS_TRABAJADOR
    : MOTIVOS_CLIENTE;

  const motivoFinal = useMemo(() => {
    if (motivoSeleccionado === 'Otro motivo') {
      return motivoPersonalizado.trim();
    }

    return motivoSeleccionado.trim();
  }, [motivoSeleccionado, motivoPersonalizado]);

  const puedeCancelar = motivoFinal.length >= 5;

  async function cambiarEstado(nuevoEstado: EstadoServicio) {
    if (!servicio || guardando) return;

    try {
      setGuardando(true);
      setError('');

      const respuesta = await fetch(
        `http://localhost:3000/api/servicios/${servicio.id_servicio}/estado`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            estado: nuevoEstado,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo actualizar el estado.'
        );
      }

      setServicio((actual) =>
        actual ? { ...actual, estado: nuevoEstado } : actual
      );
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo actualizar el estado.'
      );
    } finally {
      setGuardando(false);
    }
  }

  function abrirModalCancelacion() {
    setMotivoSeleccionado('');
    setMotivoPersonalizado('');
    setMostrarModal(true);
  }

  async function confirmarCancelacion() {
    if (!servicio || !puedeCancelar || guardando) return;

    const responsable = esTrabajador ? 'empleado' : 'cliente';

    try {
      setGuardando(true);
      setError('');

      const respuesta = await fetch(
        `http://localhost:3000/api/servicios/${servicio.id_servicio}/estado`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            estado: 'Cancelado',
            motivo_cancelacion: motivoFinal,
            cancelado_por: responsable,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo cancelar el servicio.'
        );
      }

      setServicio((actual) =>
        actual ? { ...actual, estado: 'Cancelado' } : actual
      );

      setCanceladoPor(responsable);
      setMostrarModal(false);
      setMostrarConfirmacion(true);
    } catch (errorDesconocido) {
      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo cancelar el servicio.'
      );
    } finally {
      setGuardando(false);
    }
  }

 function abrirChat() {
  if (!servicio) return;

  if (esTrabajador) {
    if (
      !servicio.fk_cliente ||
      Number(servicio.fk_cliente) <= 0
    ) {
      setError('No se encontró el cliente.');
      window.setTimeout(() => setError(''), 4000);
      return;
    }

    navigate(
      `/home/chat/${servicio.fk_cliente}`
    );
    return;
  }

  if (
    !servicio.fk_empleado ||
    Number(servicio.fk_empleado) <= 0
  ) {
    setError('No hay un trabajador asignado.');
    window.setTimeout(() => setError(''), 4000);
    return;
  }

  navigate(
    `/home/chat/${servicio.fk_empleado}`
  );
}

  if (cargando) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  if (error && !servicio) {
    return (
      <div className="min-h-full bg-background px-5 py-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 font-semibold text-[#1A56DB]"
        >
          ← Volver
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!servicio) return null;

  const estadoClase = {
    Asignado: 'bg-blue-100 text-blue-700',
    'En proceso': 'bg-purple-100 text-purple-700',
    Completado: 'bg-green-100 text-green-700',
    Cancelado: 'bg-red-100 text-red-700',
  }[servicio.estado];

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Encabezado */}
      <header className="border-b border-border bg-card px-4 pb-4 pt-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">
              {esTrabajador
                ? 'Detalle del trabajo NUEVO'
                : 'Detalle de la contratación'}
            </h1>

            <p className="text-xs text-muted-foreground">
              Servicio #{servicio.id_servicio}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${estadoClase}`}
          >
            {servicio.estado}
          </span>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Título */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <Briefcase className="h-5 w-5 text-[#1A56DB]" />
            </div>

            <div>
              <h2 className="font-bold text-foreground">
                {servicio.titulo}
              </h2>

              <span className="mt-1 inline-flex rounded-full bg-secondary px-2 py-1 text-[11px] font-medium">
                {servicio.categoria}
              </span>
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {servicio.descripcion}
          </p>
        </section>

        {/* Progreso */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-bold text-foreground">
            Progreso del servicio
          </h3>

          <div className="flex items-center">
            {['Asignado', 'En proceso', 'Completado'].map(
              (estado, index) => {
                const estados = [
                  'Asignado',
                  'En proceso',
                  'Completado',
                ];

                const posicionActual = estados.indexOf(
                  servicio.estado,
                );

                const activo =
                  servicio.estado !== 'Cancelado' &&
                  index <= posicionActual;

                return (
                  <div
                    key={estado}
                    className="flex flex-1 items-center last:flex-none"
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          activo
                            ? 'bg-[#1A56DB] text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {activo ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <span className="text-xs">{index + 1}</span>
                        )}
                      </div>

                      <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">
                        {estado}
                      </span>
                    </div>

                    {index < 2 && (
                      <div
                        className={`mx-2 h-1 flex-1 rounded ${
                          activo && index < posicionActual
                            ? 'bg-[#1A56DB]'
                            : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              },
            )}
          </div>

          {servicio.estado === 'Cancelado' && (
            <div className="mt-4 rounded-xl bg-red-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" />

                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Servicio cancelado
                  </p>

                  <p className="mt-1 text-xs text-red-600">
                    Cancelado por el{' '}
                    {canceladoPor === 'empleado'
                      ? 'trabajador'
                      : 'cliente'}
                    .
                  </p>

                  <p className="mt-2 text-xs text-red-700">
                    <strong>Motivo:</strong> {motivoFinal}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Fecha, hora y dirección */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">
            Información del servicio
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-[#1A56DB]" />

              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-sm font-medium text-foreground">
                  {formatearFecha(servicio.fecha)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 text-[#1A56DB]" />

              <div>
                <p className="text-xs text-muted-foreground">Horario</p>
                <p className="text-sm font-medium text-foreground">
                  {formatearHora(servicio.hora_inicio)} –{' '}
                  {formatearHora(servicio.hora_fin)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-[#1A56DB]" />

              <div>
                <p className="text-xs text-muted-foreground">
                  Dirección
                </p>
                <p className="text-sm font-medium text-foreground">
                  {servicio.direccion}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Persona relacionada */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">
            {esTrabajador
              ? 'Información del cliente'
              : 'Trabajador contratado'}
          </h3>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {esTrabajador
                  ? servicio.nombre_cliente
                  : servicio.nombre_empleado}
              </p>

              <p className="text-xs text-muted-foreground">
                {esTrabajador ? 'Cliente' : 'Trabajador asignado'}
              </p>
            </div>

            <button
              type="button"
              onClick={abrirChat}
              aria-label="Abrir chat"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#1A56DB]"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>
        </section>

        {/* Presupuesto */}
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            Presupuesto acordado
          </p>

          <p className="mt-1 text-2xl font-bold text-[#1A56DB]">
            {formatearPrecio(servicio.presupuesto)}
          </p>
        </section>

        
              {/* Acciones del trabajador */}
      {esTrabajador &&
        servicio.estado !== 'Cancelado' &&
        servicio.estado !== 'Completado' && (
          <section className="space-y-3 pb-4">
            {servicio.estado === 'Asignado' && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={guardando}
                onClick={() => cambiarEstado('En proceso')}
                className="w-full rounded-xl bg-[#1A56DB] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Iniciar trabajo'}
              </motion.button>
            )}

            {servicio.estado === 'En proceso' && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                disabled={guardando}
                onClick={() => cambiarEstado('Completado')}
                className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {guardando
                  ? 'Guardando...'
                  : 'Marcar como completado'}
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={guardando}
              onClick={abrirModalCancelacion}
              className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 disabled:opacity-50"
            >
              Cancelar trabajo
            </motion.button>
          </section>
        )}

      {/* Acciones del cliente */}
      {!esTrabajador &&
        servicio.estado !== 'Cancelado' &&
        servicio.estado !== 'Completado' && (
          <section className="space-y-3 pb-4">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-700">
                Estado controlado por el trabajador
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-600">
                Cuando el trabajador inicie o complete el servicio,
                el progreso se actualizará aquí.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() =>
                navigate('/home/payment', {
                  state: {
                    returnTo: `/home/contratacion/${servicio.id_servicio}`,
                    serviceId: servicio.id_servicio,
                    serviceTitle: servicio.titulo,
                    serviceTotal: servicio.presupuesto,
                  },
                })
              }
              className="w-full rounded-xl bg-[#1A56DB] px-4 py-3 text-sm font-bold text-white"
            >
              Proceder al pago
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              disabled={guardando}
              onClick={abrirModalCancelacion}
              className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 disabled:opacity-50"
            >
              Cancelar contratación
            </motion.button>
          </section>
        )}

      {/* Servicio completado / pago realizado */}
      {((servicio.estado === 'Completado' || pagoCompletado) && !esTrabajador) && (
        <section className="space-y-3 pb-4">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
            <CheckCircle className="mx-auto h-8 w-8 text-green-600" />

            <p className="mt-2 text-sm font-bold text-green-700">
              {pagoCompletado
                ? 'Pago realizado correctamente'
                : 'Servicio completado'}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: pagoPersistido ? 1 : 0.98 }}
            type="button"
            disabled={pagoPersistido}
            onClick={() =>
              !pagoPersistido &&
              navigate('/home/payment', {
                state: {
                  returnTo: `/home/contratacion/${servicio.id_servicio}`,
                  serviceId: servicio.id_servicio,
                  serviceTitle: servicio.titulo,
                  serviceTotal: servicio.presupuesto,
                },
              })
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A56DB] px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg">💳</span>
            {pagoPersistido ? 'Pago realizado' : 'Proceder al pago'}
          </motion.button>

          <motion.button
            whileTap={{ scale: servicio?.tiene_resena ? 1 : 0.97 }}
            type="button"
            disabled={servicio?.tiene_resena}
            onClick={() =>
              servicio?.tiene_resena ||
              navigate(`/home/review/${servicio.id_servicio}`)
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-lg">⭐</span>
            {servicio?.tiene_resena ? 'Servicio calificado' : 'Calificar servicio'}
          </motion.button>
        </section>
      )}
      </main>

      {/* Modal de cancelación */}
      <AnimatePresence>
        {mostrarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/50"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full rounded-t-3xl bg-card p-5"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    {esTrabajador
                      ? 'Cancelar trabajo'
                      : 'Cancelar contratación'}
                  </h2>

                  <p className="mt-1 text-xs text-muted-foreground">
                    La otra persona recibirá una notificación con
                    el motivo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {motivosDisponibles.map((motivo) => (
                  <button
                    type="button"
                    key={motivo}
                    onClick={() => setMotivoSeleccionado(motivo)}
                    className={`w-full rounded-xl border p-3 text-left text-sm ${
                      motivoSeleccionado === motivo
                        ? 'border-[#1A56DB] bg-blue-50 text-[#1A56DB]'
                        : 'border-border bg-card text-foreground'
                    }`}
                  >
                    {motivo}
                  </button>
                ))}
              </div>

              {motivoSeleccionado === 'Otro motivo' && (
                <textarea
                  value={motivoPersonalizado}
                  onChange={(evento) =>
                    setMotivoPersonalizado(evento.target.value)
                  }
                  placeholder="Escribe el motivo de la cancelación..."
                  rows={3}
                  maxLength={250}
                  className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-[#1A56DB]"
                />
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="rounded-xl border border-border px-4 py-3 text-sm font-semibold"
                >
                  Volver
                </button>

                <button
                  type="button"
                  disabled={!puedeCancelar || guardando}
                  onClick={confirmarCancelacion}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {guardando ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmación de notificación */}
      <AnimatePresence>
        {mostrarConfirmacion && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-5 left-4 right-4 z-50 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="mt-0.5 h-5 w-5 text-green-600" />

              <div className="flex-1">
                <p className="text-sm font-bold text-green-700">
                  Cancelación registrada
                </p>

                <p className="mt-1 text-xs text-green-600">
                  El {esTrabajador ? 'cliente' : 'trabajador'} recibirá
                  una notificación con el motivo indicado.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMostrarConfirmacion(false)}
              >
                <X className="h-4 w-4 text-green-700" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}