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
  MoreVertical,
  Trash2,
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
  conectado: boolean | number | string | null;
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

function estaConectado(
  valor: boolean | number | string | null | undefined
): boolean {
  return valor === true || Number(valor) === 1;
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
        ? `http://localhost:3000/api/chat/empleado/${idUsuario}/conversaciones`
        : `http://localhost:3000/api/chat/cliente/${idUsuario}/conversaciones`;

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

        const listaConversaciones =
        Array.isArray(datos)
          ? datos
          : Array.isArray(
                datos?.conversaciones
              )
            ? datos.conversaciones
            : [];

      console.log(
        "Conversaciones recibidas:",
        listaConversaciones
      );

      setConversaciones(
        listaConversaciones
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

      const presencia = estaConectado(
        contacto.conectado
      )
        ? 'conectado'
        : 'desconectado';

      return (
        nombre.includes(texto) ||
        descripcion.includes(texto) ||
        presencia.includes(texto)
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

  const cargarContactos = useCallback(
    async (mostrarCarga = false) => {
      try {
        if (mostrarCarga) {
          setCargandoContactos(true);
        }

        setErrorContactos('');

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
          `http://localhost:3000/api/chat/contactos/${rolActual}/${idUsuario}?t=${Date.now()}`,
          {
            method: 'GET',
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

        const lista = Array.isArray(datos)
          ? datos
          : [];

        setContactos(
          lista.map((contacto: any) => ({
            id: Number(contacto.id),
            nombre: String(contacto.nombre ?? ''),
            foto: contacto.foto ?? null,
            descripcion: contacto.descripcion ?? null,
            conectado: estaConectado(
              contacto.conectado
            ),
          }))
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

        if (mostrarCarga) {
          setContactos([]);
        }
      } finally {
        if (mostrarCarga) {
          setCargandoContactos(false);
        }
      }
    },
    [idUsuario, rolActual]
  );

  const abrirContactos = () => {
    setMostrarContactos(true);
    setBusquedaContacto('');
    void cargarContactos(true);
  };

  useEffect(() => {
    if (!mostrarContactos) {
      return;
    }

    const intervalo = window.setInterval(() => {
      void cargarContactos(false);
    }, 5000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [mostrarContactos, cargarContactos]);

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
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [modoSeleccion, setModoSeleccion] =
  useState(false);
  const [chatsSeleccionados, setChatsSeleccionados] =
    useState<number[]>([]);

  const alternarSeleccionChat = (id: number) => {
    setChatsSeleccionados((actuales) =>
      actuales.includes(id)
        ? actuales.filter(
            (chatId) => chatId !== id
          )
        : [...actuales, id]
    );
  };  

  const eliminarChatsSeleccionados =
  async () => {
    if (chatsSeleccionados.length === 0) {
      return;
    }

    const cantidad =
      chatsSeleccionados.length;

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas eliminar ${cantidad} chat(s)?\n\nEsta acción eliminará todos sus mensajes y no se puede deshacer.`
    );

    if (!confirmar) {
      return;
    }

    try {
      setError('');

      const respuesta = await fetch(
        'http://localhost:3000/api/chat/conversaciones',
        {
          method: 'DELETE',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            rol: rolActual,
            idUsuario,
            contactos:
              chatsSeleccionados,
          }),
        }
      );

      const texto =
        await respuesta.text();

      let datos: any = {};

      if (texto) {
        try {
          datos = JSON.parse(texto);
        } catch {
          throw new Error(
            `El servidor devolvió una respuesta inválida ${respuesta.status}: ${texto}`
          );
        }
      }

      if (!respuesta.ok) {
        throw new Error(
          datos?.detalle ||
            datos?.mensaje ||
            'No se pudieron eliminar los chats'
        );
      }

      // Quitar inmediatamente los chats de la pantalla.
      setConversaciones(
        (conversacionesActuales) =>
          conversacionesActuales.filter(
            (conversacion) =>
              !chatsSeleccionados.includes(
                conversacion.id
              )
          )
      );

      setChatsSeleccionados([]);
      setModoSeleccion(false);

      alert(
        datos?.mensaje ||
          'Chats eliminados correctamente'
      );
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al eliminar los chats';

      console.error(
        'Error al eliminar chats:',
        error
      );

      setError(mensaje);
    }
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

            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarMenu(!mostrarMenu)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary"
                title="Opciones"
              >
                <MoreVertical className="w-4 h-4 text-[#1A56DB]" />
              </button>

              {mostrarMenu && (
                <div className="absolute right-0 top-11 z-50 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarMenu(false);
                      abrirContactos();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted transition-colors"
                  >
                    <Edit className="w-4 h-4 text-[#1A56DB]" />
                    Nuevo chat
                  </button>
                  {/* eliminar chat */}
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarMenu(false);
                      setModoSeleccion(true);
                      setChatsSeleccionados([]);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar chats
                  </button>
                </div>
              )}
            </div>
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
              onClick={() => {
                if (modoSeleccion) {
                  alternarSeleccionChat(
                    conversacion.id
                  );
                  return;
                }

                navigate(
                  `/home/chat/${conversacion.id}`
                );
              }}
              className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3.5 hover:bg-muted/50"
            >

              {modoSeleccion && (
                <div
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    chatsSeleccionados.includes(
                      conversacion.id
                    )
                      ? 'border-[#1A56DB] bg-[#1A56DB]'
                      : 'border-gray-400'
                  }`}
                >
                  {chatsSeleccionados.includes(
                    conversacion.id
                  ) && (
                    <span className="text-xs font-bold text-white">
                      ✓
                    </span>
                  )}
                </div>
              )}

          {/* Foto */}
          <div className="relative flex-shrink-0">
            <ImageWithFallback
              src={
                conversacion.participantAvatar ??
                ''
              }
              alt={
                conversacion.participantName
              }
              className="h-14 w-14 rounded-full object-cover"
            />

            {estaConectado(
              conversacion.participantOnline
            ) && (
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card bg-green-500" />
            )}
          </div>

  {/* Nombre y último mensaje */}
  <div className="min-w-0 flex-1">
    <p className="truncate text-base font-semibold text-foreground">
      {conversacion.participantName}
    </p>

    <p className="mt-0.5 truncate text-sm text-muted-foreground">
      {conversacion.lastMessage ||
        'Sin mensajes'}
    </p>
  </div>

  {/* Hora y contador */}
  <div className="flex flex-shrink-0 flex-col items-end gap-2">
    <span
      className={`text-xs font-medium ${
        Number(
          conversacion.unreadCount
        ) > 0
          ? 'text-green-500'
          : 'text-muted-foreground'
      }`}
    >
      {formatearFecha(
        conversacion.lastMessageTime
      )}
    </span>

    {Number(
      conversacion.unreadCount
    ) > 0 && (
      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-green-500 px-1.5 text-xs font-bold text-white">
        {conversacion.unreadCount}
      </span>
    )}
  </div>

                

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

        {modoSeleccion && (
          <div className="absolute bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-4 py-3 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setModoSeleccion(false);
                  setChatsSeleccionados([]);
                }}
                className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  chatsSeleccionados.length === 0
                }
                onClick={
                  eliminarChatsSeleccionados
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Eliminar seleccionados
                {chatsSeleccionados.length > 0
                  ? ` (${chatsSeleccionados.length})`
                  : ''}
              </button>

            </div>
          </div>
        )}


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
                      <div className="relative flex-shrink-0">
                        <ImageWithFallback
                          src={contacto.foto ?? ''}
                          alt={contacto.nombre}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                              estaConectado(
                                contacto.conectado
                              )
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                            }`}
                            aria-label={
                              estaConectado(
                                contacto.conectado
                              )
                                ? 'Conectado'
                                : 'Desconectado'
                            }
                            title={
                              estaConectado(
                                contacto.conectado
                              )
                                ? 'Conectado'
                                : 'Desconectado'
                            }
                          />

                          <p className="truncate text-sm font-semibold text-foreground">
                            {contacto.nombre}
                          </p>
                        </div>
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

