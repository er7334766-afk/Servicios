import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import {
  ArrowLeft,
  Briefcase,
  Check,
  Flag,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Star,
  User,
} from 'lucide-react';

import {
  aceptarPostulante,
  obtenerPostulacionesServicio,
  rechazarPostulante,
  type PostulanteServicio,
  type SolicitudCliente,
} from '../../services/SolicitudesClienteApi';


const API_URL = 'https://servicios-59g4.onrender.com/api';

interface ResenaServicio {
  id_resena: number;
  id_reserva: number;
  id_empleado: number;
  calificacion_general: number;
  puntualidad?: number | null;
  calidad?: number | null;
  comunicacion?: number | null;
  comentario?: string | null;
  fecha?: string | null;
  respuesta_evaluado?: string | null;
  fecha_respuesta?: string | null;
  nombre_empleado?: string | null;
  foto_empleado?: string | null;
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
      `El servidor devolvió una respuesta inválida. Código ${respuesta.status}`,
    );
  }
}

function normalizarFecha(
  fecha?: string | null,
): Date | null {
  if (!fecha) {
    return null;
  }

  const valor = String(fecha).trim();

  const coincidencia =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(
      valor,
    );

  if (coincidencia) {
    const fechaLocal = new Date(
      Number(coincidencia[1]),
      Number(coincidencia[2]) - 1,
      Number(coincidencia[3]),
      Number(coincidencia[4] ?? 0),
      Number(coincidencia[5] ?? 0),
      Number(coincidencia[6] ?? 0),
    );

    if (!Number.isNaN(fechaLocal.getTime())) {
      return fechaLocal;
    }
  }

  const fechaInterpretada = new Date(valor);

  return Number.isNaN(fechaInterpretada.getTime())
    ? null
    : fechaInterpretada;
}

function formatearFecha(
  fecha?: string | null,
): string {
  const fechaConvertida = normalizarFecha(fecha);

  if (!fechaConvertida) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-HN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(fechaConvertida);
}

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

function convertirEstado(
  estado?: string | null
): string {
  const valor = String(estado ?? '')
    .trim()
    .toLowerCase();

  switch (valor) {
    case 'pendiente':
      return 'Pendiente';

    case 'aceptada':
      return 'Aceptada';

    case 'rechazada':
      return 'Rechazada';

    case 'asignado':
      return 'Asignado';

    case 'en proceso':
    case 'en_proceso':
      return 'En proceso';

    case 'completado':
      return 'Completado';

    case 'cancelado':
      return 'Cancelado';

    default:
      return estado || 'Sin estado';
  }
}

function normalizarEstado(
  estado?: string | null
): string {
  return String(estado ?? '')
    .trim()
    .toLowerCase();
}

function obtenerTrabajosRealizados(
  postulante: any
): number {
  const valor = Number(
    postulante?.trabajos_completados ??
      postulante?.numero_trabajos ??
      postulante?.N_trabajos ??
      postulante?.trabajos_realizados ??
      postulante?.total_trabajos ??
      0
  );

  return Number.isFinite(valor)
    ? valor
    : 0;
}

async function obtenerTrabajosEmpleado(
  idEmpleado: number
): Promise<number> {
  if (
    !Number.isInteger(idEmpleado) ||
    idEmpleado <= 0
  ) {
    return 0;
  }

  try {
    const respuesta = await fetch(
      `${API_URL}/empleados/${idEmpleado}`,
      {
        cache: 'no-store',
      }
    );

    if (!respuesta.ok) {
      return 0;
    }

    const texto = await respuesta.text();

    if (!texto) {
      return 0;
    }

    const datos = JSON.parse(texto);

    return obtenerTrabajosRealizados(
      datos?.empleado ?? datos
    );
  } catch (error) {
    console.error(
      'No se pudo consultar la cantidad de trabajos del empleado:',
      error
    );

    return 0;
  }
}

