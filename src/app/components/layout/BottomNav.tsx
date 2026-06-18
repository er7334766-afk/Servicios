import type { ComponentType } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Home, Search, MessageCircle, User, CalendarDays, ClipboardList, Briefcase } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TabItem {
  label: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
}

const CLIENT_TABS: TabItem[] = [
  { label: 'Inicio',    icon: Home,          path: '/home' },
  { label: 'Buscar',   icon: Search,        path: '/home/search' },
  { label: 'Chat',     icon: MessageCircle, path: '/home/chat' },
  { label: 'Perfil',   icon: User,          path: '/home/profile' },
  { label: 'Historial',icon: ClipboardList, path: '/home/agenda' },
];

const WORKER_TABS: TabItem[] = [
  { label: 'Inicio',  icon: Home,          path: '/home' },
  { label: 'Explorar',icon: Briefcase,     path: '/home/search' },
  { label: 'Chat',    icon: MessageCircle, path: '/home/chat' },
  { label: 'Perfil',  icon: User,          path: '/home/profile' },
  { label: 'Agenda',  icon: CalendarDays,  path: '/home/agenda' },
];

export function BottomNav() {
  const { role, totalUnread } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = role === 'client' ? CLIENT_TABS : WORKER_TABS;

  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex items-stretch border-t border-border bg-card">
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        const isChat = tab.path === '/home/chat';
        return (
          <motion.button
            key={tab.path}
            whileTap={{ scale: 0.85 }}
            onClick={() => navigate(tab.path)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
          >
            <div className="relative">
              <tab.icon
                className={`w-5 h-5 transition-colors ${
                  active ? 'text-[#1A56DB]' : 'text-muted-foreground'
                }`}
              />
              {isChat && totalUnread > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-semibold">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] transition-colors ${
                active ? 'text-[#1A56DB] font-semibold' : 'text-muted-foreground'
              }`}
            >
              {tab.label}
            </span>
            {active && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#1A56DB] rounded-full"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
