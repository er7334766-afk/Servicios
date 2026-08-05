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
  MapPin,
  CalendarDays,
  Briefcase,
  Star,
  User,
  Loader,
  Clock,
  Wrench,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ServicioPublico {
  id_servicio: number;
  titulo: string;
  categoria: string;
  estado: string;
  fecha: string | null;
}

interface ClientePublico {
  id_cliente: number;
  nombre_C: string;
  foto?: string | null;
  direccion?: string | null;
  fecha_creacion?: string | null;
  total_servicios?: number | null;
  promedio_calificacion?: number | null;
  cantidad_resenas?: number | null;
  ultimosServicios?: ServicioPublico[];
}

function obtenerAnio(
  fecha?: string | null
): string {
  if (!fecha) {
    return 'No disponible';
  }

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'No disponible';
  }

  return String(valor.getFullYear());
}

function formatearFecha(
  fecha?: string | null
): string {
  if (!fecha) {
    return 'Fecha no disponible';
  }

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'Fecha no disponible';
  }

  return valor.toLocaleDateString(
    'es-HN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function normalizarEstado(
  estado?: string | null
): string {
  return String(estado ?? '')
    .trim()
    .toLowerCase();
}

function obtenerClasesEstado(
  estado?: string | null
): string {
  const normalizado =
    normalizarEstado(estado);

  if (
    normalizado === 'completado' ||
    normalizado === 'finalizado'
  ) {
    return 'bg-green-100 text-green-700';
  }

  if (
    normalizado === 'en proceso' ||
    normalizado === 'iniciado'
  ) {
    return 'bg-purple-100 text-purple-700';
  }

  if (
    normalizado === 'cancelado' ||
    normalizado === 'rechazado'
  ) {
    return 'bg-red-100 text-red-700';
  }

  return 'bg-amber-100 text-amber-700';
}

