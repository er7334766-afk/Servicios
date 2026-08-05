import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ChevronLeft,
  Send,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { useApp } from '../../context/AppContext';

interface Category {
  id: string;
  label: string;
  color: string;
  bg: string;
}

interface ReportLocationState {
  tipoReporte?: 'aplicacion' | 'usuario';
  idServicio?: number;
  idReportado?: number;
  tipoReportado?: 'client' | 'worker';
}

const APP_CATEGORIES: Category[] = [
  {
    id: 'login',
    label: 'Problema al iniciar sesión',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    id: 'chat',
    label: 'Problema con el chat',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    id: 'images',
    label: 'Problema al subir imágenes',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'payments',
    label: 'Problema con pagos',
    color: '#1A56DB',
    bg: '#EFF4FF',
  },
  {
    id: 'performance',
    label: 'La aplicación no funciona correctamente',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    id: 'other',
    label: 'Otro problema',
    color: '#475569',
    bg: '#F1F5F9',
  },
];

const WORKER_CATEGORIES: Category[] = [
  {
    id: 'inappropriate_behavior',
    label: 'Conducta inapropiada',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    id: 'worker_no_show',
    label: 'No se presentó al servicio',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'payment_problem',
    label: 'Problema relacionado con el pago',
    color: '#1A56DB',
    bg: '#EFF4FF',
  },
  {
    id: 'poor_service',
    label: 'Mala calidad del servicio',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    id: 'unfinished_work',
    label: 'Trabajo incompleto o abandonado',
    color: '#9333EA',
    bg: '#FAF5FF',
  },
  {
    id: 'property_damage',
    label: 'Daños a la propiedad',
    color: '#EA580C',
    bg: '#FFF7ED',
  },
  {
    id: 'harassment',
    label: 'Acoso o amenazas',
    color: '#BE123C',
    bg: '#FFF1F2',
  },
  {
    id: 'other',
    label: 'Otro motivo',
    color: '#475569',
    bg: '#F1F5F9',
  },
];

const CLIENT_CATEGORIES: Category[] = [
  {
    id: 'inappropriate_behavior',
    label: 'Conducta inapropiada',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    id: 'client_unavailable',
    label: 'No estaba disponible para recibir el servicio',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'payment_refusal',
    label: 'Problema o negativa con el pago',
    color: '#1A56DB',
    bg: '#EFF4FF',
  },
  {
    id: 'incorrect_information',
    label: 'Información incorrecta o incompleta del servicio',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    id: 'unsafe_conditions',
    label: 'Condiciones inseguras para trabajar',
    color: '#EA580C',
    bg: '#FFF7ED',
  },
  {
    id: 'access_problem',
    label: 'No permitió el acceso o impidió realizar el trabajo',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    id: 'harassment',
    label: 'Acoso o amenazas',
    color: '#BE123C',
    bg: '#FFF1F2',
  },
  {
    id: 'other',
    label: 'Otro motivo',
    color: '#475569',
    bg: '#F1F5F9',
  },
];

