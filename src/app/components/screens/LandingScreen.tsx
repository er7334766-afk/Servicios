import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { User, Briefcase, Shield, Star, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export default function LandingScreen() {
  const navigate = useNavigate();
  const { setRole } = useApp();

  const handleRoleSelect = (role: 'client' | 'worker') => {
    setRole(role);
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A56DB] via-[#1648C0] to-[#0F3BA6] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2"
        >
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-[#1A56DB] text-base font-black">S</span>
          </div>
          <span className="text-white text-xl font-bold tracking-tight">ServiApp</span>
        </motion.div>
      </div>

      {/* Hero image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mx-5 rounded-3xl overflow-hidden relative h-48 shadow-2xl"
      >
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1613575831056-0acd5da8f085?w=800&h=400&fit=crop"
          alt="Servicios del hogar"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-bold text-lg leading-tight">
            Tu hogar en las mejores manos
          </p>
          <p className="text-white/80 text-sm mt-0.5">
            Encuentra profesionales de confianza cerca de ti
          </p>
        </div>
      </motion.div>

      {/* Trust indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="flex justify-center gap-6 mt-5 px-6"
      >
        {[
          { icon: Shield, label: 'Verificados' },
          { icon: Star, label: '4.8 promedio' },
          { icon: Clock, label: 'Respuesta rápida' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/80 text-[10px]">{label}</span>
          </div>
        ))}
      </motion.div>

      {/* Role selection */}
      <div className="flex-1 flex flex-col justify-end px-5 pb-8 mt-6">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-white/70 text-sm text-center mb-4"
        >
          ¿Cómo quieres usar ServiApp?
        </motion.p>

        <div className="flex flex-col gap-3">
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 300 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleRoleSelect('client')}
            className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-lg"
          >
            <div className="w-12 h-12 bg-[#EFF4FF] rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-[#1A56DB]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#0F172A]">Soy Cliente</p>
              <p className="text-sm text-[#64748B]">Encuentra profesionales cerca de ti</p>
            </div>
            <div className="ml-auto">
              <div className="w-6 h-6 bg-[#1A56DB] rounded-full flex items-center justify-center">
                <span className="text-white text-xs">›</span>
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, type: 'spring', stiffness: 300 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleRoleSelect('worker')}
            className="bg-white/15 border border-white/30 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-sm"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white">Soy Trabajador</p>
              <p className="text-sm text-white/70">Ofrece tus servicios y genera ingresos</p>
            </div>
            <div className="ml-auto">
              <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">›</span>
              </div>
            </div>
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-center text-white/50 text-xs mt-5"
        >
          Al continuar aceptas nuestros{' '}
          <span className="text-white/80 underline">Términos y condiciones</span>
        </motion.p>
      </div>
    </div>
  );
}
