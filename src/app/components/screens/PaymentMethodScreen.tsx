import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  useLocation,
  useNavigate,
} from 'react-router';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  CreditCard,
  Circle,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

import CreditCardScreen from './CreditCardScreen';
import { useApp } from '../../context/AppContext';
import {
  MetodoPago,
  obtenerMetodosPago,
} from '../../services/paymentMethodsApi';

interface LocationState {
  returnTo?: string;
  serviceTotal?: number;
}

export default function PaymentMethodScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useApp();

  const [selected, setSelected] =
    useState('card');

  const [
    selectedSavedMethod,
    setSelectedSavedMethod,
  ] = useState<MetodoPago | null>(null);

  const [
    isEnteringCard,
    setIsEnteringCard,
  ] = useState(false);

  const [
    methodsList,
    setMethodsList,
  ] = useState<MetodoPago[]>([]);

  const [
    cargandoMetodos,
    setCargandoMetodos,
  ] = useState(false);

  const locationState =
    (location.state as
      | LocationState
      | null) ?? null;

  const returnTo =
    locationState?.returnTo ??
    '/home';

  const totalPagar = Number(
    locationState?.serviceTotal ?? 0,
  );

  const cargarMetodosPago =
    useCallback(async () => {
      const idUsuario = Number(
        currentUser?.id,
      );

      if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        setMethodsList([]);
        setSelectedSavedMethod(null);
        return;
      }

      try {
        setCargandoMetodos(true);

        const metodos =
          await obtenerMetodosPago(
            idUsuario,
          );

        setMethodsList(metodos);

        /*
         * Seleccionar automáticamente el método
         * guardado más reciente, si existe.
         */
        setSelectedSavedMethod(
          metodos[0] ?? null,
        );
      } catch (error) {
        console.error(
          'Error cargando métodos de pago:',
          error,
        );

        setMethodsList([]);
        setSelectedSavedMethod(null);
      } finally {
        setCargandoMetodos(false);
      }
    }, [currentUser?.id]);

  useEffect(() => {
    void cargarMetodosPago();
  }, [cargarMetodosPago]);

  const methods = [
    {
      id: 'card',
      title:
        'Tarjeta de crédito o débito',
      description:
        'Visa • Mastercard',
      icon: CreditCard,
    },
  ];

  const handleContinuar = () => {
    if (selected === 'card') {
      setIsEnteringCard(true);
      return;
    }
  };

  const handlePaymentSuccess = () => {
    navigate(returnTo, {
      replace: true,
      state: {
        paymentCompleted: true,
      },
    });
  };

  if (isEnteringCard) {
    return (
      <CreditCardScreen
        montoTotal={totalPagar}
        metodoGuardado={
          selectedSavedMethod
        }
        onBack={() =>
          setIsEnteringCard(false)
        }
        onPaymentSuccess={
          handlePaymentSuccess
        }
      />
    );
  }

  return (
    <div className="min-h-full bg-background pb-6">
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
          >
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
          const Icon =
            method.icon;

          const active =
            selected === method.id;

          return (
            <motion.button
              type="button"
              whileHover={{
                scale: 1.01,
              }}
              whileTap={{
                scale: 0.98,
              }}
              key={method.id}
              onClick={() =>
                setSelected(
                  method.id,
                )
              }
              className={`w-full rounded-2xl border p-4 transition ${
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
                      {
                        method.description
                      }
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

        <div className="bg-card border border-border rounded-2xl p-5 mt-4">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">
              Total
            </span>

            <span className="text-xl font-bold text-[#1A56DB]">
              {new Intl.NumberFormat(
                'es-HN',
                {
                  style: 'currency',
                  currency: 'HNL',
                },
              ).format(totalPagar)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">
            El monto será cobrado al confirmar la reserva.
          </p>
        </div>

        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-500 mb-2">
            Métodos guardados
          </h4>

          {cargandoMetodos ? (
            <div className="bg-white p-3 rounded-xl border text-sm text-muted-foreground">
              Cargando métodos...
            </div>
          ) : methodsList.length ===
            0 ? (
            <div className="bg-white p-3 rounded-xl border text-sm text-muted-foreground">
              No tienes métodos de pago guardados.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {methodsList.map(
                (metodo) => {
                  const activo =
                    selectedSavedMethod
                      ?.id_payment_method ===
                    metodo.id_payment_method;

                  return (
                    <motion.button
                      type="button"
                      whileTap={{
                        scale: 0.98,
                      }}
                      key={
                        metodo.id_payment_method
                      }
                      onClick={() =>
                        setSelectedSavedMethod(
                          metodo,
                        )
                      }
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                        activo
                          ? 'border-[#1A56DB] bg-[#EFF4FF]'
                          : 'border-border bg-white'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-semibold">
                          {
                            metodo.titular
                          }
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {metodo.tipo}{' '}
                          ·{' '}
                          {
                            metodo.numero_enmascarado
                          }
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          {metodo.expiracion ??
                            ''}
                        </div>

                        {activo && (
                          <CheckCircle2 className="w-5 h-5 text-[#1A56DB]" />
                        )}
                      </div>
                    </motion.button>
                  );
                },
              )}
            </div>
          )}
        </div>

        <motion.button
          type="button"
          whileTap={{
            scale: 0.98,
          }}
          onClick={
            handleContinuar
          }
          className="w-full bg-[#1A56DB] rounded-2xl py-4 mt-6 shadow-lg flex items-center justify-center gap-2"
        >
          <span className="text-white font-semibold">
            {selectedSavedMethod
              ? 'Usar método seleccionado'
              : 'Continuar'}
          </span>

          <ChevronRight className="w-5 h-5 text-white" />
        </motion.button>
      </div>
    </div>
  );
}