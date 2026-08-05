import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  User,
  Briefcase,
} from 'lucide-react';

import { useApp } from '../../context/AppContext';

export default function LandingScreen() {
  const navigate = useNavigate();
  const { setRole } = useApp();

  const seleccionarCliente = () => {
    setRole('client');
    navigate('/auth');
  };

  const seleccionarTrabajador = () => {
    setRole('worker');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A56DB] via-[#1648C0] to-[#0F3BA6] flex flex-col overflow-hidden">
      {/* Encabezado */}
      <div className="px-6 pt-12 pb-4">
        <motion.div
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="flex items-center gap-2"
        >
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-[#1A56DB] text-base font-black">
              S
            </span>
          </div>

          <span className="text-white text-xl font-bold tracking-tight">
            ServiHN
          </span>
        </motion.div>
      </div>

      {/* Mensaje principal */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.15,
          duration: 0.5,
        }}
        className="px-6 pt-12 pb-10 text-center"
      >
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
            Servicios confiables,
            <br />
            cerca de ti
          </h1>

          <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-white/80 sm:text-base">
            Encuentra profesionales para resolver lo que necesitas
            o convierte tus habilidades en nuevas oportunidades.
          </p>
        </div>
      </motion.div>

      {/* Selección de rol */}
      <div className="flex-1 flex flex-col justify-end px-5 pb-8">
        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.3,
          }}
          className="text-white/80 text-sm font-medium text-center mb-4"
        >
          ¿Cómo quieres continuar?
        </motion.p>

        <div className="flex flex-col gap-3">
          {/* Cliente */}
          <motion.button
            type="button"
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.35,
              type: 'spring',
              stiffness: 300,
            }}
            whileTap={{
              scale: 0.97,
            }}
            onClick={seleccionarCliente}
            className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-lg"
          >
            <div className="w-12 h-12 bg-[#EFF4FF] rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-[#1A56DB]" />
            </div>

            <div className="min-w-0 text-left">
              <p className="font-bold text-[#0F172A]">
                Soy Cliente
              </p>

              <p className="text-sm text-[#64748B]">
                Encuentra profesionales cerca de ti
              </p>
            </div>

            <div className="ml-auto flex-shrink-0">
              <div className="w-7 h-7 bg-[#1A56DB] rounded-full flex items-center justify-center">
                <span className="text-white text-sm">
                  ›
                </span>
              </div>
            </div>
          </motion.button>

          {/* Trabajador */}
          <motion.button
            type="button"
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.45,
              type: 'spring',
              stiffness: 300,
            }}
            whileTap={{
              scale: 0.97,
            }}
            onClick={seleccionarTrabajador}
            className="bg-white/15 border border-white/30 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-sm"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-white" />
            </div>

            <div className="min-w-0 text-left">
              <p className="font-bold text-white">
                Soy Trabajador
              </p>

              <p className="text-sm text-white/70">
                Ofrece tus servicios y genera ingresos
              </p>
            </div>

            <div className="ml-auto flex-shrink-0">
              <div className="w-7 h-7 bg-white/30 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">
                  ›
                </span>
              </div>
            </div>
          </motion.button>
        </div>

        <motion.p
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          transition={{
            delay: 0.6,
          }}
          className="text-center text-white/50 text-xs mt-6"
        >
          Al continuar aceptas nuestros{' '}
          
            Términos y condiciones
          
        </motion.p>
      </div>
    </div>
  );
}