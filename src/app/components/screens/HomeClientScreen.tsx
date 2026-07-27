//HomeClientScreen.tsx
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Bell, Search, MapPin, ChevronRight, Plus } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { WorkerCard } from '../shared/WorkerCard';
import { ServiceCategoryGrid } from '../shared/ServiceCategoryGrid';
import { useApp } from '../../context/AppContext';
import { MOCK_JOB_POSTS, SERVICE_CATEGORIES } from '../../data/mockData';
import type { ServiceCategory } from '../../types';

import { useEffect, useState } from 'react'; //agredado

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-blue-100 text-[#1A56DB]',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Confirmado',
  in_progress: 'En progreso',
  completed: 'Completado',
};

interface EmpleadoDisponible {
  id_empleado: number;
  nombre_E: string;
  correo: string;
  celular: string;
  titulo: string | null;
  direccion: string | null;
  fk_categoria: number | null;
  estado: string;
  N_trabajos: number;
  sobre_mi: string | null;
}

export default function HomeClientScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('card'); //agregado
  const { currentUser, unreadNotifications } = useApp(); //agregado
  const [empleadosDisponibles, setEmpleadosDisponibles] = useState<
  EmpleadoDisponible[]
  >([]); //agregado
  const [empleadosDestacados, setEmpleadosDestacados] = useState<
  EmpleadoDisponible[]
  >([]); //agregado

  const [cargandoDestacados, setCargandoDestacados] = useState(true);

  const [cargandoEmpleados, setCargandoEmpleados] = useState(true);


  const myPosts = MOCK_JOB_POSTS.filter((p) => p.clientId === 'c1').slice(0, 2);

  const handleCategorySelect = (cat: ServiceCategory) => {
    navigate(`/home/search?cat=${cat}`);
  };

  //trabajadores destacados
  useEffect(() => {
    const cargarEmpleadosDestacados = async () => {
      try {
        setCargandoDestacados(true);

        const respuesta = await fetch(
          'http://localhost:3000/api/empleados/destacados'
        );

        if (!respuesta.ok) {
          throw new Error('No se pudieron cargar los empleados destacados');
        }

        const datos = await respuesta.json();
        setEmpleadosDestacados(datos);
      } catch (error) {
        console.error('Error al cargar empleados destacados:', error);
        setEmpleadosDestacados([]);
      } finally {
        setCargandoDestacados(false);
      }
    };

    cargarEmpleadosDestacados();
  }, []);

  //empleados disponibles
  useEffect(() => {
    const cargarEmpleadosDisponibles = async () => {
      try {
        setCargandoEmpleados(true);

        const respuesta = await fetch(
          'http://localhost:3000/api/empleados/disponibles'
        );

        if (!respuesta.ok) {
          throw new Error('No se pudieron cargar los empleados disponibles');
        }

        const datos = await respuesta.json();
        setEmpleadosDisponibles(datos);
      } catch (error) {
        console.error('Error al cargar empleados disponibles:', error);
        setEmpleadosDisponibles([]);
      } finally {
        setCargandoEmpleados(false);
      }
    };

    cargarEmpleadosDisponibles();
  }, []);

  return (
    <div className="pb-4">
      {/* Top bar */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/70 text-sm">Buenos días,</p>
            <p className="text-white font-bold text-lg">{currentUser?.name?.split(' ')[0] ?? 'Usuario'} 👋</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/home/notifications')}
              className="relative w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Bell className="w-5 h-5 text-white" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-[#1A56DB]" />
              )}
            </motion.button>
            <ImageWithFallback
              src={currentUser?.avatarUrl ?? ''}
              alt={currentUser?.name ?? ''}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
            />
          </div>
        </div>

        {/* Search bar */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          //AGREGADO
          onClick={() => { navigate('/home/search'); }}
          //agregado
          className="w-full bg-white rounded-xl flex items-center gap-3 px-4 py-3 shadow-lg"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground text-sm">¿Qué servicio necesitas?</span>
          <div className="ml-auto flex items-center gap-1 bg-[#EFF4FF] px-2 py-1 rounded-lg">
            <MapPin className="w-3 h-3 text-[#1A56DB]" />
            <span className="text-[11px] text-[#1A56DB] font-medium">Condesa</span>
          </div>
        </motion.button>
      </div>

      {/* Categorias */}
      <div className="px-5 mt-5">  
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Categorías</h2>
          <button className="text-xs text-[#1A56DB] flex items-center gap-0.5" onClick={() => navigate('/home/search')}>
            Ver todas <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <ServiceCategoryGrid onSelect={handleCategorySelect} categories={SERVICE_CATEGORIES} />
      </div>

      {/* Trabajadores destacados */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3 px-5">
          <h2 className="text-base font-bold text-foreground">
            Trabajadores destacados
          </h2>

          <button
            className="text-xs text-[#1A56DB] flex items-center gap-0.5"
            onClick={() => navigate('/home/search')}
          >
            Ver todos <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>        

        {cargandoDestacados ? (
        <div className="px-5">
          <p className="text-sm text-muted-foreground">
            Cargando trabajadores destacados...
          </p>
        </div>
      ) : empleadosDestacados.length === 0 ? (
        <div className="px-5">
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No hay trabajadores destacados todavía.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
          {empleadosDestacados.map((worker) => (
            <motion.button
              key={worker.id_empleado}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                navigate(`/home/worker/${worker.id_empleado}`)
              }
              className="min-w-[180px] bg-card rounded-2xl border border-border p-4 text-left shadow-sm"
            >
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-[#EFF4FF] flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#1A56DB]">
                    {worker.nombre_E.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <h3 className="font-semibold text-center text-sm">
                {worker.nombre_E}
              </h3>

              <p className="text-xs text-center text-muted-foreground mt-1">
                {worker.N_trabajos ?? 0} Trabajos realizados
              </p>

              <p className="text-xs text-center text-green-600 font-medium mt-2">
                {worker.estado || 'Disponible'}
              </p>
            </motion.button>
          ))}
        </div>
      )}
        
      </div>

      {/* Mis publicaciones de */}
      <div className="mt-6 px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Mis solicitudes</h2>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/home/search')}
            className="w-7 h-7 bg-[#1A56DB] rounded-full flex items-center justify-center"
          >
            <Plus className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        {myPosts.length === 0 ? (
          <div className="bg-muted rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm">No tienes solicitudes activas</p>
            <button onClick={() => navigate('/home/search')} className="text-[#1A56DB] text-sm font-semibold mt-1">
              Publicar una solicitud →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {myPosts.map((post) => {
              const cat = SERVICE_CATEGORIES.find((c) => c.id === post.category);
              return (
                <motion.div
                  key={post.id}
                  whileTap={{ scale: 0.98 }}
                  className="bg-card rounded-2xl border border-border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: cat?.bgColor, color: cat?.color }}
                        >
                          {cat?.label}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{post.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{post.description}</p>
                    </div>
                    <span className="text-sm font-bold text-[#1A56DB] flex-shrink-0 ml-2">
                      ${post.budget.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{post.location}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {post.applicantCount} interesados
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trabajadores disponibles */}
      <div className="mt-6 px-5 pb-4">
        <h2 className="text-base font-bold text-foreground mb-3">
          Disponibles ahora
        </h2>

        {cargandoEmpleados ? (
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Cargando trabajadores disponibles...
            </p>
          </div>
        ) : empleadosDisponibles.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <p className="text-sm text-muted-foreground">
              No hay trabajadores disponibles en este momento.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {empleadosDisponibles.slice(0, 3).map((worker) => (
              <motion.button
                key={worker.id_empleado}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  navigate(`/home/worker/${worker.id_empleado}`)
                }
                className="w-full bg-card rounded-2xl border border-border p-3 text-left shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar temporal */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-[#EFF4FF] flex items-center justify-center">
                      <span className="text-xl font-bold text-[#1A56DB]">
                        {worker.nombre_E.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {worker.nombre_E}
                    </h3>

                    <p className="text-xs text-muted-foreground mt-1">
                      {worker.N_trabajos ?? 0} trabajos realizados
                    </p>

                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />

                      <span className="text-xs text-green-600 font-medium">
                        {worker.estado || 'Disponible'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
