import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Calendar, Lock, User, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CreditCardScreenProps {
  onBack: () => void;
  onPaymentSuccess: () => void;
  montoTotal?: number;
}

export default function CreditCardScreen({ onBack, onPaymentSuccess, montoTotal = 50 }: { 
  onBack: () => void; 
  onPaymentSuccess: () => void;
  montoTotal?: number;
}) {
  const [numero, setNumero] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);

  // Formatea el número de tarjeta en grupos de 4 dígitos
  const handleNumeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formateado = valor.match(/.{1,4}/g)?.join(' ') || valor;
    setNumero(formateado);
  };

  // Formatea la fecha de vencimiento añadiendo la barra (MM/AA)
  const handleVencimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (valor.length >= 3) {
      setVencimiento(`${valor.substring(0, 2)}/${valor.substring(2, 4)}`);
    } else {
      setVencimiento(valor);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    // Simulación del procesamiento del pago seguro
    setTimeout(() => {
      setCargando(false);
      alert('¡Pago procesado con éxito!');
      onPaymentSuccess();
    }, 2000);
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] text-[#0f172a] p-5">
      {/* Encabezado */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">Método de Pago</h1>
          <p className="text-xs text-slate-500">Ingresa los datos de tu tarjeta</p>
        </div>
      </div>

      {/* Tarjeta Visual de Referencia */}
      <div className="w-full max-w-md mx-auto bg-gradient-to-br from-[#1e3a8a] to-[#1A56DB] text-white p-5 rounded-2xl shadow-md mb-6 flex flex-col justify-between aspect-[1.6/1]">
        <div className="flex justify-between items-start">
          <CreditCard className="w-8 h-8 opacity-80" />
          <span className="text-xs font-bold tracking-widest opacity-60">DIGITAL WALLET</span>
        </div>
        <p className="text-lg font-mono tracking-widest my-4">
          {numero || '•••• •••• •••• ••••'}
        </p>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] uppercase opacity-50">Titular</p>
            <p className="text-sm font-semibold truncate max-w-[180px]">{nombre || 'NOMBRE COMPLETO'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase opacity-50 text-right">Vence</p>
            <p className="text-sm font-semibold tracking-wider">{vencimiento || 'MM/AA'}</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md w-full mx-auto bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1 justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Nombre en la Tarjeta</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Como aparece en la tarjeta"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Número de Tarjeta</label>
            <div className="relative">
              <CreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={numero}
                onChange={handleNumeroChange}
                placeholder="0000 0000 0000 0000"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">Expiración</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={vencimiento}
                  onChange={handleVencimientoChange}
                  placeholder="MM/AA"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">CVV</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 3))}
                  placeholder="000"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botón Guardar / Pagar */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <span className="text-sm font-medium text-slate-500">Monto total a transferir:</span>
            <span className="text-lg font-black text-[#1A56DB]">${montoTotal}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-[#1A56DB] text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
          >
            {cargando ? 'Procesando pago...' : 'Confirmar y Pagar'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
