import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Flag, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  aceptarNuevoPresupuesto,
  obtenerPostulacionesCompletasEmpleado,
  obtenerServicioPorId,
  postularEmpleadoServicio,
  type ServicioDisponible,
} from '../../services/ServiciosApi';

type ServicioConHorario = ServicioDisponible & {
  hora_inicio?: string | null;
  hora_fin?: string | null;
  estado?: string | null;
  fk_cliente?: number | string | null;
  id_cliente?: number | string | null;
  nombre_cliente?: string | null;
  foto_cliente?: string | null;
};

type UsuarioSesion = {
  id?: number | string | null;
  idEmpleado?: number | string | null;
  id_empleado?: number | string | null;
};

function formatearPresupuesto(
  presupuesto: number | string
): string {
  const valor = Number(presupuesto);

  if (Number.isNaN(valor)) {
    return String(presupuesto);
  }

  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(valor);
}

function formatearFecha(fecha: string): string {
  if (!fecha) {
    return 'Fecha no disponible';
  }

  const fechaNormalizada = fecha.includes('T')
    ? fecha
    : `${fecha}T00:00:00`;

  const objetoFecha = new Date(fechaNormalizada);

  if (Number.isNaN(objetoFecha.getTime())) {
    return fecha;
  }

  return new Intl.DateTimeFormat('es-HN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(objetoFecha);
}

function formatearHora(hora?: string | null): string {
  if (!hora) {
    return 'No especificada';
  }

  const valor = String(hora).trim();

  // Caso 1: viene como fecha ISO:
  // 1970-01-01T09:00:00.000Z
  if (valor.includes('T')) {
    const parteHora = valor.split('T')[1]?.split('.')[0];

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

    const fecha = new Date();

    fecha.setHours(
      horas,
      minutos,
      0,
      0
    );

    return new Intl.DateTimeFormat('es-HN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(fecha);
  }

  // Caso 2: viene como 09:00:00
  const [horas, minutos] = valor
    .split(':')
    .map(Number);

  if (
    Number.isNaN(horas) ||
    Number.isNaN(minutos)
  ) {
    return valor;
  }

  const fecha = new Date();

  fecha.setHours(
    horas,
    minutos,
    0,
    0
  );

  return new Intl.DateTimeFormat('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(fecha);
}

function convertirEstado(estado?: string | null): string {
  const valor = String(estado ?? '')
    .trim()
    .toLowerCase();

  switch (valor) {
    case 'pendiente':
      return 'Pendiente';

    case 'aceptada':
    case 'aceptado':
      return 'Aceptada';

    case 'rechazada':
    case 'rechazado':
      return 'Rechazada';

    case 'en_proceso':
    case 'en proceso':
      return 'En proceso';

    case 'completado':
    case 'completada':
    case 'completed':
      return 'Completado';

    case 'cancelado':
    case 'cancelada':
      return 'Cancelado';

    default:
      return estado
        ? estado.charAt(0).toUpperCase() +
            estado.slice(1)
        : 'No disponible';
  }
}

function obtenerColorEstado(estado?: string | null): string {
  const valor = String(estado ?? '')
    .trim()
    .toLowerCase();

  switch (valor) {
    case 'aceptada':
    case 'aceptado':
    case 'completado':
    case 'completada':
    case 'completed':
      return 'bg-green-100 text-green-700';

    case 'rechazada':
    case 'rechazado':
    case 'cancelado':
    case 'cancelada':
      return 'bg-red-100 text-red-700';

    case 'en_proceso':
    case 'en proceso':
    case 'in progress':
      return 'bg-blue-100 text-blue-700';

    default:
      return 'bg-yellow-100 text-yellow-700';
  }
}

export default function WorkerServiceDetailScreen() {
  const navigate = useNavigate();
  const { idServicio } = useParams();
  const { currentUser } = useApp();

  const [servicio, setServicio] =
    useState<ServicioConHorario | null>(null);

  const [estadoPostulacion, setEstadoPostulacion] =
    useState<string | null>(null);
  const [tipoPostulacionGuardada, setTipoPostulacionGuardada] =
    useState<string | null>(null);

  const [estadoNegociacion, setEstadoNegociacion] =
    useState<string | null>(null);  
  
  const esperandoConfirmacion =
    tipoPostulacionGuardada === 'negociar' &&
    estadoNegociacion === 'esperandoconfirmacion';

  const [cargando, setCargando] = useState(true);
  const [postulando, setPostulando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const servicioId = Number(idServicio);

  const usuarioSesion = currentUser as UsuarioSesion | null;

  const empleadoId = Number(
    usuarioSesion?.idEmpleado ??
      usuarioSesion?.id_empleado ??
      usuarioSesion?.id
  );

  const [tipoPostulacion, setTipoPostulacion] = useState<
    'aceptar' | 'negociar'
  >('aceptar');

  const [idPostulacionActual, setIdPostulacionActual] =
    useState<number | null>(null);

  const [aceptandoPresupuesto, setAceptandoPresupuesto] =
    useState(false);

  useEffect(() => {
    async function cargarDetalle() {
      if (
        !Number.isInteger(empleadoId) ||
        empleadoId <= 0
      ) {
        setError(
          'No se encontró el perfil de empleado de la sesión.'
        );
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const servicioEncontrado =
          await obtenerServicioPorId(servicioId);

        setServicio(servicioEncontrado as ServicioConHorario);

        if (
          Number.isInteger(empleadoId) &&
          empleadoId > 0
        ) {
          const postulaciones =
            await obtenerPostulacionesCompletasEmpleado(
              empleadoId
            );

          const postulacionActual =
            postulaciones.find(
              (postulacion) =>
                Number(postulacion.fk_servicio) ===
                servicioId
            );

          setEstadoPostulacion(
            postulacionActual?.estado ?? null
          );

          setTipoPostulacionGuardada(
            postulacionActual?.tipo_postulacion
              ? String(postulacionActual.tipo_postulacion)
                  .trim()
                  .toLowerCase()
              : null
          );

          setEstadoNegociacion(
            postulacionActual?.estado_negociacion
              ? String(postulacionActual.estado_negociacion)
                  .trim()
                  .toLowerCase()
              : null
          );

          setIdPostulacionActual(
            postulacionActual?.id_postulacion ?? null
          );
          
        }
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

    cargarDetalle();
  }, [servicioId, empleadoId]);

  async function manejarPostulacion() {
    if (
      !Number.isInteger(empleadoId) ||
      empleadoId <= 0
    ) {
      setError(
        'No se encontró el perfil de empleado de la sesión.'
      );
      return;
    }

    if (
      !Number.isInteger(servicioId) ||
      servicioId <= 0
    ) {
      setError('El servicio no es válido.');
      return;
    }

    if (estadoPostulacion) {
      return;
    }

    try {
      setPostulando(true);
      setError('');
      setMensaje('');
      
      const respuesta =
        await postularEmpleadoServicio(
          servicioId,
          empleadoId,
          tipoPostulacion
        );

      setEstadoPostulacion('Pendiente');
      setMensaje(
        respuesta.mensaje ||
          'Tu postulación fue registrada correctamente.'
      );
    } catch (errorDesconocido) {
      const mensajeError =
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : 'No se pudo registrar la postulación.';

      if (
        mensajeError
          .toLowerCase()
          .includes('ya te postulaste')
      ) {
        setEstadoPostulacion('Pendiente');
        setError('');
        setMensaje(
          'Ya estás postulado a este servicio.'
        );
        return;
      }

      setError(mensajeError);
    } finally {
      setPostulando(false);
    }
  }

  function abrirChatCliente() {
  const idCliente = Number(
    servicio?.fk_cliente ??
      servicio?.id_cliente
  );

  if (
    !Number.isInteger(idCliente) ||
    idCliente <= 0
  ) {
    setError(
      'No se pudo identificar al cliente.'
    );
    return;
  }

  navigate(`/home/chat/${idCliente}`, {
    state: {
      idCliente,
      idEmpleado: empleadoId,
      participantId: idCliente,
      participantName:
        servicio?.nombre_cliente ||
        'Cliente',
      participantAvatar:
        servicio?.foto_cliente || '',
      idServicio: servicioId,
      tituloServicio:
        servicio?.titulo ||
        servicio?.nombre_categoria ||
        'Servicio',
    },
  });
}


  function abrirReporteCliente() {
    const idCliente = Number(
      servicio?.fk_cliente ??
        servicio?.id_cliente
    );

    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0
    ) {
      setError(
        'No se pudo identificar al cliente.'
      );
      return;
    }

    navigate('/home/report', {
      state: {
        tipoReporte: 'usuario',
        idServicio: servicioId,
        idReportado: idCliente,
        tipoReportado: 'client',
      },
    });
  }

  if (cargando) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gray-50 px-6">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  if (error && !servicio) {
    return (
      <div className="min-h-full bg-gray-50 px-5 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 text-sm font-semibold text-[#1A56DB]"
        >
          ← Volver
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!servicio) {
    return null;
  }

  const yaPostulado = Boolean(estadoPostulacion);
  const titulo =
    servicio.titulo?.trim() ||
    servicio.nombre_categoria?.trim() ||
    'Solicitud de servicio';

  const estadoServicioNormalizado =
    String(servicio.estado ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, ' ');

  /*
   * El trabajador puede reportar al cliente
   * desde que el servicio fue asignado y
   * también cuando ya quedó completado.
   *
   * No se muestra mientras la solicitud sigue
   * pendiente, porque todavía no existe una
   * relación de trabajo confirmada.
   */
  const puedeReportarCliente = [
    'asignado',
    'asignada',
    'aceptado',
    'aceptada',
    'en proceso',
    'in progress',
    'completado',
    'completada',
    'completed',
  ].includes(estadoServicioNormalizado);

  return (
    <div className="min-h-full bg-gray-50 pb-28">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-5 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-800"
          >
            ←
          </button>

          <div>
            <p className="text-xs text-gray-500">
              Detalle de la solicitud
            </p>

            <h1 className="line-clamp-1 text-lg font-bold text-gray-900">
              {titulo}
            </h1>
          </div>
        </div>
      </header>

      <main className="space-y-4 px-5 py-5">
        <section className="rounded-3xl bg-[#1A56DB] p-5 text-white shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-sm text-blue-100">
                Presupuesto
              </p>

              <p className="text-3xl font-bold">
                {formatearPresupuesto(
                  servicio.presupuesto
                )}
              </p>
            </div>

            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              {convertirEstado(servicio.estado)}
            </span>
          </div>

          <h2 className="text-xl font-bold">
            {titulo}
          </h2>

          <p className="mt-2 text-sm text-blue-100">
            {servicio.nombre_categoria ||
              'Categoría no especificada'}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900">
              Cliente
            </h2>

            <button
              type="button"
              onClick={abrirChatCliente}
              aria-label="Hablar con el cliente"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-[#1A56DB] transition hover:bg-blue-200"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {servicio.foto_cliente ? (
              <img
                src={servicio.foto_cliente}
                alt={
                  servicio.nombre_cliente ||
                  'Cliente'
                }
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-[#1A56DB]">
                {(
                  servicio.nombre_cliente?.charAt(0) ||
                  'C'
                ).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">
                {servicio.nombre_cliente ||
                  'Cliente no disponible'}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Persona que publicó la solicitud
              </p>
            </div>
          </div>

          {puedeReportarCliente && (
            <button
              type="button"
              onClick={abrirReporteCliente}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <Flag className="h-4 w-4" />
              Reportar cliente
            </button>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-gray-900">
            Descripción
          </h2>

          <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
            {servicio.descripcion ||
              'No se proporcionó una descripción.'}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">
            Información del servicio
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Dirección
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {servicio.direccion ||
                  'Dirección no disponible'}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Fecha solicitada
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {formatearFecha(servicio.fecha)}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Horario estimado
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {formatearHora(servicio.hora_inicio)} -{' '}
                {formatearHora(servicio.hora_fin)}
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                El horario es estimado y podrá ajustarse de común acuerdo con el cliente.
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Categoría
              </p>

              <p className="mt-1 text-sm font-medium text-gray-800">
                {servicio.nombre_categoria ||
                  'Categoría no disponible'}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Estado del servicio
              </p>

              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerColorEstado(
                  servicio.estado
                )}`}
              >
                {convertirEstado(servicio.estado)}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-gray-900">
            Mi postulación
          </h2>

          {estadoPostulacion ? (
            <div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${obtenerColorEstado(
                  estadoPostulacion
                )}`}
              >
                {convertirEstado(
                  estadoPostulacion
                )}
              </span>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Ya te postulaste para realizar este
                servicio. El cliente podrá revisar tu
                perfil y decidir si te contrata.
              </p>
              
              {esperandoConfirmacion && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    Nuevo presupuesto pendiente
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    El cliente actualizó el presupuesto. Revísalo y confirma si estás de acuerdo.
                  </p>

                  <button
                    type="button"
                    disabled={
                      aceptandoPresupuesto ||
                      idPostulacionActual === null
                    }
                    onClick={async () => {
                      if (idPostulacionActual === null) {
                        setError(
                          'No se encontró la postulación.'
                        );
                        return;
                      }

                      try {
                        setAceptandoPresupuesto(true);
                        setError('');
                        setMensaje('');

                        const respuesta =
                          await aceptarNuevoPresupuesto(
                            idPostulacionActual
                          );

                        setEstadoNegociacion('aceptado');

                        setMensaje(
                          respuesta.mensaje ||
                            'Nuevo presupuesto aceptado correctamente.'
                        );
                      } catch (error) {
                        setError(
                          error instanceof Error
                            ? error.message
                            : 'No se pudo aceptar el nuevo presupuesto.'
                        );
                      } finally {
                        setAceptandoPresupuesto(false);
                      }
                    }}
                    className="mt-4 w-full rounded-xl bg-[#1A56DB] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {aceptandoPresupuesto
                      ? 'Aceptando...'
                      : 'Aceptar nuevo presupuesto'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-5 mb-4 rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                ¿Cómo deseas postularte?
              </p>

              <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                <input
                  type="radio"
                  name="tipoPostulacion"
                  checked={tipoPostulacion === 'aceptar'}
                  onChange={() => setTipoPostulacion('aceptar')}
                  className="mt-1 accent-[#1A56DB]"
                />

                <div>
                  <p className="text-sm font-medium text-foreground">
                    Acepto el presupuesto publicado
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Te postularás con el monto indicado en la solicitud.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3">
                <input
                  type="radio"
                  name="tipoPostulacion"
                  checked={tipoPostulacion === 'negociar'}
                  onChange={() => setTipoPostulacion('negociar')}
                  className="mt-1 accent-[#1A56DB]"
                />

                <div>
                  <p className="text-sm font-medium text-foreground">
                    Quiero negociar el precio
                  </p>
                  <p className="text-xs text-muted-foreground">
                    El cliente verá que deseas negociar y podrán acordar el monto por chat.
                  </p>
                </div>
              </label>
            </div>

          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {mensaje && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              {mensaje}
            </p>
          </div>
        )}
      </main>


      
      {estadoServicioNormalizado === 'pendiente' && (
        <div className="sticky bottom-0 z-20 border-t border-gray-200 bg-white p-4">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={manejarPostulacion}
              disabled={
                yaPostulado ||
                postulando
              }
              className="w-full rounded-2xl bg-[#1A56DB] px-5 py-4 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {postulando
                ? 'Registrando...'
                : yaPostulado
                  ? `Postulación: ${convertirEstado(
                      estadoPostulacion
                    )}`
                  : 'Me interesa'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}