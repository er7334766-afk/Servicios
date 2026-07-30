import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import type {
  Role,
  User,
  Conversation,
  ChatMessage,
  Notification,
  AgendaSlot,
} from '../types';

import {
  obtenerNotificacionesEmpleado,
  marcarNotificacionLeida,
} from '../services/notificacionesApi';

interface AppContextType {
  role: Role;
  setRole: (role: Role) => void;

  currentUser: User | null;
  setCurrentUser: (
    user: User | null
  ) => void;

  isAuthenticated: boolean;

  conversations: Conversation[];

  addMessage: (
    conversationId: string,
    message: ChatMessage
  ) => void;

  markConversationRead: (
    conversationId: string
  ) => void;

  notifications: Notification[];

  markNotificationRead: (
    id: string
  ) => Promise<void>;

  markAllNotificationsRead: () => Promise<void>;

  workerAvailability: boolean;

  setWorkerAvailability: (
    value: boolean
  ) => void;

  agendaSlots: AgendaSlot[];

  toggleSlotAvailability: (
    slotId: string
  ) => void;

  selectedWorkerId: string | null;

  setSelectedWorkerId: (
    id: string | null
  ) => void;

  totalUnread: number;
  unreadNotifications: number;
}

const AppContext =
  createContext<AppContextType | null>(
    null
  );

const USER_STORAGE_KEY =
  'serviapp_current_user';

const ROLE_STORAGE_KEY =
  'serviapp_role';

function obtenerUsuarioGuardado():
  | User
  | null {
  try {
    const usuarioGuardado =
      localStorage.getItem(
        USER_STORAGE_KEY
      );

    if (!usuarioGuardado) {
      return null;
    }

    return JSON.parse(
      usuarioGuardado
    ) as User;
  } catch (error) {
    console.error(
      'No se pudo recuperar el usuario:',
      error
    );

    localStorage.removeItem(
      USER_STORAGE_KEY
    );

    return null;
  }
}

