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
  ArrowLeft,
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

interface Contacto {
  id: number;
  nombre: string;
  foto: string | null;
  descripcion: string | null;
  estado: string | null;
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

  const [mostrarContactos, setMostrarContactos] =
    useState(false);
  const [contactos, setContactos] =
    useState<Contacto[]>([]);
  const [busquedaContacto, setBusquedaContacto] =
    useState('');
  const [cargandoContactos, setCargandoContactos] =
    useState(false);
  const [errorContactos, setErrorContactos] =
    useState('');

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
          ? `/api/chat/empleado/${idUsuario}/conversaciones`
          : `/api/chat/cliente/${idUsuario}/conversaciones`;

        const respuesta = await fetch(url, {
          cache: 'no-store',
        });

        const texto = await respuesta.text();

        let datos: any = [];

        if (texto) {
          try {
            datos = JSON.parse(texto);
          } catch {
            throw new Error(
              'El servidor devolvió una respuesta inválida'
            );
          }
        }

        if (!respuesta.ok) {
          throw new Error(
            datos?.detalle ||
              datos?.mensaje ||
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

  const contactosFiltrados = useMemo(() => {
    const texto = busquedaContacto
      .trim()
      .toLowerCase();

    if (!texto) {
      return contactos;
    }

    return contactos.filter((contacto) => {
      const nombre = String(
        contacto.nombre ?? ''
      ).toLowerCase();

      const descripcion = String(
        contacto.descripcion ?? ''
      ).toLowerCase();

      const estado = String(
        contacto.estado ?? ''
      ).toLowerCase();

      return (
        nombre.includes(texto) ||
        descripcion.includes(texto) ||
        estado.includes(texto)
      );
    });
  }, [
    contactos,
    busquedaContacto,
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

  const abrirContactos = async () => {
    try {
      setMostrarContactos(true);
      setCargandoContactos(true);
      setErrorContactos('');
      setBusquedaContacto('');

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

      const respuesta = await fetch(
        `/api/chat/contactos/${rolActual}/${idUsuario}`,
        {
          cache: 'no-store',
        }
      );

      const texto = await respuesta.text();

      let datos: any = [];

      if (texto) {
        try {
          datos = JSON.parse(texto);
        } catch {
          throw new Error(
            'El servidor devolvió una respuesta inválida'
          );
        }
      }

      if (!respuesta.ok) {
        throw new Error(
          datos?.detalle ||
            datos?.mensaje ||
            'No se pudieron cargar los contactos'
        );
      }

      setContactos(
        Array.isArray(datos) ? datos : []
      );
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al cargar los contactos';

      console.error(
        'Error al cargar contactos:',
        error
      );

      setErrorContactos(mensaje);
      setContactos([]);
    } finally {
      setCargandoContactos(false);
    }
  };

  const cerrarContactos = () => {
    setMostrarContactos(false);
    setBusquedaContacto('');
    setErrorContactos('');
  };

  const abrirChatContacto = (
    contacto: Contacto
  ) => {
    navigate(`/home/chat/${contacto.id}`, {
      state: esEmpleado
        ? {
            idCliente: contacto.id,
            idEmpleado: idUsuario,
            participantId: contacto.id,
          }
        : {
            idCliente: idUsuario,
            idEmpleado: contacto.id,
            participantId: contacto.id,
          },
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Encabezado */}
      <div className="border-b border-border bg-card px-5 pb-4 pt-10">
       <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
            title="Regresar"
          >
            <ArrowLeft className="h-5 w-5 text-[#1A56DB]" />
          </button>

          <h1 className="text-xl font-bold text-foreground">
            Mensajes
          </h1>
        </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                cargarConversaciones(false)
              }
              disabled={
                cargando || actualizando
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary disabled:opacity-50"
              title="Actualizar conversaciones"
            >
              <RefreshCw
                className={`h-4 w-4 text-[#1A56DB] ${
                  actualizando
                    ? 'animate-spin'
                    : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={abrirContactos}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary"
              title="Nuevo mensaje"
            >
              <Edit className="h-4 w-4 text-[#1A56DB]" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <input
            type="text"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(event.target.value)
            }
            placeholder="Buscar conversaciones..."
            className="w-full rounded-xl bg-input-background py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto">
        {cargando ? (
          <div className="flex flex-col items-center justify-center px-5 py-16">
            <RefreshCw className="mb-3 h-7 w-7 animate-spin text-[#1A56DB]" />

            <p className="text-sm text-muted-foreground">
              Cargando conversaciones...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <p className="text-sm font-semibold text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                cargarConversaciones(true)
              }
              className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm text-white"
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
                className="flex cursor-pointer items-center gap-3 border-b border-border px-5 py-3.5"
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
                    className="h-12 w-12 rounded-full object-cover"
                  />

                  <span
                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                      Boolean(
                        conversacion.participantOnline
                      )
                        ? 'bg-green-500'
                        : 'bg-slate-300'
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {
                        conversacion.participantName
                      }
                    </p>

                    <span className="flex-shrink-0 text-xs text-muted-foreground">
                      {formatearFecha(
                        conversacion.lastMessageTime
                      )}
                    </span>
                  </div>

                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {
                      conversacion.lastMessage
                    }
                  </p>
                </div>

                {Number(
                  conversacion.unreadCount
                ) > 0 && (
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1A56DB] text-[10px] font-bold text-white">
                    {
                      conversacion.unreadCount
                    }
                  </span>
                )}
              </motion.div>
            )
          )
        ) : (
          <div className="flex flex-col items-center justify-center px-5 py-16">
            <Search className="mb-3 h-8 w-8 text-slate-300" />

            <p className="text-sm font-semibold text-slate-600">
              No se encontraron conversaciones
            </p>

            <p className="mt-1 text-center text-xs text-slate-400">
              Todavía no tienes mensajes.
            </p>
          </div>
        )}
      </div>

      {/* Selector de contactos */}
      {mostrarContactos && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={cerrarContactos}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-card p-5"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Nuevo mensaje
              </h2>

              <button
                type="button"
                onClick={cerrarContactos}
                className="rounded-full px-3 py-1 text-sm text-muted-foreground"
              >
                Cerrar
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="text"
                value={busquedaContacto}
                onChange={(event) =>
                  setBusquedaContacto(
                    event.target.value
                  )
                }
                placeholder={
                  esEmpleado
                    ? 'Buscar clientes...'
                    : 'Buscar empleados...'
                }
                className="w-full rounded-xl bg-input-background py-2.5 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {cargandoContactos ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Cargando contactos...
                </div>
              ) : errorContactos ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold text-red-600">
                    {errorContactos}
                  </p>

                  <button
                    type="button"
                    onClick={abrirContactos}
                    className="mt-4 rounded-xl bg-[#1A56DB] px-4 py-2 text-sm text-white"
                  >
                    Intentar nuevamente
                  </button>
                </div>
              ) : contactosFiltrados.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No se encontraron contactos
                </div>
              ) : (
                contactosFiltrados.map(
                  (contacto) => (
                    <button
                      key={contacto.id}
                      type="button"
                      onClick={() =>
                        abrirChatContacto(
                          contacto
                        )
                      }
                      className="flex w-full items-center gap-3 border-b border-border px-2 py-3 text-left"
                    >
                      <ImageWithFallback
                        src={contacto.foto ?? ''}
                        alt={contacto.nombre}
                        className="h-11 w-11 rounded-full object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {contacto.nombre}
                        </p>

                        <p className="truncate text-xs text-muted-foreground">
                          {contacto.descripcion ||
                            contacto.estado ||
                            ''}
                        </p>
                      </div>
                    </button>
                  )
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}