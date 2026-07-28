import {
  useEffect,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router';

import {
  ArrowLeft,
  Briefcase,
  Check,
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
  type SolicitudCliente,
  type PostulanteServicio,
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

    default:
      return estado || 'Sin estado';
  }
}

export default function ClientServiceDetailScreen() {
  const navigate = useNavigate();
  const { idServicio } = useParams();

  const servicioId = Number(
    idServicio
  );

  const [
    servicio,
    setServicio,
  ] = useState<SolicitudCliente | null>(
    null
  );

  const [
    postulaciones,
    setPostulaciones,
  ] = useState<PostulanteServicio[]>([]);

  const [cargando, setCargando] =
    useState(true);

  const [
    aceptandoId,
    setAceptandoId,
  ] = useState<number | null>(null);

  const [error, setError] =
    useState('');

  const [mensaje, setMensaje] =
    useState('');

  const cargarDetalle = async () => {
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
      setCargando(true);
      setError('');

      const datos =
        await obtenerPostulacionesServicio(
          servicioId
        );

      setServicio(datos.servicio);
      setPostulaciones(
        datos.postulaciones
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la solicitud'
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDetalle();
  }, [servicioId]);

  const manejarAceptar = async (
    idEmpleado: number
  ) => {
    const confirmado = window.confirm(
      '¿Deseas seleccionar a este trabajador? Las demás postulaciones serán rechazadas.'
    );

    if (!confirmado) return;

    try {
      setAceptandoId(idEmpleado);
      setError('');
      setMensaje('');

      const respuesta =
        await aceptarPostulante(
          servicioId,
          idEmpleado
        );

      setMensaje(
        respuesta.mensaje ||
          'Trabajador seleccionado correctamente'
      );

      await cargarDetalle();
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
    const confirmado = window.confirm('¿Deseas rechazar esta postulación?');
    if (!confirmado) return;

    try {
      setError('');
      setMensaje('');

      await rechazarPostulante(idPostulacion);

      setMensaje('Postulación rechazada correctamente');
      await cargarDetalle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo rechazar');
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
          onClick={() =>
            navigate(-1)
          }
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

  const servicioAsignado =
    String(servicio.estado)
      .trim()
      .toLowerCase() !==
    'pendiente';

  return (
    <div className="min-h-full bg-gray-50 pb-24">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <p className="text-xs text-gray-500">
              Mi solicitud
            </p>

            <h1 className="text-lg font-bold text-gray-900">
              {servicio.titulo ||
                servicio.nombre_categoria ||
                'Solicitud de servicio'}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-5 space-y-4">
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
            {servicio.descripcion}
          </p>
        </section>

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
                {servicio.direccion}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">
                Personas interesadas
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {postulaciones.length}{' '}
                postulaciones
              </p>
            </div>

            <button
              type="button"
              onClick={cargarDetalle}
              className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 text-[#1A56DB]" />
            </button>
          </div>
        </section>

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
                const aceptada =
                  postulacion.estado_postulacion
                    .trim()
                    .toLowerCase() ===
                  'aceptada';

                const rechazada =
                  postulacion.estado_postulacion
                    .trim()
                    .toLowerCase() ===
                  'rechazada';

                return (
                  <article
                    key={
                      postulacion.id_postulacion
                    }
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
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {
                                postulacion.nombre_E
                              }
                            </h3>

                            <p className="text-sm text-[#1A56DB] mt-1">
                              {postulacion.titulo ||
                                'Trabajador de servicios'}
                            </p>
                          </div>

                          <span
                            className={`text-xs px-3 py-1 rounded-full font-semibold ${
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
                              <Mail className="w-4 h-4 text-gray-400" />

                              <p className="text-xs text-gray-600">
                                {
                                  postulacion.correo
                                }
                              </p>
                            </div>
                          )}

                          {postulacion.celular && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />

                              <p className="text-xs text-gray-600">
                                {
                                  postulacion.celular
                                }
                              </p>
                            </div>
                          )}

                          {postulacion.direccion && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-gray-400" />

                              <p className="text-xs text-gray-600">
                                {
                                  postulacion.direccion
                                }
                              </p>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />

                            <p className="text-xs text-gray-600">
                              {Number(
                                postulacion.N_trabajos ??
                                  0
                              )}{' '}
                              trabajos realizados
                            </p>
                          </div>
                        </div>

                          <div className="flex gap-2 mt-5">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/home/worker/${postulacion.id_empleado}`
                              )
                            }
                            className="flex-1 rounded-xl border border-[#1A56DB] text-[#1A56DB] px-3 py-2.5 text-xs font-semibold"
                          >
                            Ver perfil
                          </button>
                          <div className="flex gap-2 w-full">
                            <button
                              type="button"
                              disabled={
                                servicioAsignado || aceptandoId !== null || aceptada || rechazada
                              }
                              onClick={() =>
                                manejarAceptar(Number(postulacion.id_empleado))
                              }
                              className="flex-1 rounded-xl bg-[#1A56DB] text-white px-3 py-2.5 text-xs font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                            >
                              {aceptandoId === postulacion.id_empleado ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  Aceptando
                                </>
                              ) : aceptada ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  Aceptado
                                </>
                              ) : (
                                'Aceptar'
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={aceptada || rechazada}
                              onClick={() =>
                                manejarRechazar(Number(postulacion.id_postulacion))
                              }
                              className="flex-1 rounded-xl border border-red-200 bg-red-50 text-red-600 px-3 py-2.5 text-xs font-semibold disabled:bg-gray-200 disabled:cursor-not-allowed"
                            >
                              Rechazar
                            </button>
                          </div>
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