export default function ClientServiceDetailScreen() {
  const navigate = useNavigate();
  const { idServicio } = useParams();

  const servicioId = Number(idServicio);

  const [servicio, setServicio] =
    useState<SolicitudCliente | null>(null);

  const [postulaciones, setPostulaciones] =
    useState<PostulanteServicio[]>([]);

  const [cargando, setCargando] = useState(true);

  const [actualizando, setActualizando] =
    useState(false);

  const [aceptandoId, setAceptandoId] =
    useState<number | null>(null);

  const [rechazandoId, setRechazandoId] =
    useState<number | null>(null);

  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [resenaServicio, setResenaServicio] =
    useState<ResenaServicio | null>(null);

  const [cargandoResena, setCargandoResena] =
    useState(false);

  const cargarResenaServicio = async () => {
    if (
      !Number.isInteger(servicioId) ||
      servicioId <= 0
    ) {
      setResenaServicio(null);
      return;
    }

    try {
      setCargandoResena(true);

      const respuesta = await fetch(
        `${API_URL}/resenas/servicio/${servicioId}`,
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );

      if (respuesta.status === 404) {
        setResenaServicio(null);
        return;
      }

      const datos = await leerRespuestaJson<{
        resena?: ResenaServicio | null;
        mensaje?: string;
        detalle?: string;
      }>(respuesta);

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo cargar la reseña',
        );
      }

      setResenaServicio(
        datos.resena ?? null,
      );
    } catch (error) {
      console.error(
        'Error al cargar la reseña del servicio:',
        error,
      );

      setResenaServicio(null);
    } finally {
      setCargandoResena(false);
    }
  };

  const cargarDetalle = async (
    cargaInicial = false
  ) => {
    if (
      !Number.isInteger(servicioId) ||
      servicioId <= 0
    ) {
      setError(
        'El servicio solicitado no es válido'
      );

      setCargando(false);
      return;
    }

    try {
      if (cargaInicial) {
        setCargando(true);
      } else {
        setActualizando(true);
      }

      setError('');

      const datos =
        await obtenerPostulacionesServicio(
          servicioId
        );

      setServicio(datos.servicio ?? null);

      const listaPostulaciones: PostulanteServicio[] =
        Array.isArray(datos.postulaciones)
          ? datos.postulaciones
          : [];

      const postulacionesCompletas =
        await Promise.all(
          listaPostulaciones.map(
            async (postulacion) => {
              const cantidadActual =
                obtenerTrabajosRealizados(
                  postulacion
                );

              if (cantidadActual > 0) {
                return postulacion;
              }

              const idEmpleado = Number(
                postulacion.id_empleado
              );

              const trabajosConsultados =
                await obtenerTrabajosEmpleado(
                  idEmpleado
                );

              return {
                ...postulacion,
                N_trabajos:
                  trabajosConsultados,
              } as PostulanteServicio;
            }
          )
        );

      setPostulaciones(
        postulacionesCompletas
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la solicitud'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  };

  useEffect(() => {
    void cargarDetalle(true);
    void cargarResenaServicio();
  }, [servicioId]);

  const manejarAceptar = async (
    idEmpleado: number
  ) => {
    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      setError('ID de empleado inválido');
      return;
    }

    const confirmado = window.confirm(
      '¿Deseas seleccionar a este trabajador? Las demás postulaciones serán rechazadas.'
    );

    if (!confirmado) {
      return;
    }

    try {
      setAceptandoId(idEmpleado);
      setError('');
      setMensaje('');

      const respuesta = await aceptarPostulante(
        servicioId,
        idEmpleado
      );

      setMensaje(
        respuesta?.mensaje ||
          'Trabajador seleccionado correctamente'
      );

      await cargarDetalle(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo seleccionar al trabajador'
      );
    } finally {
      setAceptandoId(null);
    }
  };

  const manejarRechazar = async (
    idPostulacion: number
  ) => {
    if (
      !Number.isInteger(idPostulacion) ||
      idPostulacion <= 0
    ) {
      setError('ID de postulación inválido');
      return;
    }

    const confirmado = window.confirm(
      '¿Deseas rechazar esta postulación?'
    );

    if (!confirmado) {
      return;
    }

    try {
      setRechazandoId(idPostulacion);
      setError('');
      setMensaje('');

      const respuesta =
        await rechazarPostulante(
          idPostulacion
        );

      setMensaje(
        respuesta?.mensaje ||
          'Postulación rechazada correctamente'
      );

      await cargarDetalle(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo rechazar la postulación'
      );
    } finally {
      setRechazandoId(null);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gray-50">
        <RefreshCw className="w-8 h-8 text-[#1A56DB] animate-spin" />
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="min-h-full bg-gray-50 px-5 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#1A56DB] font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>

        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm text-red-700">
            {error ||
              'No se encontró el servicio'}
          </p>
        </div>
      </div>
    );
  }

  const estadoServicio = normalizarEstado(
    servicio.estado
  );

  const servicioAsignado =
    estadoServicio !== 'pendiente';

  const servicioCompletado =
    estadoServicio === 'completado';

  const hayOperacion =
    aceptandoId !== null ||
    rechazandoId !== null ||
    actualizando;

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      {/* Encabezado */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <p className="text-xs text-gray-500">
              Mi solicitud
            </p>

            <h1 className="text-lg font-bold text-gray-900 truncate">
              {servicio.titulo ||
                servicio.nombre_categoria ||
                'Solicitud de servicio'}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-5 space-y-4">
        {/* Información principal */}
        <section className="bg-[#1A56DB] text-white rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-blue-100">
                Presupuesto
              </p>

              <p className="text-3xl font-bold mt-1">
                {formatearPresupuesto(
                  servicio.presupuesto
                )}
              </p>
            </div>

            <span className="bg-white/20 rounded-full px-3 py-1 text-xs font-semibold">
              {convertirEstado(
                servicio.estado
              )}
            </span>
          </div>

          <p className="text-lg font-bold mt-5">
            {servicio.nombre_categoria ||
              'Servicio'}
          </p>

          <p className="text-sm text-blue-100 mt-1">
            {servicio.descripcion ||
              'Sin descripción'}
          </p>
        </section>

        {/* Dirección */}
        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">
            Información
          </h2>

          <div className="mt-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#1A56DB] flex-shrink-0" />

            <div>
              <p className="text-xs text-gray-400">
                Dirección
              </p>

              <p className="text-sm text-gray-700 mt-1">
                {servicio.direccion ||
                  'Sin dirección'}
              </p>
            </div>
          </div>
        </section>

        {/* Resumen de postulaciones */}
        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">
                Personas interesadas
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {postulaciones.length}{' '}
                {postulaciones.length === 1
                  ? 'postulación'
                  : 'postulaciones'}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void cargarDetalle(false)
              }
              disabled={hayOperacion}
              className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center disabled:opacity-50"
              aria-label="Actualizar postulaciones"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#1A56DB] ${
                  actualizando
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>
          </div>
        </section>

        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {mensaje && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-sm text-green-700">
              {mensaje}
            </p>
          </div>
        )}

        {/* Reseña escrita por el cliente */}
        {servicioCompletado && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-gray-900">
                Mi reseña
              </h2>

              {resenaServicio && (
                <span className="text-xs text-gray-500">
                  {formatearFecha(
                    resenaServicio.fecha,
                  )}
                </span>
              )}
            </div>

            {cargandoResena ? (
              <div className="flex items-center justify-center py-6">
                <RefreshCw className="h-5 w-5 animate-spin text-[#1A56DB]" />
              </div>
            ) : resenaServicio ? (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from(
                      { length: 5 },
                      (_, index) => {
                        const activa =
                          index <
                          Number(
                            resenaServicio.calificacion_general,
                          );

                        return (
                          <Star
                            key={index}
                            className={`h-5 w-5 ${
                              activa
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300'
                            }`}
                          />
                        );
                      },
                    )}
                  </div>

                  <span className="text-sm font-bold text-gray-900">
                    {Number(
                      resenaServicio.calificacion_general,
                    ).toFixed(1)}
                  </span>
                </div>

                {resenaServicio.comentario && (
                  <p className="mt-4 whitespace-pre-line break-words text-sm leading-6 text-gray-700">
                    {resenaServicio.comentario}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-[11px] text-gray-500">
                      Puntualidad
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {Number(
                        resenaServicio.puntualidad ?? 0,
                      ) || 0}
                      /5
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-500">
                      Calidad
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {Number(
                        resenaServicio.calidad ?? 0,
                      ) || 0}
                      /5
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-gray-500">
                      Comunicación
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {Number(
                        resenaServicio.comunicacion ?? 0,
                      ) || 0}
                      /5
                    </p>
                  </div>
                </div>

                {String(
                  resenaServicio.respuesta_evaluado ??
                    '',
                ).trim() && (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-bold text-[#1A56DB]">
                      Respuesta del trabajador
                    </p>

                    <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-gray-700">
                      {
                        resenaServicio.respuesta_evaluado
                      }
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      {formatearFecha(
                        resenaServicio.fecha_respuesta,
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                <Star className="mx-auto h-7 w-7 text-gray-300" />

                <p className="mt-3 text-sm font-semibold text-gray-800">
                  Todavía no has dejado una reseña
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Cuando califiques este servicio, tu reseña y la respuesta del trabajador aparecerán aquí.
                </p>
              </div>
            )}
          </section>
        )}

        {/* Postulaciones */}
        {postulaciones.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center shadow-sm">
            <User className="w-10 h-10 text-gray-300 mx-auto" />

            <p className="font-semibold text-gray-800 mt-3">
              Todavía no hay postulaciones
            </p>

            <p className="text-sm text-gray-500 mt-1">
              Los trabajadores interesados aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {postulaciones.map(
              
              (postulacion) => {
                const estadoPostulacion =
                  normalizarEstado(
                    postulacion.estado_postulacion
                  );

                const tipoPostulacion =
                  normalizarEstado(
                    postulacion.tipo_postulacion
                  );
                const quiereNegociar =
                  tipoPostulacion === 'negociar';

                const estadoNegociacion = normalizarEstado(
                  postulacion.estado_negociacion
                );

                const negociacionAceptada =
                  estadoNegociacion === 'aceptado';

                const aceptada =
                  estadoPostulacion ===
                  'aceptada';

                const rechazada =
                  estadoPostulacion ===
                  'rechazada';

                const pendiente =
                  estadoPostulacion ===
                  'pendiente';

                const idEmpleado = Number(
                  postulacion.id_empleado
                );

                const idPostulacion = Number(
                  postulacion.id_postulacion
                );

                const aceptandoEsta =
                  aceptandoId === idEmpleado;

                const rechazandoEsta =
                  rechazandoId ===
                  idPostulacion;

                const botonesDeshabilitados =
                  servicioAsignado ||
                  !pendiente ||
                  hayOperacion;

                return (
                  <article
                    key={idPostulacion}
                    className="bg-white rounded-3xl p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-blue-100 text-[#1A56DB] flex items-center justify-center text-xl font-bold flex-shrink-0">
                        {postulacion.nombre_E
                          ?.charAt(0)
                          .toUpperCase() ||
                          'T'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">
                              {postulacion.nombre_E ||
                                'Trabajador'}
                            </h3>

                            <p className="text-sm text-[#1A56DB] mt-1">
                              {postulacion.titulo ||
                                'Trabajador de servicios'}
                            </p>
                            
                            <div className="mt-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  quiereNegociar
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {quiereNegociar
                                  ? 'Quiere negociar el precio'
                                  : 'Acepta el presupuesto'}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0 ${
                              aceptada
                                ? 'bg-green-100 text-green-700'
                                : rechazada
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {convertirEstado(
                              postulacion.estado_postulacion
                            )}
                          </span>
                        </div>

                        <div className="space-y-2 mt-4">
                          {postulacion.correo && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />

                              <p className="text-xs text-gray-600 break-all">
                                {
                                  postulacion.correo
                                }
                              </p>
                            </div>
                          )}

                          {postulacion.celular && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />

                              <p className="text-xs text-gray-600">
                                {
                                  postulacion.celular
                                }
                              </p>
                            </div>
                          )}

                          {postulacion.direccion && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />

                              <p className="text-xs text-gray-600">
                                {
                                  postulacion.direccion
                                }
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />

                            <p className="text-xs text-gray-600">
                              {obtenerTrabajosRealizados(
                                postulacion
                              )}{' '}
                              {obtenerTrabajosRealizados(
                                postulacion
                              ) === 1
                                ? 'trabajo realizado'
                                : 'trabajos realizados'}
                            </p>
                          </div>
                        </div>

                        

                        <div className="grid grid-cols-1 gap-2 mt-5 sm:grid-cols-2">
                            {/* Ver perfil */}
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/home/worker/${idEmpleado}`)
                              }
                              className="rounded-xl border border-[#1A56DB] px-3 py-2.5 text-xs font-semibold text-[#1A56DB]"
                            >
                              Ver perfil
                            </button>

                            {/* Ir al chat: solo para negociación */}
                            {quiereNegociar && pendiente && !servicioAsignado ? (
                              <button
                                type="button"
                                disabled={
                                  !Number.isInteger(idEmpleado) ||
                                  idEmpleado <= 0
                                }
                                onClick={() => {
                                  navigate(`/home/chat/${idEmpleado}`, {
                                    state: {
                                      idServicio: servicioId,
                                      volverA: `/home/mis-solicitudes/${servicioId}`,
                                    },
                                  });
                                }}
                                className="rounded-xl border border-[#1A56DB] bg-blue-50 px-3 py-2.5 text-xs font-semibold text-[#1A56DB] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Ir al chat
                              </button>
                            ) : (
                              <div className="hidden sm:block" />
                            )}

                            {/* Contratar */}
                            {pendiente && !servicioAsignado && (
                              <button
                                type="button"
                                disabled={
                                  botonesDeshabilitados ||
                                  (quiereNegociar &&
                                    !negociacionAceptada)
                                }
                                onClick={() =>
                                  void manejarAceptar(idEmpleado)
                                }
                                className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#1A56DB] px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 sm:col-span-2"
                              >
                                {aceptandoEsta ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Contratando
                                  </>
                                ) : (
                                  'Contratar'
                                )}
                              </button>
                            )}

                            {/* Mensaje de espera */}
                            {pendiente &&
                              quiereNegociar &&
                              !negociacionAceptada &&
                              !servicioAsignado && (
                                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:col-span-2">
                                  <p className="text-sm font-semibold text-[#1A56DB]">
                                    ⏳ Esperando confirmación del trabajador
                                  </p>

                                  <p className="mt-1 text-xs leading-5 text-blue-700">
                                    Podrás contratar cuando el trabajador acepte el nuevo presupuesto.
                                  </p>
                                </div>
                              )}

                            {/* Rechazar */}
                            {pendiente && !servicioAsignado && (
                              <button
                                type="button"
                                disabled={botonesDeshabilitados}
                                onClick={() =>
                                  void manejarRechazar(idPostulacion)
                                }
                                className="flex w-full items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:col-span-2"
                              >
                                {rechazandoEsta ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Rechazando
                                  </>
                                ) : (
                                  'Rechazar'
                                )}
                              </button>
                            )}

                            {/* Trabajador aceptado */}
                            {aceptada && !servicioCompletado && (
                              <div className="flex items-center justify-center gap-1 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-xs font-semibold text-green-700 sm:col-span-2">
                                <Check className="h-4 w-4" />
                                Trabajador aceptado
                              </div>
                            )}

                            {/* Reportar trabajador */}
                            {aceptada && servicioCompletado && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate('/home/report', {
                                    state: {
                                      tipoReporte: 'usuario',
                                      idServicio: servicioId,
                                      idReportado: idEmpleado,
                                      tipoReportado: 'worker',
                                    },
                                  })
                                }
                                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 sm:col-span-2"
                              >
                                <Flag className="h-4 w-4" />
                                Reportar trabajador
                              </button>
                            )}
                          </div>

                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </main>
    </div>
  );
}
