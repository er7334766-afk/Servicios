import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { ChevronLeft, Phone, MoreVertical, Send, Image, Smile } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../context/AppContext';
import type { ChatMessage } from '../../types';

export default function ChatScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { conversations, addMessage, markConversationRead, currentUser } = useApp();
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === id) ?? conversations[0];

  useEffect(() => {
    if (conversation) markConversationRead(conversation.id);
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  const handleSend = () => {
    if (!text.trim() || !conversation) return;
    const msg: ChatMessage = {
      id: `m_${Date.now()}`,
      senderId: currentUser?.id ?? 'c1',
      content: text.trim(),
      timestamp: new Date().toISOString(),
      type: 'text',
      read: false,
    };
    addMessage(conversation.id, msg);
    setText('');
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const isMe = (senderId: string) => senderId === currentUser?.id || senderId === 'c1';

  if (!conversation) return null;

  return (
    <div className="flex flex-col h-screen max-h-[844px]">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-10 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/home/chat')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="relative">
          <ImageWithFallback
            src={conversation.participantAvatar}
            alt={conversation.participantName}
            className="w-9 h-9 rounded-full object-cover"
          />
          {conversation.participantOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{conversation.participantName}</p>
          <p className="text-xs text-muted-foreground">
            {conversation.participantOnline ? 'En línea' : 'Desconectado'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
            <Phone className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {conversation.messages.map((msg) => {
          const mine = isMe(msg.senderId);
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? 'bg-[#1A56DB] text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                      : 'bg-card border border-border text-foreground rounded-tr-2xl rounded-tl-sm rounded-br-2xl rounded-bl-2xl'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground px-1">
                  {formatTime(msg.timestamp)}
                  {mine && (
                    <span className="ml-1">{msg.read ? '✓✓' : '✓'}</span>
                  )}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
          <Image className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex-1 flex items-center bg-input-background rounded-2xl px-4 py-2 gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none"
          />
          <button>
            <Smile className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!text.trim()}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            text.trim() ? 'bg-[#1A56DB] shadow-lg' : 'bg-muted'
          }`}
        >
          <Send className={`w-4 h-4 ${text.trim() ? 'text-white' : 'text-muted-foreground'}`} />
        </motion.button>
      </div>
    </div>
  );
}
