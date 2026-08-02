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
  User,
} from 'lucide-react';

import {
  aceptarPostulante,
  obtenerPostulacionesServicio,
  rechazarPostulante,
  type PostulanteServicio,
  type SolicitudCliente,
} from '../../services/SolicitudesClienteApi';

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
      `/api/empleados/${idEmpleado}`,
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
                          {/* Ver perfil */}
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/home/worker/${idEmpleado}`
                              )
                            }
                            className="rounded-xl border border-[#1A56DB] text-[#1A56DB] px-3 py-2.5 text-xs font-semibold"
                          >
                            Ver perfil
                          </button>

                          {/* Aceptar y rechazar */}
                          {pendiente &&
                            !servicioAsignado && (
                              <>
                                <button
                                  type="button"
                                  disabled={
                                    botonesDeshabilitados
                                  }
                                  onClick={() =>
                                    void manejarAceptar(
                                      idEmpleado
                                    )
                                  }
                                  className="rounded-xl bg-[#1A56DB] text-white px-3 py-2.5 text-xs font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                >
                                  {aceptandoEsta ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                      Aceptando
                                    </>
                                  ) : (
                                    'Aceptar'
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={
                                    botonesDeshabilitados
                                  }
                                  onClick={() =>
                                    void manejarRechazar(
                                      idPostulacion
                                    )
                                  }
                                  className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2.5 text-xs font-semibold disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                >
                                  {rechazandoEsta ? (
                                    <>
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                      Rechazando
                                    </>
                                  ) : (
                                    'Rechazar'
                                  )}
                                </button>
                              </>
                            )}

                          {/* Trabajador aceptado */}
                          {aceptada &&
                            !servicioCompletado && (
                              <div className="rounded-xl bg-green-50 border border-green-200 text-green-700 px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-1">
                                <Check className="w-4 h-4" />
                                Trabajador aceptado
                              </div>
                            )}

                          {/* Reportar trabajador */}
                          {aceptada &&
                            servicioCompletado && (
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    '/home/report',
                                    {
                                      state: {
                                        tipoReporte:
                                          'usuario',
                                        idServicio:
                                          servicioId,
                                        idReportado:
                                          idEmpleado,
                                        tipoReportado:
                                          'worker',
                                      },
                                    }
                                  )
                                }
                                className="rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                              >
                                <Flag className="w-4 h-4" />
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