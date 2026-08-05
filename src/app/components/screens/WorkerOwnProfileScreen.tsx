import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Settings,
  Star,
  MapPin,
  ChevronRight,
  LogOut,
  Edit2,
  X,
  AlertTriangle,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { ReviewCard } from '../shared/ReviewCard';
import { useApp } from '../../context/AppContext';

import EditProfileScreen from './EditProfileScreen';
import EditServiceScreen from './EditServiceScreen';

const API_URL = 'https://servicios-59g4.onrender.com/api';
const API_ORIGIN = 'https://servicios-59g4.onrender.com';

function normalizarUrlArchivo(
  valor?: string | null,
): string {
  const url = String(valor ?? '').trim();

  if (!url) {
    return '';
  }

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`;
  }

  return `${API_ORIGIN}/${url}`;
}

function obtenerEmpleadoRespuesta(
  datos: any,
): any {
  return (
    datos?.empleado ??
    datos?.recordset?.[0] ??
    datos?.recordsets?.[0]?.[0] ??
    datos
  );
}

interface Categoria {
  id_categoria: number | string;
  nombre: string;
  subCatgeoria?: string;
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

interface RespuestaCategorias {
  categorias?: Categoria[];
  mensaje?: string;
  detalle?: string;
}

interface RespuestaEvidencia {
  url?: string;
  mensaje?: string;
  detalle?: string;
}

interface ImagenGaleria {
  id_evidencia?: number;
  url_archivo?: string;
  fecha_subida?: string | null;
}

interface RespuestaGaleria {
  galeria?: ImagenGaleria[];
  imagen?: ImagenGaleria | null;
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

function normalizarFecha(
  fecha?: string | null,
): Date | null {
  if (!fecha) {
    return null;
  }

  const valor = String(fecha).trim();

  if (!valor) {
    return null;
  }

  /*
   * SQL Server puede devolver:
   * 2026-08-04
   * 2026-08-04T00:00:00.000Z
   * 2026-08-04 00:00:00.0000000
   */
  const coincidencia =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(
      valor,
    );

  if (coincidencia) {
    const anio = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);
    const dia = Number(coincidencia[3]);
    const hora = Number(coincidencia[4] ?? 0);
    const minuto = Number(coincidencia[5] ?? 0);
    const segundo = Number(coincidencia[6] ?? 0);

    const fechaLocal = new Date(
      anio,
      mes - 1,
      dia,
      hora,
      minuto,
      segundo,
      0,
    );

    if (!Number.isNaN(fechaLocal.getTime())) {
      return fechaLocal;
    }
  }

  const fechaInterpretada = new Date(valor);

  if (Number.isNaN(fechaInterpretada.getTime())) {
    return null;
  }

  return fechaInterpretada;
}

function formatearFecha(
  fecha?: string | null,
): string {
  const fechaConvertida =
    normalizarFecha(fecha);

  if (!fechaConvertida) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat(
    'es-HN',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  ).format(fechaConvertida);
}

function fechaParaReviewCard(
  fecha?: string | null,
): string {
  const fechaConvertida =
    normalizarFecha(fecha);

  if (!fechaConvertida) {
    return new Date(0).toISOString();
  }

  /*
   * ReviewCard vuelve a ejecutar new Date(review.date).
   * Por eso debe recibir una fecha ISO, no una fecha ya
   * formateada como "4 ago 2026".
   */
  return fechaConvertida.toISOString();
}

export default function WorkerOwnProfileScreen() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useApp();

  const [isEditing, setIsEditing] =
    useState(false);

  const [isEditingServices, setIsEditingServices] =
    useState(false);

  const [categorias, setCategorias] =
    useState<Categoria[]>([]);

  const [errorMessage, setErrorMessage] =
    useState('');

  const [subiendoEvidencia, setSubiendoEvidencia] =
    useState(false);

  const [subiendoFotoPerfil, setSubiendoFotoPerfil] =
    useState(false);

  const inputFotoPerfilRef =
    useRef<HTMLInputElement>(null);

  const [galleryUrls, setGalleryUrls] =
    useState<string[]>([]);

  const [selectedImageUrl, setSelectedImageUrl] =
    useState<string | null>(null);

  const [totalTrabajos, setTotalTrabajos] =
    useState(0);

  const [totalResenas, setTotalResenas] =
    useState(0);

  const [
    promedioCalificacion,
    setPromedioCalificacion,
  ] = useState(0);

  const [resenas, setResenas] =
    useState<ResenaEmpleado[]>([]);

  const [cargandoResumen, setCargandoResumen] =
    useState(true);

  const [
    idResenaRespondiendo,
    setIdResenaRespondiendo,
  ] = useState<number | null>(null);

  const [
    textoRespuesta,
    setTextoRespuesta,
  ] = useState('');

  const [
    enviandoRespuesta,
    setEnviandoRespuesta,
  ] = useState(false);

  const idEmpleado = Number(
    currentUser?.idEmpleado ??
      currentUser?.id,
  );

  const mostrarError = (mensaje: string) => {
    setErrorMessage(mensaje);

    window.setTimeout(() => {
      setErrorMessage('');
    }, 4000);
  };

  const worker = {
    id: String(
      currentUser?.idEmpleado ??
        currentUser?.id ??
        '',
    ),

    name:
      currentUser?.name ??
      (currentUser as any)?.nombre ??
      (currentUser as any)?.nombre_E ??
      'Trabajador',

    avatarUrl: normalizarUrlArchivo(
      currentUser?.avatarUrl ??
        (currentUser as any)?.foto_url ??
        (currentUser as any)?.foto ??
        (currentUser as any)?.photoUrl,
    ),

    location:
      (
        currentUser?.location ??
        (currentUser as any)?.direccion
      ) &&
      (
        currentUser?.location ??
        (currentUser as any)?.direccion
      ) !== 'No especificada'
        ? String(
            currentUser?.location ??
              (currentUser as any)?.direccion,
          )
        : 'Ubicación no especificada',

    rating:
      promedioCalificacion,

    reviewCount:
      totalResenas,

    jobCount:
      totalTrabajos,

    pricePerHour: 0,
  };

  const cargarCategorias = async () => {
    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      setCategorias([]);
      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/empleados/${idEmpleado}/categorias`,
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );

      const datos =
        await leerRespuestaJson<
          Categoria[] | RespuestaCategorias
        >(respuesta);

      if (!respuesta.ok) {
        const respuestaError =
          datos as RespuestaCategorias;

        throw new Error(
          respuestaError.detalle ||
            respuestaError.mensaje ||
            'No se pudieron cargar las categorías',
        );
      }

      const categoriasRecibidas =
        Array.isArray(datos)
          ? datos
          : Array.isArray(datos.categorias)
            ? datos.categorias
            : [];

      setCategorias(categoriasRecibidas);
    } catch (error) {
      console.error(
        'Error al cargar categorías:',
        error,
      );

      setCategorias([]);
    }
  };

  const cargarGaleriaEmpleado = async () => {
    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      setGalleryUrls([]);
      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/empleados/${idEmpleado}/galeria`,
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );

      const datos =
        await leerRespuestaJson<RespuestaGaleria>(
          respuesta,
        );

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo cargar la galería',
        );
      }

      const urls = Array.isArray(datos.galeria)
        ? datos.galeria
            .map((imagen) =>
              normalizarUrlArchivo(
                imagen.url_archivo,
              ),
            )
            .filter(Boolean)
        : [];

      setGalleryUrls(urls);
    } catch (error) {
      console.error(
        'Error al cargar galería:',
        error,
      );

      setGalleryUrls([]);
    }
  };

  const cargarResumenEmpleado = async () => {
    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      setTotalTrabajos(0);
      setTotalResenas(0);
      setPromedioCalificacion(0);
      setResenas([]);
      setCargandoResumen(false);
      return;
    }

    try {
      setCargandoResumen(true);

      const respuesta = await fetch(
        `${API_URL}/empleados/${idEmpleado}/resumen-perfil`,
        {
          cache: 'no-store',
          credentials: 'include',
        },
      );

      const datos =
        await leerRespuestaJson<ResumenEmpleadoRespuesta>(
          respuesta,
        );

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo cargar el resumen del empleado',
        );
      }

      setTotalTrabajos(
        Number(datos.total_trabajos) ||
          0,
      );

      setTotalResenas(
        Number(datos.total_resenas) ||
          0,
      );

      setPromedioCalificacion(
        Number(
          datos.promedio_calificacion,
        ) || 0,
      );

      setResenas(
        Array.isArray(datos.resenas)
          ? datos.resenas
          : [],
      );
    } catch (error) {
      console.error(
        'Error al cargar resumen del empleado:',
        error,
      );

      setTotalTrabajos(0);
      setTotalResenas(0);
      setPromedioCalificacion(0);
      setResenas([]);

      mostrarError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar el perfil del trabajador',
      );
    } finally {
      setCargandoResumen(false);
    }
  };

  const publicarRespuesta = async (
    idResena: number,
  ) => {
    const textoLimpio =
      textoRespuesta.trim();

    if (
      !Number.isInteger(idResena) ||
      idResena <= 0
    ) {
      const mensaje =
        'El ID de la reseña es inválido';

      mostrarError(mensaje);
      window.alert(mensaje);
      return;
    }

    if (textoLimpio.length < 3) {
      const mensaje =
        'La respuesta debe tener al menos 3 caracteres';

      mostrarError(mensaje);
      window.alert(mensaje);
      return;
    }

    if (textoLimpio.length > 500) {
      const mensaje =
        'La respuesta no puede superar los 500 caracteres';

      mostrarError(mensaje);
      window.alert(mensaje);
      return;
    }

    try {
      setEnviandoRespuesta(true);
      setErrorMessage('');

      const url =
        `${API_URL}/resenas/${idResena}/respuesta`;

      console.log(
        'Publicando respuesta de reseña:',
        {
          idResena,
          textoLimpio,
          url,
        },
      );

      const respuesta = await fetch(
        url,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            respuesta: textoLimpio,
          }),
        },
      );

      const datos =
        await leerRespuestaJson<{
          mensaje?: string;
          respuesta?: {
            id_resena: number;
            respuesta_evaluado: string;
            fecha_respuesta: string;
          };
          detalle?: string;
        }>(respuesta);

      console.log(
        'Respuesta del servidor:',
        {
          status: respuesta.status,
          ok: respuesta.ok,
          datos,
        },
      );

      if (!respuesta.ok) {
        const mensajeError =
          datos.detalle ||
          datos.mensaje ||
          `Error ${respuesta.status}`;

        window.alert(
          `No se pudo publicar la respuesta.\n\nEstado: ${respuesta.status}\nMensaje: ${mensajeError}`,
        );

        throw new Error(
          mensajeError,
        );
      }

      setResenas((actuales) =>
        actuales.map((resena) =>
          resena.id_resena === idResena
            ? {
                ...resena,
                respuesta_evaluado:
                  datos.respuesta
                    ?.respuesta_evaluado ??
                  textoLimpio,
                fecha_respuesta:
                  datos.respuesta
                    ?.fecha_respuesta ??
                  new Date().toISOString(),
              }
            : resena,
        ),
      );

      setIdResenaRespondiendo(null);
      setTextoRespuesta('');

      window.alert(
        datos.mensaje ||
          'Respuesta publicada correctamente',
      );
    } catch (error) {
      console.error(
        'Error al responder la reseña:',
        error,
      );

      const mensajeError =
        error instanceof Error
          ? error.message
          : 'No se pudo publicar la respuesta';

      mostrarError(
        mensajeError,
      );

      /*
       * Evita mostrar dos alertas cuando el error
       * ya fue presentado con el estado HTTP.
       */
      if (
        !mensajeError.startsWith(
          'Error ',
        )
      ) {
        console.log(
          'Detalle final del error:',
          mensajeError,
        );
      }
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  useEffect(() => {
    void cargarCategorias();
  }, [idEmpleado]);

  useEffect(() => {
    void cargarResumenEmpleado();
  }, [idEmpleado]);

  useEffect(() => {
    void cargarGaleriaEmpleado();
  }, [idEmpleado]);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };


  const handleCambiarFotoPerfil = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const archivo = event.target.files?.[0];

    if (!archivo) {
      return;
    }

    try {
      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        throw new Error(
          'No se encontró el ID del trabajador',
        );
      }

      const tiposPermitidos = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (!tiposPermitidos.includes(archivo.type)) {
        throw new Error(
          'Selecciona una imagen JPG, PNG o WEBP',
        );
      }

      if (archivo.size > 5 * 1024 * 1024) {
        throw new Error(
          'La imagen no puede superar los 5 MB',
        );
      }

      setSubiendoFotoPerfil(true);
      setErrorMessage('');

      const contenido =
        await new Promise<string>(
          (resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () =>
              resolve(
                String(reader.result ?? ''),
              );

            reader.onerror = () =>
              reject(
                new Error(
                  'No se pudo leer la imagen',
                ),
              );

            reader.readAsDataURL(archivo);
          },
        );

      const base64 = contenido.split(',')[1];

      if (!base64) {
        throw new Error(
          'No se pudo convertir la imagen',
        );
      }

      const respuestaSubida = await fetch(
        `${API_URL}/upload-foto`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            base64,
            fileName: archivo.name,
            contentType: archivo.type,
          }),
        },
      );

      const datosSubida =
        await leerRespuestaJson<RespuestaEvidencia>(
          respuestaSubida,
        );

      if (!respuestaSubida.ok) {
        throw new Error(
          datosSubida.detalle ||
            datosSubida.mensaje ||
            'No se pudo subir la foto',
        );
      }

      const nuevaFotoGuardada = String(
        datosSubida.url ?? '',
      ).trim();

      const nuevaFotoVisible =
        normalizarUrlArchivo(
          nuevaFotoGuardada,
        );

      if (!nuevaFotoGuardada) {
        throw new Error(
          'El servidor no devolvió la URL de la foto',
        );
      }

      /*
       * Consultamos el perfil actual para no borrar
       * nombre, correo ni los demás datos al guardar
       * únicamente la nueva fotografía.
       */
      const respuestaPerfil = await fetch(
        `${API_URL}/empleados/${idEmpleado}`,
        {
          cache: 'no-store',
        },
      );

      const datosPerfil =
        await leerRespuestaJson<any>(
          respuestaPerfil,
        );

      if (!respuestaPerfil.ok) {
        throw new Error(
          datosPerfil.detalle ||
            datosPerfil.mensaje ||
            'No se pudo consultar el perfil actual',
        );
      }

      const perfilActual =
        obtenerEmpleadoRespuesta(
          datosPerfil,
        );

      const respuestaGuardar = await fetch(
        `${API_URL}/empleados/${idEmpleado}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            nombre_E:
              perfilActual?.nombre_E ??
              perfilActual?.nombre ??
              worker.name,

            correo:
              perfilActual?.correo ??
              (currentUser as any)?.correo ??
              (currentUser as any)?.email ??
              '',

            celular:
              perfilActual?.celular ??
              perfilActual?.telefono ??
              (currentUser as any)?.celular ??
              (currentUser as any)?.phone ??
              '',

            titulo:
              perfilActual?.titulo ??
              '',

            dni:
              perfilActual?.dni ??
              '',

            antecedente:
              perfilActual?.antecedente ??
              perfilActual?.antecedentes ??
              '',

            direccion:
              perfilActual?.direccion ??
              '',

            sobre_mi:
              perfilActual?.sobre_mi ??
              '',

            foto:
              nuevaFotoGuardada,

            foto_url:
              nuevaFotoGuardada,
          }),
        },
      );

      const datosGuardado =
        await leerRespuestaJson<any>(
          respuestaGuardar,
        );

      if (!respuestaGuardar.ok) {
        throw new Error(
          datosGuardado.detalle ||
            datosGuardado.mensaje ||
            'No se pudo guardar la foto de perfil',
        );
      }

      if (currentUser) {
        setCurrentUser({
          ...currentUser,

          avatarUrl:
            nuevaFotoVisible,

          foto:
            nuevaFotoGuardada,

          foto_url:
            nuevaFotoGuardada,

          photoUrl:
            nuevaFotoVisible,
        } as any);
      }

      window.alert(
        'Foto de perfil actualizada correctamente',
      );
    } catch (error) {
      console.error(
        'Error al cambiar foto de perfil:',
        error,
      );

      mostrarError(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la foto',
      );
    } finally {
      setSubiendoFotoPerfil(false);
      event.target.value = '';
    }
  };

  const handleSubirEvidencia = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const archivo =
      event.target.files?.[0];

    if (!archivo) {
      return;
    }

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type,
      )
    ) {
      mostrarError(
        'Solo se permiten imágenes JPG o PNG',
      );

      event.target.value = '';
      return;
    }

    const tamanioMaximo =
      5 * 1024 * 1024;

    if (
      archivo.size > tamanioMaximo
    ) {
      mostrarError(
        'La imagen no puede superar los 5 MB',
      );

      event.target.value = '';
      return;
    }

    try {
      setSubiendoEvidencia(true);
      setErrorMessage('');

      const reader = new FileReader();

      const contenido =
        await new Promise<string>(
          (resolve, reject) => {
            reader.onload = () => {
              resolve(
                String(
                  reader.result ?? '',
                ),
              );
            };

            reader.onerror = () => {
              reject(
                new Error(
                  'No se pudo leer el archivo',
                ),
              );
            };

            reader.readAsDataURL(
              archivo,
            );
          },
        );

      const base64 =
        contenido.split(',')[1];

      if (!base64) {
        throw new Error(
          'No se pudo convertir la imagen',
        );
      }

      const respuesta = await fetch(
        `${API_URL}/upload-evidencia`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            base64,
            fileName: archivo.name,
            contentType: archivo.type,
          }),
        },
      );

      const datos =
        await leerRespuestaJson<RespuestaEvidencia>(
          respuesta,
        );

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo subir la evidencia',
        );
      }

      const nuevaUrlGuardada =
        datos.url;

      const nuevaUrl =
        normalizarUrlArchivo(
          nuevaUrlGuardada,
        );

      if (!nuevaUrlGuardada) {
        throw new Error(
          'El servidor no devolvió la URL de la imagen',
        );
      }

      if (
        !Number.isInteger(idEmpleado) ||
        idEmpleado <= 0
      ) {
        throw new Error(
          'No se encontró el ID del trabajador',
        );
      }

      const respuestaGaleria = await fetch(
        `${API_URL}/empleados/${idEmpleado}/galeria`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            url: nuevaUrlGuardada,
          }),
        },
      );

      const datosGaleria =
        await leerRespuestaJson<RespuestaGaleria>(
          respuestaGaleria,
        );

      if (!respuestaGaleria.ok) {
        throw new Error(
          datosGaleria.detalle ||
            datosGaleria.mensaje ||
            'La imagen se subió, pero no pudo guardarse en la galería',
        );
      }

      setGalleryUrls((actuales) => {
        if (actuales.includes(nuevaUrl)) {
          return actuales;
        }

        return [
          ...actuales,
          nuevaUrl,
        ];
      });

      if (currentUser) {
        const galeriaActual =
          Array.isArray(
            (currentUser as any)
              ?.galleryUrls,
          )
            ? (
                (currentUser as any)
                  .galleryUrls as string[]
              )
                .map((url) =>
                  normalizarUrlArchivo(url),
                )
                .filter(Boolean)
            : [];

        setCurrentUser({
          ...currentUser,

          role:
            currentUser.role ??
            'worker',

          galleryUrls:
            galeriaActual.includes(
              nuevaUrl,
            )
              ? galeriaActual
              : [
                  ...galeriaActual,
                  nuevaUrl,
                ],
        } as any);
      }
    } catch (error) {
      console.error(
        'Error al subir evidencia:',
        error,
      );

      mostrarError(
        error instanceof Error
          ? error.message
          : 'Error al subir la evidencia',
      );
    } finally {
      setSubiendoEvidencia(false);
      event.target.value = '';
    }
  };

  if (isEditing) {
    return (
      <EditProfileScreen
        usuarioActual={worker}
        rol="worker"
        onBack={() =>
          setIsEditing(false)
        }
      />
    );
  }

  if (isEditingServices) {
    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      return (
        <div className="p-5">
          <p className="text-sm text-foreground">
            No se pudo obtener el ID del trabajador.
          </p>

          <button
            type="button"
            onClick={() =>
              setIsEditingServices(
                false,
              )
            }
            className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-white"
          >
            Volver
          </button>
        </div>
      );
    }

    return (
      <EditServiceScreen
        idEmpleado={idEmpleado}
        onBack={() => {
          setIsEditingServices(false);
          void cargarCategorias();
        }}
      />
    );
  }

  return (
    <div className="pb-6">
      {errorMessage && (
        <div className="px-5 pt-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="bg-[#1A56DB] px-5 pb-16 pt-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">
            Mi Perfil
          </h1>

          <button
            type="button"
            onClick={() =>
              setIsEditing(true)
            }
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
            aria-label="Editar perfil"
          >
            <Settings className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* Tarjeta principal */}
      <div className="-mt-12 px-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="relative">
              <ImageWithFallback
                src={
                  worker.avatarUrl
                }
                alt={worker.name}
                className="h-16 w-16 rounded-2xl object-cover"
              />

              <button
                type="button"
                onClick={() =>
                  inputFotoPerfilRef.current?.click()
                }
                disabled={subiendoFotoPerfil}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1A56DB] shadow disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Cambiar foto de perfil"
              >
                {subiendoFotoPerfil ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Edit2 className="h-3.5 w-3.5 text-white" />
                )}
              </button>

              <input
                ref={inputFotoPerfilRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCambiarFotoPerfil}
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground">
                {worker.name}
              </h2>

              <div className="mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />

                <span className="truncate text-xs text-muted-foreground">
                  {worker.location}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-1">
                <StarRating
                  value={
                    worker.rating
                  }
                  size="xs"
                />

                <span className="text-xs font-semibold text-foreground">
                  {cargandoResumen
                    ? '...'
                    : worker.rating.toFixed(
                        1,
                      )}
                </span>

                <span className="text-xs text-muted-foreground">
                  (
                  {cargandoResumen
                    ? '...'
                    : worker.reviewCount}
                  )
                </span>
              </div>
            </div>
          </div>

          {/* Contadores reales */}
          <div className="mt-4 flex gap-4 border-t border-border pt-4">
            <div className="flex-1 text-center">
              <p className="text-base font-bold text-foreground">
                {cargandoResumen
                  ? '...'
                  : worker.jobCount}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Trabajos completados
              </p>
            </div>

            <div className="w-px bg-border" />

            <div className="flex-1 text-center">
              <p className="text-base font-bold text-foreground">
                {cargandoResumen
                  ? '...'
                  : worker.reviewCount}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Reseñas recibidas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Servicios */}
      <div className="mt-5 px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Mis servicios
          </h2>

          <button
            type="button"
            onClick={() => {
              if (
                !Number.isInteger(
                  idEmpleado,
                ) ||
                idEmpleado <= 0
              ) {
                mostrarError(
                  'No se encontró el ID del trabajador. Cierra sesión y vuelve a entrar.',
                );

                return;
              }

              setIsEditingServices(
                true,
              );
            }}
            className="text-xs font-semibold text-[#1A56DB]"
          >
            Editar
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categorias.length > 0 ? (
            categorias.map(
              (categoria) => (
                <span
                  key={String(
                    categoria.id_categoria,
                  )}
                  className="rounded-full border border-[#1A56DB]/20 bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
                >

                  {categoria.nombre .charAt(0).toUpperCase() + categoria.nombre.slice(1)}

                  

                </span>
              ),
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              No tienes servicios seleccionados.
            </p>
          )}
        </div>
      </div>

      {/* Galería */}
      <div className="mt-5 px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Galería
          </h2>

          <label
            className={`text-xs text-[#1A56DB] ${
              subiendoEvidencia
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer'
            }`}
          >
            {subiendoEvidencia
              ? 'Subiendo...'
              : 'Agregar foto'}

            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              disabled={
                subiendoEvidencia
              }
              onChange={
                handleSubirEvidencia
              }
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {galleryUrls.length > 0 ? (
            galleryUrls.map(
              (url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() =>
                    setSelectedImageUrl(
                      url,
                    )
                  }
                  className="aspect-square overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A56DB]"
                >
                  <ImageWithFallback
                    src={url}
                    alt={`Trabajo ${
                      index + 1
                    }`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ),
            )
          ) : (
            <p className="col-span-3 text-xs text-muted-foreground">
              Aún no tienes fotos en la galería.
            </p>
          )}
        </div>
      </div>

      {/* Modal de imagen */}
      {selectedImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-3 shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setSelectedImageUrl(
                  null,
                )
              }
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white"
              aria-label="Cerrar imagen"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="overflow-hidden rounded-xl">
              <img
                src={
                  selectedImageUrl
                }
                alt="Vista previa de la galería"
                className="max-h-[80vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reseñas reales */}
      <div className="mt-5 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Reseñas (
            {cargandoResumen
              ? '...'
              : worker.reviewCount}
            )
          </h2>

          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

            <span className="text-sm font-bold">
              {cargandoResumen
                ? '...'
                : worker.rating.toFixed(
                    1,
                  )}
            </span>
          </div>
        </div>

        {cargandoResumen ? (
          <div className="rounded-xl border border-border bg-card p-5 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />

            <p className="mt-3 text-xs text-muted-foreground">
              Cargando reseñas...
            </p>
          </div>
        ) : resenas.length > 0 ? (
          <div className="flex flex-col gap-3">
            {resenas.map(
              (resena) => {
                const respuestaExistente =
                  String(
                    resena.respuesta_evaluado ??
                      '',
                  ).trim();

                const formularioAbierto =
                  idResenaRespondiendo ===
                  resena.id_resena;

                return (
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

                        targetId:
                          String(
                            idEmpleado,
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
                          fechaParaReviewCard(
                            resena.fecha,
                          ),
                      }}
                    />

                    {respuestaExistente ? (
                      <div className="mx-4 mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-bold text-[#1A56DB]">
                          Tu respuesta
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
                    ) : formularioAbierto ? (
                      <div className="mx-4 mb-4 rounded-xl border border-border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground">
                            Responder reseña
                          </p>

                          <span
                            className={`text-xs ${
                              textoRespuesta.trim()
                                .length >= 3
                                ? 'text-green-600'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {
                              textoRespuesta.length
                            }
                            /500
                          </span>
                        </div>

                        <textarea
                          value={
                            textoRespuesta
                          }
                          onChange={(event) =>
                            setTextoRespuesta(
                              event.target.value.slice(
                                0,
                                500,
                              ),
                            )
                          }
                          rows={4}
                          disabled={
                            enviandoRespuesta
                          }
                          placeholder="Escribe una respuesta profesional para este cliente..."
                          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-[#1A56DB]/30 disabled:opacity-60"
                        />

                        <p className="mt-2 text-xs text-muted-foreground">
                          Solo puedes publicar una respuesta y después no podrá modificarse.
                        </p>

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={
                              enviandoRespuesta
                            }
                            onClick={() => {
                              setIdResenaRespondiendo(
                                null,
                              );
                              setTextoRespuesta(
                                '',
                              );
                            }}
                            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-50"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            disabled={
                              enviandoRespuesta ||
                              textoRespuesta.trim()
                                .length < 3
                            }
                            onClick={() =>
                              void publicarRespuesta(
                                resena.id_resena,
                              )
                            }
                            className="rounded-xl bg-[#1A56DB] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {enviandoRespuesta
                              ? 'Publicando...'
                              : 'Publicar respuesta'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-4">
                        <button
                          type="button"
                          onClick={() => {
                            setIdResenaRespondiendo(
                              resena.id_resena,
                            );
                            setTextoRespuesta(
                              '',
                            );
                          }}
                          className="w-full rounded-xl border border-[#1A56DB]/30 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-[#1A56DB]"
                        >
                          Responder reseña
                        </button>
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card px-5 py-6 text-center">
            <Star className="mx-auto h-7 w-7 text-muted-foreground" />

            <p className="mt-3 text-sm font-semibold text-foreground">
              Aún no tienes reseñas
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Las opiniones de tus clientes aparecerán aquí.
            </p>
          </div>
        )}
      </div>

      {/* Opciones de cuenta */}
      <div className="mt-6 px-5">
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {[
            {
              label:
                'Editar perfil',

              icon:
                Edit2,

              action: () =>
                setIsEditing(true),
            },

            {
              label:
                'Gestionar disponibilidad',

              icon:
                Settings,

              action: () =>
                navigate(
                  '/home/agenda',
                ),
            },

            {
              label:
                'Reportar problema de la aplicación',

              icon:
                AlertTriangle,

              action: () =>
                navigate(
                  '/home/report',
                  {
                    state: {
                      tipoReporte:
                        'aplicacion',
                    },
                  },
                ),
            },
          ].map(
            ({
              label,
              icon: Icon,
              action,
            }) => (
              <button
                type="button"
                key={label}
                onClick={action}
                className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />

                <span className="flex-1 text-left text-sm text-foreground">
                  {label}
                </span>

                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ),
          )}
        </div>

        <motion.button
          type="button"
          whileTap={{
            scale: 0.97,
          }}
          onClick={
            handleLogout
          }
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 font-semibold text-red-600"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const ok = window.confirm('¿Eliminar tu cuenta? Esta acción es irreversible.');
            if (!ok) return;
            try {
              const res = await fetch('https://servicios-59g4.onrender.com/api/account', {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(body.mensaje || 'No se pudo eliminar la cuenta');
              alert('Cuenta eliminada');
              setCurrentUser(null);
              navigate('/');
            } catch (e) {
              console.error(e);
              alert(e instanceof Error ? e.message : 'Error');
            }
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 font-semibold text-red-600"
        >
          Eliminar cuenta
        </motion.button>
      </div>
    </div>
  );
}