export default function ClientPublicProfileScreen() {
  const navigate = useNavigate();

  const { id } = useParams<{
    id: string;
  }>();

  const idCliente = Number(id);

  const [cliente, setCliente] =
    useState<ClientePublico | null>(
      null
    );

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    const cargarCliente = async () => {
      if (
        !Number.isInteger(idCliente) ||
        idCliente <= 0
      ) {
        setError(
          'El ID del cliente no es válido.'
        );

        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const respuesta = await fetch(
          `https://servicios-59g4.onrender.com/api/clientes/${idCliente}/perfil-publico`,
          {
            cache: 'no-store',
          }
        );

        const texto =
          await respuesta.text();

        let datos: any = null;

        if (texto.trim()) {
          try {
            datos = JSON.parse(texto);
          } catch {
            throw new Error(
              'El servidor devolvió una respuesta inválida.'
            );
          }
        }

        if (!respuesta.ok) {
          throw new Error(
            datos?.mensaje ||
              'No se pudo cargar el perfil del cliente.'
          );
        }

        setCliente({
          id_cliente: Number(
            datos.id_cliente
          ),

          nombre_C: String(
            datos.nombre_C ??
              datos.nombre ??
              'Cliente'
          ),

          foto:
            datos.foto ??
            datos.foto_url ??
            null,

          direccion:
            datos.direccion ??
            null,

          fecha_creacion:
            datos.fecha_creacion ??
            datos.fechaCreacion ??
            null,

          total_servicios: Number(
            datos.total_servicios ?? 0
          ),

          promedio_calificacion:
            Number(
              datos.promedio_calificacion ??
                0
            ),

          cantidad_resenas: Number(
            datos.cantidad_resenas ?? 0
          ),

          ultimosServicios:
            Array.isArray(
              datos.ultimosServicios
            )
              ? datos.ultimosServicios.map(
                  (servicio: any) => ({
                    id_servicio: Number(
                      servicio.id_servicio
                    ),

                    titulo: String(
                      servicio.titulo ??
                        'Solicitud de servicio'
                    ),

                    categoria: String(
                      servicio.categoria ??
                        'Sin categoría'
                    ),

                    estado: String(
                      servicio.estado ??
                        'Pendiente'
                    ),

                    fecha:
                      servicio.fecha ??
                      null,
                  })
                )
              : [],
        });
      } catch (errorDesconocido) {
        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se pudo cargar el perfil.'
        );

        setCliente(null);
      } finally {
        setCargando(false);
      }
    };

    void cargarCliente();
  }, [idCliente]);

  if (cargando) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader className="h-7 w-7 animate-spin text-[#1A56DB]" />
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-red-600">
          {error ||
            'No se encontró el cliente.'}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-semibold text-white"
        >
          Volver
        </button>
      </div>
    );
  }

  const ubicacion =
    cliente.direccion?.trim() ||
    'Ubicación no especificada';

  const calificacion =
    Number(
      cliente.promedio_calificacion
    ) || 0;

  const resenas =
    Number(
      cliente.cantidad_resenas
    ) || 0;

  const servicios =
    Number(
      cliente.total_servicios
    ) || 0;

  const ultimosServicios =
    Array.isArray(
      cliente.ultimosServicios
    )
      ? cliente.ultimosServicios
      : [];

  return (
    <div className="flex min-h-full flex-col bg-background">
      {/* Encabezado */}
      <div className="bg-[#1A56DB] px-5 pb-6 pt-10 text-white">
  <div className="flex items-center gap-3">
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label="Regresar"
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>

    <div>
      <h1 className="text-lg font-bold text-white">
        Perfil del cliente
      </h1>

      <p className="text-xs text-blue-100">
        Información pública
      </p>
    </div>
  </div>
</div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {/* Datos principales */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted">
              {cliente.foto ? (
                <ImageWithFallback
                  src={cliente.foto}
                  alt={cliente.nombre_C}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-9 w-9 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-foreground">
                {cliente.nombre_C ||
                  'Cliente'}
              </h2>

              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />

                <span className="truncate">
                  {ubicacion}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 flex-shrink-0" />

                <span>
                  Cliente desde{' '}
                  {obtenerAnio(
                    cliente.fecha_creacion
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <Briefcase className="mx-auto h-5 w-5 text-[#1A56DB]" />

            <p className="mt-2 text-lg font-bold text-foreground">
              {servicios}
            </p>

            <p className="text-xs text-muted-foreground">
              Servicios publicados
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <Star className="mx-auto h-5 w-5 fill-amber-400 text-amber-400" />

            <p className="mt-2 text-lg font-bold text-foreground">
              {calificacion.toFixed(1)}
            </p>

            <p className="text-xs text-muted-foreground">
              {resenas}{' '}
              {resenas === 1
                ? 'reseña'
                : 'reseñas'}
            </p>
          </div>
        </div>

        {/* Información */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">
            Sobre este perfil
          </p>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Este perfil muestra únicamente información pública para ayudarte a identificar al usuario y conocer algunos datos generales.
          </p>
        </div>

        {/* Últimos servicios */}
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-[#1A56DB]" />

            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Últimos servicios publicados
              </h3>

              <p className="text-xs text-muted-foreground">
                Actividad reciente del cliente
              </p>
            </div>
          </div>

          {ultimosServicios.length > 0 ? (
            <div className="divide-y divide-border">
              {ultimosServicios.map(
                (servicio) => (
                  <div
                    key={
                      servicio.id_servicio
                    }
                    className="py-3 first:pt-1 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {servicio.titulo}
                        </p>

                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {servicio.categoria}
                        </p>
                      </div>

                      <span
                        className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${obtenerClasesEstado(
                          servicio.estado
                        )}`}
                      >
                        {servicio.estado}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />

                      <span>
                        {formatearFecha(
                          servicio.fecha
                        )}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center">
              <Briefcase className="mx-auto h-6 w-6 text-muted-foreground" />

              <p className="mt-2 text-sm font-medium text-foreground">
                Sin publicaciones recientes
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Este cliente todavía no ha publicado servicios.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