const MAX_PHOTOS = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function ReportScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useApp();

  const locationState =
    (location.state as ReportLocationState | null) ?? null;

  const tipoReporte: 'aplicacion' | 'usuario' =
    locationState?.tipoReporte === 'usuario'
      ? 'usuario'
      : 'aplicacion';

  const tipoReportado =
    locationState?.tipoReportado;

  const categories =
    tipoReporte === 'aplicacion'
      ? APP_CATEGORIES
      : tipoReportado === 'client'
        ? CLIENT_CATEGORIES
        : WORKER_CATEGORIES;

  const [selectedCat, setSelectedCat] =
    useState<string | null>(null);

  const [description, setDescription] =
    useState('');

  const [photos, setPhotos] =
    useState<string[]>([]);

  const [
    imagenAmpliada,
    setImagenAmpliada,
  ] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const fileRef =
    useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    if (selectedFiles.length === 0) {
      return;
    }

    const espaciosDisponibles =
      MAX_PHOTOS - photos.length;

    if (espaciosDisponibles <= 0) {
      toast.error(
        'Solo puedes agregar un máximo de 4 fotos'
      );

      event.target.value = '';
      return;
    }

    const filesToProcess =
      selectedFiles.slice(
        0,
        espaciosDisponibles
      );

    if (
      selectedFiles.length >
      espaciosDisponibles
    ) {
      toast.error(
        `Solo puedes agregar ${espaciosDisponibles} foto${
          espaciosDisponibles === 1 ? '' : 's'
        } más`
      );
    }

    filesToProcess.forEach((file) => {
      const tiposPermitidos = [
        'image/jpeg',
        'image/png',
      ];

      if (
        !tiposPermitidos.includes(file.type)
      ) {
        toast.error(
          `${file.name} no es una imagen JPG o PNG válida`
        );

        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `${file.name} supera el límite de 5 MB`
        );

        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        if (
          typeof reader.result !== 'string'
        ) {
          toast.error(
            `No se pudo leer la imagen ${file.name}`
          );

          return;
        }

        setPhotos((currentPhotos) => {
          if (
            currentPhotos.length >= MAX_PHOTOS
          ) {
            return currentPhotos;
          }

          return [
            ...currentPhotos,
            reader.result as string,
          ];
        });
      };

      reader.onerror = () => {
        toast.error(
          `No se pudo leer la imagen ${file.name}`
        );
      };

      reader.readAsDataURL(file);
    });

    event.target.value = '';
  };

  const removePhoto = (
    photoIndex: number
  ) => {
    setPhotos((currentPhotos) =>
      currentPhotos.filter(
        (_, index) => index !== photoIndex
      )
    );
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const idReportante = Number(
      currentUser?.id
    );

    const tipoReportante =
      currentUser?.role;

    if (
      !Number.isInteger(idReportante) ||
      idReportante <= 0 ||
      !tipoReportante
    ) {
      toast.error(
        'No se pudo identificar al usuario'
      );

      return;
    }

    if (!selectedCat) {
      toast.error(
        'Selecciona una categoría'
      );

      return;
    }

    const descripcionLimpia =
      description.trim();

    if (
      descripcionLimpia.length < 20
    ) {
      toast.error(
        'La descripción debe tener al menos 20 caracteres'
      );

      return;
    }

    if (tipoReporte === 'usuario') {
      const idServicio = Number(
        locationState?.idServicio
      );

      const idReportado = Number(
        locationState?.idReportado
      );

      if (
        !Number.isInteger(idServicio) ||
        idServicio <= 0
      ) {
        toast.error(
          'No se pudo identificar el servicio relacionado'
        );

        return;
      }

      if (
        !Number.isInteger(idReportado) ||
        idReportado <= 0
      ) {
        toast.error(
          'No se pudo identificar al usuario reportado'
        );

        return;
      }

      if (!locationState?.tipoReportado) {
        toast.error(
          'No se pudo identificar el tipo de usuario reportado'
        );

        return;
      }
    }

    try {
      setIsSubmitting(true);

      const respuesta = await fetch(
        '/api/reportes',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            tipoReporte,
            idReportante,
            tipoReportante,
            categoria: selectedCat,
            descripcion:
              descripcionLimpia,
            fotos: photos,

            idServicio:
              tipoReporte === 'usuario'
                ? Number(
                    locationState?.idServicio
                  )
                : null,

            idReportado:
              tipoReporte === 'usuario'
                ? Number(
                    locationState?.idReportado
                  )
                : null,

            tipoReportado:
              tipoReporte === 'usuario'
                ? locationState?.tipoReportado
                : null,
          }),
        }
      );

      const contentType =
        respuesta.headers.get(
          'content-type'
        ) ?? '';

      let datos: {
        mensaje?: string;
      } | null = null;

      if (
        contentType.includes(
          'application/json'
        )
      ) {
        datos = await respuesta.json();
      } else {
        const texto =
          await respuesta.text();

        datos = texto
          ? { mensaje: texto }
          : null;
      }

      if (!respuesta.ok) {
        throw new Error(
          datos?.mensaje ||
            'No se pudo enviar el reporte'
        );
      }

      toast.success(
        'Reporte enviado correctamente',
        {
          description:
            tipoReporte === 'aplicacion'
              ? 'Nuestro equipo revisará el problema de la aplicación.'
              : 'Nuestro equipo revisará el reporte relacionado con el servicio.',
        }
      );

      setSelectedCat(null);
      setDescription('');
      setPhotos([]);

      window.setTimeout(() => {
        navigate(-1);
      }, 1000);
    } catch (error) {
      console.error(
        'Error enviando reporte:',
        error
      );

      const mensaje =
        error instanceof Error
          ? error.message
          : 'No se pudo enviar el reporte';

      toast.error(mensaje);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Encabezado */}
      <div className="bg-card px-4 pt-10 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
            aria-label="Volver"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-bold text-foreground">
            {tipoReporte === 'aplicacion'
              ? 'Reportar problema de la aplicación'
              : tipoReportado === 'client'
                ? 'Reportar cliente'
                : tipoReportado === 'worker'
                  ? 'Reportar trabajador'
                  : 'Reportar usuario'}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Advertencia */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />

          <p className="text-xs text-amber-800 leading-relaxed">
            {tipoReporte === 'aplicacion'
              ? 'Describe el problema de la aplicación con información suficiente para que nuestro equipo pueda revisarlo.'
              : tipoReportado === 'client'
                ? 'Describe únicamente hechos relacionados con el comportamiento del cliente durante este servicio. Los reportes falsos pueden resultar en la suspensión de la cuenta.'
                : 'Describe únicamente hechos relacionados con el comportamiento o el trabajo del empleado durante este servicio. Los reportes falsos pueden resultar en la suspensión de la cuenta.'}
          </p>
        </div>

        {/* Categorías */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-3 block">
            Categoría del problema *
          </label>

          <div className="flex flex-col gap-2">
            {categories.map(
              (category) => (
                <motion.button
                  type="button"
                  key={category.id}
                  whileTap={{
                    scale: 0.98,
                  }}
                  onClick={() =>
                    setSelectedCat(
                      category.id
                    )
                  }
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left ${
                    selectedCat ===
                    category.id
                      ? 'border-[#1A56DB] bg-secondary'
                      : 'border-border bg-card'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor:
                        category.bg,
                    }}
                  >
                    <AlertTriangle
                      className="w-5 h-5"
                      style={{
                        color:
                          category.color,
                      }}
                    />
                  </div>

                  <span className="text-sm font-medium text-foreground">
                    {category.label}
                  </span>

                  {selectedCat ===
                    category.id && (
                    <div className="ml-auto w-5 h-5 bg-[#1A56DB] rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">
                        ✓
                      </span>
                    </div>
                  )}
                </motion.button>
              )
            )}
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-foreground">
              Descripción *
            </label>

            <span
              className={`text-xs ${
                description.trim()
                  .length >= 20
                  ? 'text-green-600'
                  : 'text-muted-foreground'
              }`}
            >
              {description.length}/500
            </span>
          </div>

          <textarea
            value={description}
            onChange={(event) =>
              setDescription(
                event.target.value.slice(
                  0,
                  500
                )
              )
            }
            placeholder={
              tipoReporte ===
              'aplicacion'
                ? 'Describe qué estabas haciendo, qué ocurrió y cuándo apareció el problema...'
                : tipoReportado === 'client'
                  ? 'Describe lo ocurrido con el cliente durante el servicio, incluyendo fecha, hora y cualquier información relevante...'
                  : 'Describe lo ocurrido con el trabajador durante el servicio, incluyendo fecha, hora y cualquier información relevante...'
            }
            rows={5}
            className="w-full bg-input-background rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30 resize-none"
          />

          {description.length > 0 &&
            description.trim().length <
              20 && (
              <p className="text-xs text-red-500 mt-1">
                Mínimo 20 caracteres.
                Faltan{' '}
                {20 -
                  description.trim()
                    .length}
                .
              </p>
            )}
        </div>

        {/* Evidencias */}
        <div className="mb-6">
          <label className="text-sm font-semibold text-foreground mb-2 block">
            Evidencia fotográfica
            (opcional)
          </label>

          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {photos.length <
            MAX_PHOTOS && (
            <motion.button
              type="button"
              whileTap={{
                scale: 0.97,
              }}
              onClick={() =>
                fileRef.current?.click()
              }
              className="w-full border-2 border-dashed border-[#1A56DB]/40 rounded-2xl p-6 flex flex-col items-center gap-2 bg-secondary/50"
            >
              <Upload className="w-6 h-6 text-[#1A56DB]" />

              <p className="text-sm text-[#1A56DB] font-medium">
                Agregar fotos
              </p>

              <p className="text-xs text-muted-foreground">
                Máximo 4 fotos · JPG o
                PNG · 5 MB por foto
              </p>
            </motion.button>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {photos.map(
                (source, index) => (
                  <div
                    key={`${index}-${source.slice(
                      0,
                      20
                    )}`}
                    className="relative aspect-square overflow-hidden rounded-xl"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setImagenAmpliada(source)
                      }
                      className="h-full w-full"
                      aria-label={`Ver evidencia ${
                        index + 1
                      } en pantalla completa`}
                    >
                      <img
                        src={source}
                        alt={`Evidencia ${
                          index + 1
                        }`}
                        className="h-full w-full object-cover"
                      />
                    </button>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removePhoto(index);
                      }}
                      className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/65"
                      aria-label={`Eliminar evidencia ${
                        index + 1
                      }`}
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            {photos.length}/
            {MAX_PHOTOS} fotos
            seleccionadas
          </p>
        </div>

        {imagenAmpliada && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-3 sm:p-6"
            onClick={() =>
              setImagenAmpliada(null)
            }
            role="dialog"
            aria-modal="true"
            aria-label="Vista ampliada de evidencia"
          >
            <button
              type="button"
              onClick={() =>
                setImagenAmpliada(null)
              }
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
              aria-label="Cerrar imagen"
            >
              <X className="h-6 w-6" />
            </button>

            <img
              src={imagenAmpliada}
              alt="Evidencia ampliada"
              onClick={(event) =>
                event.stopPropagation()
              }
              className="max-h-[90dvh] max-w-[96vw] rounded-xl object-contain shadow-2xl sm:max-w-[90vw]"
            />
          </div>
        )}

        {/* Botón enviar */}
        <motion.button
          type="button"
          whileTap={
            isSubmitting
              ? undefined
              : { scale: 0.97 }
          }
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-semibold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 mb-6"
        >
          <Send className="w-4 h-4" />

          {isSubmitting
            ? 'Enviando reporte...'
            : 'Enviar reporte'}
        </motion.button>
      </div>
    </div>
  );
}