function obtenerRolGuardado(): Role {
  const rolGuardado =
    localStorage.getItem(
      ROLE_STORAGE_KEY
    );

  if (
    rolGuardado === 'worker' ||
    rolGuardado === 'client'
  ) {
    return rolGuardado;
  }

  return 'worker';
}

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRoleState] =
    useState<Role>(
      obtenerRolGuardado
    );

  const [
    currentUser,
    setCurrentUserState,
  ] = useState<User | null>(
    obtenerUsuarioGuardado
  );

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>([]);

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>([]);

  useEffect(() => {
    const rolUsuario = currentUser?.role ?? role;

    if (!currentUser?.id || rolUsuario !== 'worker') {
      setNotifications([]);
      return;
    }

    const idEmpleado = Number(currentUser.id);

    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      console.error(
        'ID de empleado inválido para cargar notificaciones:',
        currentUser.id
      );
      setNotifications([]);
      return;
    }

    let activo = true;

    const cargarNotificaciones = async () => {
      try {
        const datos = await obtenerNotificacionesEmpleado(idEmpleado);

        if (!activo) {
          return;
        }

        const notificacionesAdaptadas: Notification[] = datos.map(
          (notificacion) => ({
            id: String(notificacion.id_notificacion),
            title: notificacion.titulo,
            body: notificacion.descripcion,
            type:
              notificacion.tipo === 'nuevo_servicio'
                ? 'job_request'
                : notificacion.tipo,
            read: Boolean(notificacion.leida),
            timestamp: notificacion.fecha,
            linkTo: notificacion.fk_servicio
            ? `/home/solicitud/${notificacion.fk_servicio}`
            : undefined,
             
          }) as Notification
        );

        setNotifications(notificacionesAdaptadas);
      } catch (error) {
        console.error(
          'No se pudieron cargar las notificaciones:',
          error
        );

        if (activo) {
          setNotifications([]);
        }
      }
    };

    void cargarNotificaciones();

    const manejarFocus = () => {
      void cargarNotificaciones();
    };

    window.addEventListener('focus', manejarFocus);

    return () => {
      activo = false;
      window.removeEventListener('focus', manejarFocus);
    };
  }, [currentUser?.id, currentUser?.role, role]);


  const [
    workerAvailability,
    setWorkerAvailability,
  ] = useState(true);

  const [
    agendaSlots,
    setAgendaSlots,
  ] = useState<AgendaSlot[]>([]);

  const [
    selectedWorkerId,
    setSelectedWorkerId,
  ] = useState<string | null>(
    null
  );

  /*
    Mantiene actualizada la última actividad
    del usuario mientras la aplicación está abierta.
  */
  useEffect(() => {
  if (!currentUser?.id) {
    return;
  }

  const idUsuario = Number(currentUser.id);
  const rolUsuario = currentUser.role ?? role;

  if (
    !Number.isInteger(idUsuario) ||
    idUsuario <= 0 ||
    (
      rolUsuario !== 'client' &&
      rolUsuario !== 'worker'
    )
  ) {
    console.error(
      'Datos inválidos para actualizar actividad:',
      {
        idUsuario,
        rolUsuario,
        currentUser,
      }
    );

    return;
  }

  let ejecutando = false;

  const actualizarActividad =
    async () => {
      if (ejecutando) {
        return;
      }

      ejecutando = true;

      try {
        const respuesta =
          await fetch(
            'http://localhost:3000/api/usuarios/actividad',
            {
              method: 'PUT',

              headers: {
                'Content-Type':
                  'application/json',
              },

              cache: 'no-store',

              body: JSON.stringify({
                idUsuario,
                rol: rolUsuario,
              }),
            }
          );

        const datos =
          await respuesta
            .json()
            .catch(() => null);

        if (!respuesta.ok) {
          console.error(
            'Error actualizando actividad:',
            respuesta.status,
            datos
          );

          return;
        }

        console.log(
          'Actividad enviada correctamente:',
          {
            idUsuario,
            rol: rolUsuario,
            fecha:
              new Date().toLocaleTimeString(),
            respuesta: datos,
          }
        );
      } catch (error) {
        console.error(
          'No se pudo enviar la actividad:',
          error
        );
      } finally {
        ejecutando = false;
      }
    };

  actualizarActividad();

  const intervalo =
    window.setInterval(
      actualizarActividad,
      10000
    );

  const manejarVisibilidad = () => {
    if (
      document.visibilityState ===
      'visible'
    ) {
      actualizarActividad();
    }
  };

  const manejarFocus = () => {
    actualizarActividad();
  };

  document.addEventListener(
    'visibilitychange',
    manejarVisibilidad
  );

  window.addEventListener(
    'focus',
    manejarFocus
  );

  return () => {
    window.clearInterval(intervalo);

    document.removeEventListener(
      'visibilitychange',
      manejarVisibilidad
    );

    window.removeEventListener(
      'focus',
      manejarFocus
    );
  };
}, [
  currentUser?.id,
  currentUser?.role,
  role,
]); 

  const setRole = (
    newRole: Role
  ) => {
    setRoleState(newRole);

    localStorage.setItem(
      ROLE_STORAGE_KEY,
      newRole
    );
  };

  const setCurrentUser = (
    user: User | null
  ) => {
    if (user) {
      const usuarioNormalizado = {
        ...user,

        role:
          user.role ??
          role,
      } as User;

      setCurrentUserState(
        usuarioNormalizado
      );

      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(
          usuarioNormalizado
        )
      );

      localStorage.setItem(
        ROLE_STORAGE_KEY,
        usuarioNormalizado.role
      );

      setRoleState(
        usuarioNormalizado.role
      );
    } else {
      setCurrentUserState(null);

      localStorage.removeItem(
        USER_STORAGE_KEY
      );

      localStorage.removeItem(
        ROLE_STORAGE_KEY
      );
    }
  };

  const isAuthenticated =
    currentUser !== null;

  const totalUnread =
    conversations.reduce(
      (
        total,
        conversation
      ) =>
        total +
        conversation.unreadCount,
      0
    );

  const unreadNotifications =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  const addMessage = (
    conversationId: string,
    message: ChatMessage
  ) => {
    setConversations(
      (previous) =>
        previous.map(
          (conversation) =>
            conversation.id ===
            conversationId
              ? {
                  ...conversation,

                  messages: [
                    ...conversation.messages,
                    message,
                  ],

                  lastMessage:
                    message.content,

                  lastMessageTime:
                    'Ahora',

                  unreadCount:
                    message.senderId !==
                    currentUser?.id
                      ? conversation.unreadCount +
                        1
                      : conversation.unreadCount,
                }
              : conversation
        )
    );
  };

  const markConversationRead = (
    conversationId: string
  ) => {
    setConversations(
      (previous) =>
        previous.map(
          (conversation) =>
            conversation.id ===
            conversationId
              ? {
                  ...conversation,

                  unreadCount: 0,

                  messages:
                    conversation.messages.map(
                      (message) => ({
                        ...message,
                        read: true,
                      })
                    ),
                }
              : conversation
        )
    );
  };

  const markNotificationRead = async (
    id: string
  ): Promise<void> => {
    const idNotificacion = Number(id);

    if (!Number.isInteger(idNotificacion) || idNotificacion <= 0) {
      console.error('ID de notificación inválido:', id);
      return;
    }

    try {
      await marcarNotificacionLeida(idNotificacion);

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );
    } catch (error) {
      console.error(
        'No se pudo marcar la notificación como leída:',
        error
      );
    }
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    const noLeidas = notifications.filter(
      (notification) => !notification.read
    );

    if (noLeidas.length === 0) {
      return;
    }

    try {
      await Promise.all(
        noLeidas.map((notification) => {
          const idNotificacion = Number(notification.id);

          if (!Number.isInteger(idNotificacion) || idNotificacion <= 0) {
            throw new Error(
              `ID de notificación inválido: ${notification.id}`
            );
          }

          return marcarNotificacionLeida(idNotificacion);
        })
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          read: true,
        }))
      );
    } catch (error) {
      console.error(
        'No se pudieron marcar todas las notificaciones como leídas:',
        error
      );
    }
  };

  const toggleSlotAvailability = (
    slotId: string
  ) => {
    setAgendaSlots(
      (previous) =>
        previous.map((slot) =>
          slot.id === slotId &&
          !slot.bookingId
            ? {
                ...slot,

                available:
                  !slot.available,
              }
            : slot
        )
    );
  };

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,

        currentUser,
        setCurrentUser,

        isAuthenticated,

        conversations,
        addMessage,
        markConversationRead,

        notifications,
        markNotificationRead,
        markAllNotificationsRead,

        workerAvailability,
        setWorkerAvailability,

        agendaSlots,
        toggleSlotAvailability,

        selectedWorkerId,
        setSelectedWorkerId,

        totalUnread,
        unreadNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context =
    useContext(AppContext);

  if (!context) {
    throw new Error(
      'useApp must be used within AppProvider'
    );
  }

  return context;
}