import { Outlet, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';

export function MobileShell() {
  const location = useLocation();
  const isChatDetail = location.pathname.startsWith('/home/chat/');

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center">
      <div className="w-full max-w-[390px] h-screen max-h-[844px] bg-background flex flex-col overflow-hidden relative shadow-2xl md:rounded-[36px]">
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        {!isChatDetail && <BottomNav />}
      </div>
    </div>
  );
}
