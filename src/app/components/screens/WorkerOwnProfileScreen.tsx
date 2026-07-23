import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Settings,
  Star,
  MapPin,
  ChevronRight,
  LogOut,
  Edit2,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { StarRating } from '../shared/StarRating';
import { ReviewCard } from '../shared/ReviewCard';
import { useApp } from '../../context/AppContext';
import { MOCK_WORKERS, MOCK_REVIEWS } from '../../data/mockData';

import EditProfileScreen from './EditProfileScreen';
import EditServiceScreen from './EditServiceScreen';

interface Categoria {
  id_categoria: number | string;
  nombre: string;
  subCatgeoria?: string;
}

export default function WorkerOwnProfileScreen() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingServices, setIsEditingServices] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const idEmpleado = Number(
    currentUser?.idEmpleado ?? currentUser?.id
  );

  const worker = {
    ...MOCK_WORKERS[0],
    id: currentUser?.id ?? MOCK_WORKERS[0].id,
    name: currentUser?.name ?? MOCK_WORKERS[0].name,
    avatarUrl:
      currentUser?.avatarUrl || MOCK_WORKERS[0].avatarUrl,
    location:
      currentUser?.location &&
      currentUser.location !== 'No especificada'
        ? currentUser.location
        : MOCK_WORKERS[0].location,
  };

  const reviews = MOCK_REVIEWS.filter(
    (review) => review.targetId === MOCK_WORKERS[0].id
  );

  const cargarCategorias = async () => {
    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      setCategorias([]);
      return;
    }

    try {
      const respuesta = await fetch(
        `http://localhost:3000/api/empleados/${idEmpleado}/categorias`
      );

      if (!respuesta.ok) {
        const mensajeError = await respuesta.text();
        throw new Error(mensajeError);
      }

      const datos = await respuesta.json();

      const categoriasRecibidas: Categoria[] = Array.isArray(datos)
        ? datos
        : datos.categorias || [];

      setCategorias(categoriasRecibidas);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      setCategorias([]);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, [idEmpleado]);

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  if (isEditing) {
    return (
      <EditProfileScreen
        usuarioActual={worker}
        rol="worker"
        onBack={() => setIsEditing(false)}
      />
    );
  }

  if (isEditingServices) {
    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return (
        <div className="p-5">
          <p className="text-sm text-foreground">
            No se pudo obtener el ID del trabajador.
          </p>

          <button
            type="button"
            onClick={() => setIsEditingServices(false)}
            className="mt-4 bg-[#1A56DB] text-white px-4 py-2 rounded-xl"
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
          cargarCategorias();
        }}
      />
    );
  }

  return (
    <div className="pb-6">
      {/* Header banner */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">
            Mi Perfil
          </h1>

          <button
            type="button"
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center"
          >
            <Settings className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Profile card */}
      <div className="px-5 -mt-12">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="relative">
              <ImageWithFallback
                src={worker.avatarUrl}
                alt={worker.name}
                className="w-16 h-16 rounded-2xl object-cover"
              />

              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1A56DB] rounded-full flex items-center justify-center"
              >
                <Edit2 className="w-3 h-3 text-white" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground">
                {worker.name}
              </h2>

              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-muted-foreground" />

                <span className="text-xs text-muted-foreground">
                  {worker.location}
                </span>
              </div>

              <div className="flex items-center gap-1 mt-1">
                <StarRating value={worker.rating} size="xs" />

                <span className="text-xs font-semibold text-foreground">
                  {worker.rating}
                </span>

                <span className="text-xs text-muted-foreground">
                  ({worker.reviewCount})
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">
                {worker.jobCount}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Trabajos
              </p>
            </div>

            <div className="w-px bg-border" />

            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">
                {worker.reviewCount}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Reseñas
              </p>
            </div>

            <div className="w-px bg-border" />

            <div className="flex-1 text-center">
              <p className="font-bold text-foreground text-base">
                ${worker.pricePerHour}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Por hora
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground">
            Mis servicios
          </h2>

          <button
            type="button"
            onClick={() => {
              if (
                !Number.isInteger(idEmpleado) ||
                idEmpleado <= 0
              ) {
                alert(
                  'No se encontró el ID del trabajador. Cierra sesión y vuelve a entrar.'
                );
                return;
              }

              setIsEditingServices(true);
            }}
            className="text-xs text-[#1A56DB] font-semibold"
          >
            Editar
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categorias.length > 0 ? (
            categorias.map((categoria) => (
              <span
                key={String(categoria.id_categoria)}
                className="text-xs bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full border border-[#1A56DB]/20"
              >
                {categoria.nombre}
              </span>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              No tienes servicios seleccionados.
            </p>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-bold text-foreground">
            Galería
          </h2>

          <button
            type="button"
            className="text-xs text-[#1A56DB]"
          >
            Agregar foto
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {worker.galleryUrls.map((url, index) => (
            <div
              key={index}
              className="aspect-square rounded-xl overflow-hidden"
            >
              <ImageWithFallback
                src={url}
                alt={`Trabajo ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="px-5 mt-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">
            Reseñas ({worker.reviewCount})
          </h2>

          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />

            <span className="text-sm font-bold">
              {worker.rating}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
            />
          ))}
        </div>
      </div>

      {/* Account options */}
      <div className="px-5 mt-6">
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {[
            {
              label: 'Editar perfil',
              icon: Edit2,
              action: () => setIsEditing(true),
            },
            {
              label: 'Gestionar disponibilidad',
              icon: Settings,
              action: () => navigate('/home/agenda'),
            },
            {
              label: 'Reportar un problema',
              icon: Settings,
              action: () => navigate('/home/report'),
            },
          ].map(({ label, icon: Icon, action }) => (
            <button
              type="button"
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 hover:bg-muted transition-colors"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />

              <span className="text-sm text-foreground flex-1 text-left">
                {label}
              </span>

              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={handleLogout}
          className="w-full mt-4 bg-red-50 border border-red-200 text-red-600 rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </motion.button>
      </div>
    </div>
  );
}