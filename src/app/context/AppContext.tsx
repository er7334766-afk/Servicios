import React, {
  createContext,
  useContext,
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
  MOCK_CONVERSATIONS,
  MOCK_NOTIFICATIONS,
  MOCK_AGENDA_SLOTS,
} from '../data/mockData';

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
  ) => void;

  markAllNotificationsRead: () => void;

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
  ] = useState<Conversation[]>(
    MOCK_CONVERSATIONS
  );

  const [
    notifications,
    setNotifications,
  ] = useState<Notification[]>(
    MOCK_NOTIFICATIONS
  );

  const [
    workerAvailability,
    setWorkerAvailability,
  ] = useState(true);

  const [
    agendaSlots,
    setAgendaSlots,
  ] = useState<AgendaSlot[]>(
    MOCK_AGENDA_SLOTS
  );

  const [
    selectedWorkerId,
    setSelectedWorkerId,
  ] = useState<string | null>(
    null
  );

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
    setCurrentUserState(user);

    if (user) {
      localStorage.setItem(
        USER_STORAGE_KEY,
        JSON.stringify(user)
      );

      localStorage.setItem(
        ROLE_STORAGE_KEY,
        user.role
      );

      setRoleState(user.role);
    } else {
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
      (total, conversation) =>
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
    setConversations((previous) =>
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
    setConversations((previous) =>
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

  const markNotificationRead = (
    id: string
  ) => {
    setNotifications((previous) =>
      previous.map(
        (notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification
      )
    );
  };

  const markAllNotificationsRead =
    () => {
      setNotifications(
        (previous) =>
          previous.map(
            (notification) => ({
              ...notification,
              read: true,
            })
          )
      );
    };

  const toggleSlotAvailability = (
    slotId: string
  ) => {
    setAgendaSlots((previous) =>
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