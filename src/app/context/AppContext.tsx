import React, { createContext, useContext, useState } from 'react';
import type { Role, User, Conversation, ChatMessage, Notification, AgendaSlot } from '../types';
import {
  MOCK_CLIENT,
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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('client');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [workerAvailability, setWorkerAvailability] = useState(true);
  const [agendaSlots, setAgendaSlots] = useState<AgendaSlot[]>(MOCK_AGENDA_SLOTS);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const isAuthenticated = currentUser !== null;

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  const addMessage = (conversationId: string, message: ChatMessage) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              messages: [...conv.messages, message],
              lastMessage: message.content,
              lastMessageTime: 'Ahora',
              unreadCount: message.senderId !== currentUser?.id ? conv.unreadCount + 1 : conv.unreadCount,
            }
          : conv
      )
    );
  };

  const markConversationRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0, messages: conv.messages.map((m) => ({ ...m, read: true })) }
          : conv
      )
    );
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleSlotAvailability = (slotId: string) => {
    setAgendaSlots((prev) =>
      prev.map((s) => (s.id === slotId && !s.bookingId ? { ...s, available: !s.available } : s))
    );
  };

  const handleSetRole = (r: Role) => {
    setRole(r);
    if (r === 'client') {
      setCurrentUser(MOCK_CLIENT);
    } else {
      setCurrentUser({ ...MOCK_CLIENT, id: 'w1', name: 'Carlos Mendoza', role: 'worker' });
    }
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
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
