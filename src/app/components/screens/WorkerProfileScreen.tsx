import { useEffect, useState } from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router';
import { motion } from 'motion/react';
import {
  Briefcase,
  CheckCircle,
  ChevronLeft,
  MapPin,
  MessageCircle,
  Share2,
  Star,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { ReviewCard } from '../shared/ReviewCard';

const API_URL = 'http://localhost:3000/api';

interface CategoriaEmpleado {
  id_categoria: number;
  nombre: string;
}

interface SubcategoriaEmpleado {
  id_subcategoria: number;
  nombre?: string;
  nombre_subcategoria?: string;
  descripcion?: string;
}

interface Empleado {
  id_empleado: number;
  nombre_E: string;
  correo?: string;
  celular?: string;
  titulo?: string;
  direccion?: string;
  estado?: string;
  N_trabajos?: number;
  sobre_mi?: string;
  foto?: string;
  precio_hora?: number;
  calificacion?: number;
  cantidad_resenas?: number;
  categorias?: CategoriaEmpleado[];
  galeria?: string[];
}

interface ResenaEmpleado {
  id_resena: number;
  id_reserva: number;
  id_servicio: number;
  calificacion_general: number;
  puntualidad?: number | null;
  calidad?: number | null;
  comunicacion?: number | null;
  comentario?: string | null;
  fecha?: string | null;
  nombre_cliente?: string | null;
  foto_cliente?: string | null;
  respuesta_evaluado?: string | null;
  fecha_respuesta?: string | null;
}

interface ResumenEmpleadoRespuesta {
  total_trabajos: number;
  total_resenas: number;
  promedio_calificacion: number;
  resenas: ResenaEmpleado[];
  mensaje?: string;
  detalle?: string;
}

interface RespuestaEmpleado {
  empleado?: Empleado;
  mensaje?: string;
  detalle?: string;
}

interface RespuestaCategorias {
  categorias?: CategoriaEmpleado[];
  mensaje?: string;
  detalle?: string;
}

interface RespuestaSubcategorias {
  subcategorias?: SubcategoriaEmpleado[];
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
      `El servidor devolvió una respuesta inválida. Código ${respuesta.status}`,
    );
  }
}

