import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'motion/react';
import {
  Briefcase,
  CheckCircle,
  ChevronLeft,
  DollarSign,
  MapPin,
  MessageCircle,
  Share2,
  Star,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';

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

export default function WorkerProfileScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [worker, setWorker] = useState<Empleado | null>(null);
  const [categorias, setCategorias] = useState<CategoriaEmpleado[]>([]);
  const [subcategorias, setSubcategorias] =
    useState<SubcategoriaEmpleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const parsearJsonSeguro = async (respuesta: Response) => {
      const texto = await respuesta.text();

      if (!texto) {
        return null;
      }

      try {
        return JSON.parse(texto);
      } catch {
        return null;
      }
    };

    const obtenerEmpleado = async () => {
      const idEmpleado = Number(id);

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        setError('No se recibió un ID de empleado válido');
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const respuestaEmpleado = await fetch(
          `http://localhost:3000/api/empleados/${idEmpleado}`,
          {
            cache: 'no-store',
          }
        );

        if (!respuestaEmpleado.ok) {
          const datosError =
            await parsearJsonSeguro(respuestaEmpleado);

          throw new Error(
            datosError?.mensaje ||
              `No se pudo obtener el empleado. Código: ${respuestaEmpleado.status}`
          );
        }

        const datosEmpleado =
          await parsearJsonSeguro(respuestaEmpleado);

        const empleadoRecibido =
          datosEmpleado?.empleado ??
          datosEmpleado ??
          null;

        if (
          !empleadoRecibido ||
          typeof empleadoRecibido !== 'object'
        ) {
          throw new Error(
            'No se pudo cargar la información del empleado'
          );
        }

        setWorker(empleadoRecibido as Empleado);

        const [
          respuestaCategorias,
          respuestaSubcategorias,
        ] = await Promise.all([
          fetch(
            `http://localhost:3000/api/empleados/${idEmpleado}/categorias`,
            {
              cache: 'no-store',
            }
          ),
          fetch(
            `http://localhost:3000/api/empleados/${idEmpleado}/subcategorias`,
            {
              cache: 'no-store',
            }
          ),
        ]);

        if (respuestaCategorias.ok) {
          const datosCategorias =
            await parsearJsonSeguro(
              respuestaCategorias
            );

          setCategorias(
            Array.isArray(datosCategorias)
              ? datosCategorias
              : Array.isArray(
                    datosCategorias?.categorias
                  )
                ? datosCategorias.categorias
                : []
          );
        } else {
          setCategorias(
            Array.isArray(
              (empleadoRecibido as Empleado)
                .categorias
            )
              ? (empleadoRecibido as Empleado)
                  .categorias!
              : []
          );
        }

        if (respuestaSubcategorias.ok) {
          const datosSubcategorias =
            await parsearJsonSeguro(
              respuestaSubcategorias
            );

          setSubcategorias(
            Array.isArray(datosSubcategorias)
              ? datosSubcategorias
              : Array.isArray(
                    datosSubcategorias
                      ?.subcategorias
                  )
                ? datosSubcategorias
                    .subcategorias
                : []
          );
        } else {
          setSubcategorias([]);
        }
      } catch (error) {
        console.error(
          'Error al cargar el empleado:',
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : 'No se pudo cargar la información del empleado'
        );
      } finally {
        setCargando(false);
      }
    };

    obtenerEmpleado();
  }, [id]);

  if (cargando) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Cargando perfil...
        </p>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-5">
        <p className="text-center text-sm text-red-500">
          {error || 'Empleado no encontrado'}
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
    worker.estado?.trim().toLowerCase();

  const estaDisponible =
    estadoNormalizado === 'disponible' ||
    estadoNormalizado === 'activo';

  const galeria = Array.isArray(worker.galeria)
    ? worker.galeria.filter(Boolean)
    : [];

  const imagenPrincipal =
    galeria[0] || worker.foto || '';

  return (
    <div className="flex min-h-full flex-col">
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
          className="absolute right-4 top-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm"
          aria-label="Compartir perfil"
        >
          <Share2 className="h-4 w-4 text-white" />
        </button>

        <div className="absolute -bottom-10 left-5">
          <div className="relative">
            <ImageWithFallback
              src={worker.foto || imagenPrincipal}
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
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {worker.nombre_E}
            </h1>

            <div className="mt-0.5 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />

              <span className="text-sm text-muted-foreground">
                {worker.direccion ||
                  'Dirección no disponible'}
              </span>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
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

        <div className="mt-4 flex gap-4 border-y border-border py-4">
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

              <span className="font-bold text-foreground">
                {Number(
                  worker.calificacion ?? 0
                )}
              </span>
            </div>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {Number(
                worker.cantidad_resenas ?? 0
              )}{' '}
              reseñas
            </p>
          </div>

          <div className="w-px bg-border" />

          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-1">
              <Briefcase className="h-4 w-4 text-[#1A56DB]" />

              <span className="font-bold text-foreground">
                {Number(worker.N_trabajos ?? 0)}
              </span>
            </div>

            <p className="mt-0.5 text-[11px] text-muted-foreground">
              trabajos
            </p>
          </div>

          
        </div>

        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {categorias.length > 0 ? (
              categorias.map((categoria) => (
                <span
                  key={categoria.id_categoria}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                >
                  {categoria.nombre.charAt(0).toUpperCase() + categoria.nombre.slice(1)}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Este empleado no tiene categorías
                asignadas.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-foreground">
            Sobre mí
          </h3>

          <p className="text-sm leading-relaxed text-muted-foreground">
            {worker.sobre_mi ||
              'Este empleado aún no ha agregado información sobre sí mismo.'}
          </p>
        </div>

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-foreground">
            Servicios que ofrezco
          </h3>

          <div className="flex flex-wrap gap-2">
            {subcategorias.length > 0 ? (
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
                )
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                Este empleado todavía no tiene
                subcategorías seleccionadas.
              </p>
            )}
          </div>
        </div>

        {galeria.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold text-foreground">
              Galería de trabajos
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {galeria.map((url, index) => (
                <motion.div
                  key={`${url}-${index}`}
                  whileTap={{ scale: 0.96 }}
                  className="aspect-square overflow-hidden rounded-xl"
                >
                  <ImageWithFallback
                    src={url}
                    alt={`Trabajo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-24 mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Reseñas (
              {Number(
                worker.cantidad_resenas ?? 0
              )}
              )
            </h3>

            <div className="flex items-center gap-1">
              <StarRating
                value={Number(
                  worker.calificacion ?? 0
                )}
                size="xs"
              />

              <span className="text-xs font-semibold text-foreground">
                {Number(
                  worker.calificacion ?? 0
                )}
              </span>
            </div>
          </div>

          <p className="py-4 text-center text-sm text-muted-foreground">
            Sin reseñas disponibles.
          </p>
        </div>
      </div>

      <div className="sticky bottom-0 flex gap-3 border-t border-border bg-card px-5 py-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            navigate(
              `/home/chat/${worker.id_empleado}`
            )
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[#1A56DB] py-3 font-semibold text-[#1A56DB]"
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() =>
            navigate('/home/payment', {
              state: {
                workerId:
                  worker.id_empleado,
                workerName: worker.nombre_E,
              },
            })
          }
          className="flex-1 rounded-xl bg-[#1A56DB] px-6 py-3 font-semibold text-white shadow-lg shadow-[#1A56DB]/30"
        >
          Contratar ahora
        </motion.button>
      </div>
    </div>
  );
}