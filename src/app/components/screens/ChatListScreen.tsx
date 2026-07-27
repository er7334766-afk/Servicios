import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  Search,
  Edit,
  RefreshCw,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../context/AppContext';

interface Conversacion {
  id: number;
  participantName: string;
  participantAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  participantOnline: boolean | number;
}

interface UsuarioGuardado {
  id?: number | string;
  idCliente?: number | string;
  id_cliente?: number | string;
  idEmpleado?: number | string;
  id_empleado?: number | string;
  role?: string;
  rol?: string;
  usuario?: UsuarioGuardado;
}

function leerUsuarioLocal(): UsuarioGuardado | null {
  const claves = [
    'usuario',
    'currentUser',
    'user',
    'usuarioActual',
  ];

  for (const clave of claves) {
    const valor = localStorage.getItem(clave);

    if (!valor) {
      continue;
    }

    try {
      const datos = JSON.parse(
        valor
      ) as UsuarioGuardado;

      if (datos && typeof datos === 'object') {
        return datos.usuario ?? datos;
      }
    } catch (error) {
      console.error(
        `No se pudo leer ${clave}:`,
        error
      );
    }
  }

  return null;
}

export default function ChatListScreen() {
  const navigate = useNavigate();
  const { currentUser, role } = useApp();

  const [conversaciones, setConversaciones] =
    useState<Conversacion[]>([]);

  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] =
    useState(false);
  const [error, setError] = useState('');

  const usuarioLocal = leerUsuarioLocal();

  const rolActual =
    role ??
    usuarioLocal?.role ??
    usuarioLocal?.rol;

  const esEmpleado = rolActual === 'worker';

  const idUsuario = Number(
    currentUser?.id ??
      (currentUser as any)?.id_cliente ??
      (currentUser as any)?.id_empleado ??
      usuarioLocal?.idEmpleado ??
      usuarioLocal?.id_empleado ??
      usuarioLocal?.idCliente ??
      usuarioLocal?.id_cliente ??
      usuarioLocal?.id
  );

  const cargarConversaciones = useCallback(
    async (mostrarCargaInicial = false) => {
      try {
        if (mostrarCargaInicial) {
          setCargando(true);
        } else {
          setActualizando(true);
        }

        setError('');

        if (
          rolActual !== 'client' &&
          rolActual !== 'worker'
        ) {
          throw new Error(
            'No se pudo identificar el rol del usuario'
          );
        }

        if (
          !Number.isInteger(idUsuario) ||
          idUsuario <= 0
        ) {
          throw new Error(
            'No se encontró el ID del usuario'
          );
        }

        const url = esEmpleado
          ? `http://localhost:3000/api/chat/empleado/${idUsuario}/conversaciones`
          : `http://localhost:3000/api/chat/cliente/${idUsuario}/conversaciones`;

        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.detalle ||
              datos.mensaje ||
              'No se pudieron cargar las conversaciones'
          );
        }

        setConversaciones(
          Array.isArray(datos) ? datos : []
        );
      } catch (error) {
        const mensaje =
          error instanceof Error
            ? error.message
            : 'Error al cargar las conversaciones';

        console.error(
          'Error al cargar conversaciones:',
          error
        );

        setError(mensaje);
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [
      esEmpleado,
      idUsuario,
      rolActual,
    ]
  );

  useEffect(() => {
    if (
      !Number.isInteger(idUsuario) ||
      idUsuario <= 0 ||
      (
        rolActual !== 'client' &&
        rolActual !== 'worker'
      )
    ) {
      setCargando(false);
      return;
    }

    cargarConversaciones(true);

    const intervalo = window.setInterval(() => {
      cargarConversaciones(false);
    }, 3000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [
    cargarConversaciones,
    idUsuario,
    rolActual,
  ]);

  const conversacionesFiltradas = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return conversaciones;
    }

    return conversaciones.filter(
      (conversacion) => {
        const nombre = String(
          conversacion.participantName ?? ''
        ).toLowerCase();

        const mensaje = String(
          conversacion.lastMessage ?? ''
        ).toLowerCase();

        return (
          nombre.includes(texto) ||
          mensaje.includes(texto)
        );
      }
    );
  }, [
    busqueda,
    conversaciones,
  ]);

  const formatearFecha = (fecha: string) => {
    if (!fecha) {
      return '';
    }

    const fechaMensaje = new Date(fecha);

    if (
      Number.isNaN(fechaMensaje.getTime())
    ) {
      return '';
    }

    const hoy = new Date();

    const esHoy =
      fechaMensaje.getDate() ===
        hoy.getDate() &&
      fechaMensaje.getMonth() ===
        hoy.getMonth() &&
      fechaMensaje.getFullYear() ===
        hoy.getFullYear();

    if (esHoy) {
      return fechaMensaje.toLocaleTimeString(
        'es-HN',
        {
          hour: '2-digit',
          minute: '2-digit',
        }
      );
    }

    return fechaMensaje.toLocaleDateString(
      'es-HN',
      {
        day: '2-digit',
        month: '2-digit',
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Encabezado */}
      <div className="bg-card px-5 pt-10 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">
            Mensajes
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                cargarConversaciones(false)
              }
              disabled={
                cargando || actualizando
              }
              className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary disabled:opacity-50"
              title="Actualizar conversaciones"
            >
              <RefreshCw
                className={`w-4 h-4 text-[#1A56DB] ${
                  actualizando
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>

            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary"
            >
              <Edit className="w-4 h-4 text-[#1A56DB]" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <input
            type="text"
            value={busqueda}
            onChange={(e) =>
              setBusqueda(e.target.value)
            }
            placeholder="Buscar conversaciones..."
            className="w-full bg-input-background rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-16 px-5">
            <RefreshCw className="w-7 h-7 text-[#1A56DB] animate-spin mb-3" />

            <p className="text-sm text-muted-foreground">
              Cargando conversaciones...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
            <p className="text-sm font-semibold text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                cargarConversaciones(true)
              }
              className="mt-4 px-4 py-2 rounded-xl bg-[#1A56DB] text-white text-sm"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : conversacionesFiltradas.length > 0 ? (
          conversacionesFiltradas.map(
            (conversacion, indice) => (
              <motion.div
                key={conversacion.id}
                initial={{
                  opacity: 0,
                  x: -10,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: indice * 0.04,
                }}
                whileTap={{
                  backgroundColor: '#F1F5F9',
                }}
                onClick={() =>
                  navigate(
                    `/home/chat/${conversacion.id}`
                  )
                }
                className="flex items-center gap-3 px-5 py-3.5 border-b border-border cursor-pointer"
              >
                <div className="relative flex-shrink-0">
                  <ImageWithFallback
                    src={
                      conversacion.participantAvatar ??
                      ''
                    }
                    alt={
                      conversacion.participantName
                    }
                    className="w-12 h-12 rounded-full object-cover"
                  />

                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      Boolean(
                        conversacion.participantOnline
                      )
                        ? 'bg-green-500'
                        : 'bg-slate-300'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {
                        conversacion.participantName
                      }
                    </p>

                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatearFecha(
                        conversacion.lastMessageTime
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {
                      conversacion.lastMessage
                    }
                  </p>
                </div>

                {Number(
                  conversacion.unreadCount
                ) > 0 && (
                  <span className="w-5 h-5 bg-[#1A56DB] text-white rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                    {
                      conversacion.unreadCount
                    }
                  </span>
                )}
              </motion.div>
            )
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-5">
            <Search className="w-8 h-8 text-slate-300 mb-3" />

            <p className="text-sm font-semibold text-slate-600">
              No se encontraron conversaciones
            </p>

            <p className="text-xs text-slate-400 mt-1 text-center">
              Todavía no tienes mensajes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}