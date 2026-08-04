import React, {
  useEffect,
  useState,
} from 'react';
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  Lock,
  User,
} from 'lucide-react';
import { motion } from 'motion/react';

import { useApp } from '../../context/AppContext';
import {
  guardarMetodoPago,
  MetodoPago,
} from '../../services/paymentMethodsApi';

interface CreditCardScreenProps {
  onBack: () => void;
  onPaymentSuccess: () => void;
  montoTotal?: number;
  metodoGuardado?: MetodoPago | null;
}

export default function CreditCardScreen({
  onBack,
  onPaymentSuccess,
  montoTotal = 50,
  metodoGuardado = null,
}: CreditCardScreenProps) {
  const { currentUser } = useApp();

  const [numero, setNumero] =
    useState('');

  const [
    vencimiento,
    setVencimiento,
  ] = useState('');

  const [cvv, setCvv] =
    useState('');

  const [nombre, setNombre] =
    useState('');

  const [cargando, setCargando] =
    useState(false);

  const [
    guardarMetodo,
    setGuardarMetodo,
  ] = useState(
    metodoGuardado === null,
  );

  const [
    usandoMetodoGuardado,
    setUsandoMetodoGuardado,
  ] = useState(
    metodoGuardado !== null,
  );

  useEffect(() => {
    if (!metodoGuardado) {
      return;
    }

    setNombre(
      metodoGuardado.titular ??
        '',
    );

    setNumero(
      metodoGuardado
        .numero_enmascarado ??
        '',
    );

    setVencimiento(
      metodoGuardado.expiracion ??
        '',
    );

    setGuardarMetodo(false);
    setUsandoMetodoGuardado(true);
  }, [metodoGuardado]);

  const handleNumeroChange = (
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) => {
    const valor = event.target.value
      .replace(/\D/g, '')
      .substring(0, 16);

    const formateado =
      valor.match(/.{1,4}/g)?.join(' ') ??
      valor;

    setNumero(formateado);
  };

  const handleVencimientoChange = (
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) => {
    const valor = event.target.value
      .replace(/\D/g, '')
      .substring(0, 4);

    if (valor.length >= 3) {
      setVencimiento(
        `${valor.substring(
          0,
          2,
        )}/${valor.substring(2, 4)}`,
      );

      return;
    }

    setVencimiento(valor);
  };

  const validarVencimiento = () => {
    if (
      !/^\d{2}\/\d{2}$/.test(
        vencimiento,
      )
    ) {
      throw new Error(
        'La fecha de vencimiento debe tener el formato MM/AA',
      );
    }

    const [
      mesTexto,
      anioTexto,
    ] = vencimiento.split('/');

    const mes =
      Number(mesTexto);

    const anio =
      Number(`20${anioTexto}`);

    if (
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12
    ) {
      throw new Error(
        'El mes de vencimiento no es válido',
      );
    }

    const fechaActual =
      new Date();

    const anioActual =
      fechaActual.getFullYear();

    const mesActual =
      fechaActual.getMonth() + 1;

    if (
      anio < anioActual ||
      (
        anio === anioActual &&
        mes < mesActual
      )
    ) {
      throw new Error(
        'La tarjeta está vencida',
      );
    }
  };

  const validarDatos = () => {
    const nombreLimpio =
      nombre.trim();

    const cvvLimpio =
      cvv.replace(/\D/g, '');

    if (
      nombreLimpio.length < 3
    ) {
      throw new Error(
        'Ingresa el nombre completo del titular',
      );
    }

    validarVencimiento();

    if (
      cvvLimpio.length !== 3
    ) {
      throw new Error(
        'El CVV debe contener 3 números',
      );
    }

    if (usandoMetodoGuardado) {
      if (
        !metodoGuardado
          ?.numero_enmascarado
      ) {
        throw new Error(
          'El método guardado no es válido',
        );
      }

      return {
        nombreLimpio,
        numeroLimpio: '',
      };
    }

    const numeroLimpio =
      numero.replace(/\D/g, '');

    if (
      numeroLimpio.length !== 16
    ) {
      throw new Error(
        'El número de tarjeta debe contener 16 dígitos',
      );
    }

    return {
      nombreLimpio,
      numeroLimpio,
    };
  };

  const usarOtraTarjeta = () => {
    setUsandoMetodoGuardado(false);
    setNumero('');
    setNombre('');
    setVencimiento('');
    setCvv('');
    setGuardarMetodo(true);
  };

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (cargando) {
      return;
    }

    try {
      setCargando(true);

      const idUsuario = Number(
        currentUser?.id,
      );

      if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        throw new Error(
          'Usuario no autenticado o ID inválido',
        );
      }

      const {
        nombreLimpio,
        numeroLimpio,
      } = validarDatos();

      /*
       * Si se usa una tarjeta nueva y el usuario
       * marcó guardar, se crea el método.
       *
       * Si se usa un método ya guardado, no se
       * vuelve a insertar un duplicado.
       */
      if (
        !usandoMetodoGuardado &&
        guardarMetodo
      ) {
        const ultimosCuatro =
          numeroLimpio.slice(-4);

        await guardarMetodoPago({
          fk_usuario: idUsuario,
          tipo: 'card',
          titular:
            nombreLimpio,
          numero_enmascarado:
            `**** **** **** ${ultimosCuatro}`,
          expiracion:
            vencimiento,
        });
      }

      /*
       * El CVV se solicita cada vez, pero nunca
       * se guarda ni se envía al backend.
       */
      onPaymentSuccess();
    } catch (error) {
      console.error(
        'Error procesando pago:',
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Error al procesar el pago',
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] text-[#0f172a] p-5">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          disabled={cargando}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        <div>
          <h1 className="text-xl font-bold text-[#1e293b]">
            Método de Pago
          </h1>

          <p className="text-xs text-slate-500">
            {usandoMetodoGuardado
              ? 'Confirma el CVV para usar tu método guardado'
              : 'Ingresa los datos de tu tarjeta'}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto bg-gradient-to-br from-[#1e3a8a] to-[#1A56DB] text-white p-5 rounded-2xl shadow-md mb-6 flex flex-col justify-between aspect-[1.6/1]">
        <div className="flex justify-between items-start">
          <CreditCard className="w-8 h-8 opacity-80" />

          <span className="text-xs font-bold tracking-widest opacity-60">
            DIGITAL WALLET
          </span>
        </div>

        <p className="text-lg font-mono tracking-widest my-4">
          {numero ||
            '•••• •••• •••• ••••'}
        </p>

        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] uppercase opacity-50">
              Titular
            </p>

            <p className="text-sm font-semibold truncate max-w-[180px]">
              {nombre.trim() ||
                'NOMBRE COMPLETO'}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase opacity-50 text-right">
              Vence
            </p>

            <p className="text-sm font-semibold tracking-wider">
              {vencimiento ||
                'MM/AA'}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 max-w-md w-full mx-auto bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex-1 justify-between"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              Nombre en la tarjeta
            </label>

            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

              <input
                type="text"
                value={nombre}
                onChange={(event) =>
                  setNombre(
                    event.target.value,
                  )
                }
                disabled={
                  usandoMetodoGuardado
                }
                maxLength={100}
                autoComplete="cc-name"
                placeholder="Como aparece en la tarjeta"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-70"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              Número de tarjeta
            </label>

            <div className="relative">
              <CreditCard className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

              <input
                type="text"
                inputMode="numeric"
                value={numero}
                onChange={
                  handleNumeroChange
                }
                disabled={
                  usandoMetodoGuardado
                }
                autoComplete="cc-number"
                placeholder="0000 0000 0000 0000"
                className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-70"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">
                Expiración
              </label>

              <div className="relative">
                <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

                <input
                  type="text"
                  inputMode="numeric"
                  value={vencimiento}
                  onChange={
                    handleVencimientoChange
                  }
                  disabled={
                    usandoMetodoGuardado
                  }
                  autoComplete="cc-exp"
                  placeholder="MM/AA"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-70"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">
                CVV
              </label>

              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />

                <input
                  type="password"
                  inputMode="numeric"
                  value={cvv}
                  onChange={(event) =>
                    setCvv(
                      event.target.value
                        .replace(
                          /\D/g,
                          '',
                        )
                        .substring(
                          0,
                          3,
                        ),
                    )
                  }
                  autoComplete="cc-csc"
                  placeholder="000"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          {usandoMetodoGuardado ? (
            <button
              type="button"
              onClick={usarOtraTarjeta}
              className="text-sm font-semibold text-[#1A56DB] underline"
            >
              Usar otra tarjeta
            </button>
          ) : (
            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  guardarMetodo
                }
                onChange={(event) =>
                  setGuardarMetodo(
                    event.target.checked,
                  )
                }
                className="mt-1"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-700">
                  Guardar este método de pago
                </span>

                <span className="block text-xs text-slate-500 mt-0.5">
                  Solo se guardarán el titular,
                  vencimiento y los últimos cuatro
                  dígitos. El CVV no se almacena.
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="mt-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <span className="text-sm font-medium text-slate-500">
              Monto total a transferir:
            </span>

            <span className="text-lg font-black text-[#1A56DB]">
              {new Intl.NumberFormat(
                'es-HN',
                {
                  style: 'currency',
                  currency: 'HNL',
                },
              ).format(
                Number(montoTotal) || 0,
              )}
            </span>
          </div>

          <motion.button
            whileTap={{
              scale: cargando
                ? 1
                : 0.98,
            }}
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-[#1A56DB] text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {cargando
              ? 'Procesando pago...'
              : usandoMetodoGuardado
                ? 'Pagar con este método'
                : 'Confirmar y pagar'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}