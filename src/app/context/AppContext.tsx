import React, { createContext, useContext, useState } from 'react';
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
  setRole: (r: Role) => void;
  currentUser: User | null;
  setCurrentUser: (u: User | null) => void;
  isAuthenticated: boolean;
  conversations: Conversation[];
  addMessage: (conversationId: string, message: ChatMessage) => void;
  markConversationRead: (conversationId: string) => void;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  workerAvailability: boolean;
  setWorkerAvailability: (v: boolean) => void;
  agendaSlots: AgendaSlot[];
  toggleSlotAvailability: (slotId: string) => void;
  selectedWorkerId: string | null;
  setSelectedWorkerId: (id: string | null) => void;
  totalUnread: number;
  unreadNotifications: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<Role>('worker');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  

  const [conversations, setConversations] =
    useState<Conversation[]>(MOCK_CONVERSATIONS);

  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);

  const [workerAvailability, setWorkerAvailability] = useState(true);

  const [agendaSlots, setAgendaSlots] =
    useState<AgendaSlot[]>(MOCK_AGENDA_SLOTS);

  const [selectedWorkerId, setSelectedWorkerId] =
    useState<string | null>(null);

  const isAuthenticated = currentUser !== null;

  const totalUnread = conversations.reduce(
    (acc, conversation) => acc + conversation.unreadCount,
    0
  );

  const unreadNotifications = notifications.filter(
    (notification) => !notification.read
  ).length;

  const addMessage = (
    conversationId: string,
    message: ChatMessage
  ) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              messages: [...conversation.messages, message],
              lastMessage: message.content,
              lastMessageTime: 'Ahora',
              unreadCount:
                message.senderId !== currentUser?.id
                  ? conversation.unreadCount + 1
                  : conversation.unreadCount,
            }
          : conversation
      )
    );
  };

  const markConversationRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              unreadCount: 0,
              messages: conversation.messages.map((message) => ({
                ...message,
                read: true,
              })),
            }
          : conversation
      )
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  const toggleSlotAvailability = (slotId: string) => {
    setAgendaSlots((prev) =>
      prev.map((slot) =>
        slot.id === slotId && !slot.bookingId
          ? {
              ...slot,
              available: !slot.available,
            }
          : slot
      )
    );
  };

  const handleSetRole = (newRole: Role) => {
  setRole(newRole);
};  
  
  return (
    <AppContext.Provider
      value={{
        role,
        setRole: handleSetRole,
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
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }

  return context;
}