function formatearFecha(
  fecha?: string | null,
): string {
  if (!fecha) {
    return 'Fecha no disponible';
  }

  const valor = String(fecha).trim();
  const coincidencia =
    /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);

  const fechaConvertida = coincidencia
    ? new Date(
        Number(coincidencia[1]),
        Number(coincidencia[2]) - 1,
        Number(coincidencia[3]),
      )
    : new Date(valor);

  if (
    Number.isNaN(
      fechaConvertida.getTime(),
    )
  ) {
    return 'Fecha no disponible';
  }

  return fechaConvertida.toLocaleDateString(
    'es-HN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

export default function WorkerProfileScreen() {
  const { id } = useParams<{
    id: string;
  }>();

  const navigate = useNavigate();

  const [worker, setWorker] =
    useState<Empleado | null>(null);

  const [categorias, setCategorias] =
    useState<CategoriaEmpleado[]>([]);

  const [
    subcategorias,
    setSubcategorias,
  ] = useState<SubcategoriaEmpleado[]>([]);

  const [resenas, setResenas] =
    useState<ResenaEmpleado[]>([]);

  const [totalTrabajos, setTotalTrabajos] =
    useState(0);

  const [totalResenas, setTotalResenas] =
    useState(0);

  const [
    promedioCalificacion,
    setPromedioCalificacion,
  ] = useState(0);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState('');

  useEffect(() => {
    async function obtenerPerfilCompleto() {
      const idEmpleado = Number(id);

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        setError(
          'No se recibió un ID de empleado válido',
        );

        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const [
          respuestaEmpleado,
          respuestaCategorias,
          respuestaSubcategorias,
          respuestaResumen,
        ] = await Promise.all([
          fetch(
            `${API_URL}/empleados/${idEmpleado}`,
            {
              cache: 'no-store',
            },
          ),

          fetch(
            `${API_URL}/empleados/${idEmpleado}/categorias`,
            {
              cache: 'no-store',
            },
          ),

          fetch(
            `${API_URL}/empleados/${idEmpleado}/subcategorias`,
            {
              cache: 'no-store',
            },
          ),

          fetch(
            `${API_URL}/empleados/${idEmpleado}/resumen-perfil`,
            {
              cache: 'no-store',
            },
          ),
        ]);

        const datosEmpleado =
          await leerRespuestaJson<
            Empleado | RespuestaEmpleado
          >(respuestaEmpleado);

        if (!respuestaEmpleado.ok) {
          const datosError =
            datosEmpleado as RespuestaEmpleado;

          throw new Error(
            datosError.detalle ||
              datosError.mensaje ||
              `No se pudo obtener el empleado. Código ${respuestaEmpleado.status}`,
          );
        }

        const empleadoRecibido =
          'empleado' in datosEmpleado
            ? datosEmpleado.empleado
            : datosEmpleado;

        if (
          !empleadoRecibido ||
          typeof empleadoRecibido !==
            'object'
        ) {
          throw new Error(
            'No se pudo cargar la información del empleado',
          );
        }

        setWorker(
          empleadoRecibido as Empleado,
        );

        if (respuestaCategorias.ok) {
          const datosCategorias =
            await leerRespuestaJson<
              | CategoriaEmpleado[]
              | RespuestaCategorias
            >(respuestaCategorias);

          const categoriasRecibidas =
            Array.isArray(datosCategorias)
              ? datosCategorias
              : Array.isArray(
                    datosCategorias.categorias,
                  )
                ? datosCategorias.categorias
                : [];

          setCategorias(
            categoriasRecibidas,
          );
        } else {
          setCategorias(
            Array.isArray(
              (
                empleadoRecibido as Empleado
              ).categorias,
            )
              ? (
                  empleadoRecibido as Empleado
                ).categorias!
              : [],
          );
        }

        if (
          respuestaSubcategorias.ok
        ) {
          const datosSubcategorias =
            await leerRespuestaJson<
              | SubcategoriaEmpleado[]
              | RespuestaSubcategorias
            >(respuestaSubcategorias);

          const subcategoriasRecibidas =
            Array.isArray(
              datosSubcategorias,
            )
              ? datosSubcategorias
              : Array.isArray(
                    datosSubcategorias
                      .subcategorias,
                  )
                ? datosSubcategorias.subcategorias
                : [];

          setSubcategorias(
            subcategoriasRecibidas,
          );
        } else {
          setSubcategorias([]);
        }

        if (respuestaResumen.ok) {
          const datosResumen =
            await leerRespuestaJson<ResumenEmpleadoRespuesta>(
              respuestaResumen,
            );

          setTotalTrabajos(
            Number(
              datosResumen.total_trabajos,
            ) || 0,
          );

          setTotalResenas(
            Number(
              datosResumen.total_resenas,
            ) || 0,
          );

          setPromedioCalificacion(
            Number(
              datosResumen.promedio_calificacion,
            ) || 0,
          );

          setResenas(
            Array.isArray(
              datosResumen.resenas,
            )
              ? datosResumen.resenas
              : [],
          );
        } else {
          const datosError =
            await leerRespuestaJson<ResumenEmpleadoRespuesta>(
              respuestaResumen,
            );

          console.error(
            'No se pudo cargar el resumen:',
            datosError.detalle ||
              datosError.mensaje,
          );

          setTotalTrabajos(0);
          setTotalResenas(0);
          setPromedioCalificacion(0);
          setResenas([]);
        }
      } catch (errorDesconocido) {
        console.error(
          'Error al cargar el empleado:',
          errorDesconocido,
        );

        setWorker(null);
        setCategorias([]);
        setSubcategorias([]);
        setResenas([]);
        setTotalTrabajos(0);
        setTotalResenas(0);
        setPromedioCalificacion(0);

        setError(
          errorDesconocido instanceof Error
            ? errorDesconocido.message
            : 'No se pudo cargar la información del empleado',
        );
      } finally {
        setCargando(false);
      }
    }

    void obtenerPerfilCompleto();
  }, [id]);

  if (cargando) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />

        <p className="mt-3 text-sm text-muted-foreground">
          Cargando perfil...
        </p>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-5">
        <p className="text-center text-sm text-red-500">
          {error ||
            'Empleado no encontrado'}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-white"
        >
          Regresar
        </button>
      </div>
    );
  }

  const estadoNormalizado =
    worker.estado
      ?.trim()
      .toLowerCase();

  const estaDisponible =
    estadoNormalizado ===
      'disponible' ||
    estadoNormalizado === 'activo';

  const galeria = Array.isArray(
    worker.galeria,
  )
    ? worker.galeria.filter(Boolean)
    : [];

  const imagenPrincipal =
    galeria[0] ||
    worker.foto ||
    '';

  return (
    <div className="flex min-h-full flex-col">
      {/* Imagen principal */}
      <div className="relative">
        <ImageWithFallback
          src={imagenPrincipal}
          alt={worker.nombre_E}
          className="h-52 w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
          aria-label="Regresar"
        >
          <ChevronLeft className="h-5 w-5 text-white" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (
              navigator.share
            ) {
              void navigator.share({
                title:
                  worker.nombre_E,
                text:
                  `Mira el perfil de ${worker.nombre_E}`,
                url:
                  window.location.href,
              });
            }
          }}
          className="absolute right-4 top-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
          aria-label="Compartir perfil"
        >
          <Share2 className="h-4 w-4 text-white" />
        </button>

        <div className="absolute -bottom-10 left-5">
          <div className="relative">
            <ImageWithFallback
              src={
                worker.foto ||
                imagenPrincipal
              }
              alt={worker.nombre_E}
              className="h-20 w-20 rounded-2xl border-4 border-background object-cover shadow-lg"
            />

            {estaDisponible && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-green-500">
                <CheckCircle className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-14">
        {/* Nombre y estado */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-foreground">
              {worker.nombre_E}
            </h1>

            <div className="mt-0.5 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

              <span className="truncate text-sm text-muted-foreground">
                {worker.direccion ||
                  'Dirección no disponible'}
              </span>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              estaDisponible
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {estaDisponible
              ? 'Disponible'
              : 'Ocupado'}
          </span>
        </div>

        {/* Contadores reales */}
        <div className="mt-4 flex gap-4 border-y border-border py-4">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

              <span className="font-bold text-foreground">
                {promedioCalificacion.toFixed(
                  1,
                )}
              </span>
            </div>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {totalResenas}{' '}
              {totalResenas === 1
                ? 'reseña'
                : 'reseñas'}
            </p>
          </div>

          <div className="w-px bg-border" />

          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Briefcase className="h-4 w-4 text-[#1A56DB]" />

              <span className="font-bold text-foreground">
                {totalTrabajos}
              </span>
            </div>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Trabajos completados
            </p>
          </div>
        </div>

        {/* Categorías */}
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {categorias.length > 0 ? (
              categorias.map(
                (categoria) => (
                  <span
                    key={
                      categoria.id_categoria
                    }
                    className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                  >
                    {categoria.nombre
                      .charAt(0)
                      .toUpperCase() +
                      categoria.nombre.slice(
                        1,
                      )}
                  </span>
                ),
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Este empleado no tiene categorías asignadas.
              </p>
            )}
          </div>
        </div>

        {/* Sobre mí */}
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-foreground">
            Sobre mí
          </h3>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {worker.sobre_mi ||
              'Este empleado aún no ha agregado información sobre sí mismo.'}
          </p>
        </div>

        {/* Servicios */}
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-foreground">
            Servicios que ofrezco
          </h3>

          <div className="flex flex-wrap gap-2">
            {subcategorias.length >
            0 ? (
              subcategorias.map(
                (subcategoria) => (
                  <span
                    key={
                      subcategoria.id_subcategoria
                    }
                    className="rounded-full border border-[#1A56DB]/20 bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
                  >
                    {subcategoria.nombre ||
                      subcategoria.nombre_subcategoria ||
                      'Subcategoría sin nombre'}
                  </span>
                ),
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Este empleado todavía no tiene servicios específicos seleccionados.
              </p>
            )}
          </div>
        </div>

        {/* Galería */}
        {galeria.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold text-foreground">
              Galería de trabajos
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {galeria.map(
                (url, index) => (
                  <motion.div
                    key={`${url}-${index}`}
                    whileTap={{
                      scale: 0.96,
                    }}
                    className="aspect-square overflow-hidden rounded-xl"
                  >
                    <ImageWithFallback
                      src={url}
                      alt={`Trabajo ${
                        index + 1
                      }`}
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                ),
              )}
            </div>
          </div>
        )}

        {/* Reseñas reales */}
        <div className="mb-24 mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Reseñas ({totalResenas})
            </h3>

            <div className="flex items-center gap-1">
              <StarRating
                value={
                  promedioCalificacion
                }
                size="xs"
              />

              <span className="text-xs font-semibold text-foreground">
                {promedioCalificacion.toFixed(
                  1,
                )}
              </span>
            </div>
          </div>

          {resenas.length > 0 ? (
            <div className="flex flex-col gap-3">
              {resenas.map(
                (resena) => (
                  <div
                    key={resena.id_resena}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    <ReviewCard
                      review={{
                        id: String(
                          resena.id_resena,
                        ),

                        bookingId: String(
                          resena.id_servicio,
                        ),

                        reviewerId: '',

                        reviewerName:
                          resena.nombre_cliente ||
                          'Cliente',

                        reviewerAvatarUrl:
                          resena.foto_cliente ||
                          '',

                        targetId: String(
                          worker.id_empleado,
                        ),

                        rating:
                          Number(
                            resena.calificacion_general,
                          ) || 0,

                        punctualityRating:
                          Number(
                            resena.puntualidad,
                          ) || 0,

                        qualityRating:
                          Number(
                            resena.calidad,
                          ) || 0,

                        communicationRating:
                          Number(
                            resena.comunicacion,
                          ) || 0,

                        comment:
                          resena.comentario ||
                          '',

                        date:
                          formatearFecha(
                            resena.fecha,
                          ),
                      }}
                    />

                    {String(
                      resena.respuesta_evaluado ??
                        '',
                    ).trim() && (
                      <div className="mx-4 mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-bold text-[#1A56DB]">
                          Respuesta del trabajador
                        </p>

                        <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-foreground">
                          {
                            resena.respuesta_evaluado
                          }
                        </p>

                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {formatearFecha(
                            resena.fecha_respuesta,
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card px-5 py-6 text-center">
              <Star className="mx-auto h-7 w-7 text-muted-foreground" />

              <p className="mt-3 text-sm font-semibold text-foreground">
                Aún no tiene reseñas
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Las opiniones de sus clientes aparecerán aquí.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botones inferiores */}
     <div className="sticky bottom-0 flex gap-3 border-t border-border bg-card px-5 py-3">
  <motion.button
    type="button"
    whileTap={{ scale: 0.97 }}
    onClick={() =>
      navigate(`/home/chat/${worker.id_empleado}`)
    }
    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#1A56DB] py-3 font-semibold text-[#1A56DB]"
  >
    <MessageCircle className="h-4 w-4" />
    Chat
  </motion.button>

  <motion.button
    type="button"
    whileTap={{ scale: 0.97 }}
    onClick={() => navigate('/home/search')}
    className="flex-1 rounded-xl bg-[#1A56DB] px-6 py-3 font-semibold text-white shadow-lg shadow-[#1A56DB]/30"
  >
    Solicitar servicio
  </motion.button>
</div>
  </div>
  );
}