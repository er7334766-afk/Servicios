//elejir metodo de pago y con otra screen sellecionar el metodo de pago e ingresar los datos de la tarjeta de credito y debito

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Circle,
  CheckCircle2,
  ChevronRight,
  Wallet,
} from 'lucide-react';



export default function PaymentMethodScreen() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState('card');

  const methods = [
    {
      id: 'card',
      title: 'Tarjeta de crédito o débito',
      description: 'Visa • Mastercard',
      icon: CreditCard,
    },
    {
      id: 'cash',
      title: 'Efectivo',
      description: 'Paga cuando finalice el servicio',
      icon: Banknote,
    },
    {
        id: 'paypal',
        title: 'PayPal',
        description: 'Pago rápido y seguro',
        icon: Wallet,
    },
    
    ];

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Encabezado */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>

          <h1 className="text-white text-xl font-bold">
            Método de pago
          </h1>
        </div>

        <p className="text-white/80 text-sm mt-3">
            Elige el método de pago que prefieras para completar tu reserva.
        </p>
      </div>

      <div className="px-5 mt-6 space-y-4">
        {methods.map((method) => {
          const Icon = method.icon;
          const active = selected === method.id;

          return (
            <motion.button
                whileHover={{ scale: 1.01 }} //AGREGADO
              whileTap={{ scale: 0.98 }}
              key={method.id}
              onClick={() => setSelected(method.id)}
              className={`w-full rounded-2xl border p-4 transition
                ${
                  active
                    ? 'border-[#1A56DB] bg-[#EFF4FF]'
                    : 'border-border bg-card'
                }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#EFF4FF] flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#1A56DB]" />
                  </div>

                  <div className="text-left">
                    <p className="font-semibold text-foreground">
                      {method.title}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {method.description}
                    </p>
                  </div>
                </div>

                {active ? (
                  <CheckCircle2 className="w-6 h-6 text-[#1A56DB]" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </motion.button>
          );
        })}

        {/* Resumen */}
        <div className="bg-card border border-border rounded-2xl p-5 mt-4">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">
              Total
            </span>

            <span className="text-xl font-bold text-[#1A56DB]">
              L 450.00
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            El monto será cobrado al confirmar la reserva.
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/home/payment/card')}
            //AGREGADO
            className="w-full bg-[#1A56DB] rounded-2xl py-4 mt-6 shadow-lg flex items-center justify-center gap-2"> 
          <span className="text-white font-semibold">
            {selected === 'cash'
                ? 'Confirmar reserva'
                : 'Continuar'
            }
          </span>

          <ChevronRight className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  );
}
