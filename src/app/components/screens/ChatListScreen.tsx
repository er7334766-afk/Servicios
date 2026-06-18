import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, Edit } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../context/AppContext';

export default function ChatListScreen() {
  const navigate = useNavigate();
  const { conversations } = useApp();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-card px-5 pt-10 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Mensajes</h1>
          <button className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary">
            <Edit className="w-4 h-4 text-[#1A56DB]" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar conversaciones..."
            className="w-full bg-input-background rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv, i) => (
          <motion.div
            key={conv.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ backgroundColor: '#F1F5F9' }}
            onClick={() => navigate(`/home/chat/${conv.id}`)}
            className="flex items-center gap-3 px-5 py-3.5 border-b border-border cursor-pointer"
          >
            <div className="relative flex-shrink-0">
              <ImageWithFallback
                src={conv.participantAvatar}
                alt={conv.participantName}
                className="w-12 h-12 rounded-full object-cover"
              />
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  conv.participantOnline ? 'bg-green-500' : 'bg-slate-300'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{conv.participantName}</p>
                <span className="text-xs text-muted-foreground">{conv.lastMessageTime}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
            </div>
            {conv.unreadCount > 0 && (
              <span className="w-5 h-5 bg-[#1A56DB] text-white rounded-full text-[10px] flex items-center justify-center font-bold flex-shrink-0">
                {conv.unreadCount}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
