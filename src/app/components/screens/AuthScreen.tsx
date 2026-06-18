import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, ChevronLeft, Mail, Lock, User, Phone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MOCK_CLIENT } from '../../data/mockData';
import { MOCK_WORKERS } from '../../data/mockData';

interface LoginForm {
  email: string;
  password: string;
}
interface RegisterForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
}

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();
  const { role, setCurrentUser } = useApp();

  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>();

  const handleLogin = () => {
    if (role === 'worker') {
      setCurrentUser({ ...MOCK_WORKERS[0], role: 'worker' });
    } else {
      setCurrentUser({ ...MOCK_CLIENT, role: 'client' });
    }
    navigate('/home');
  };

  const handleRegister = (data: RegisterForm) => {
    setCurrentUser({
      id: 'new_user',
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatarUrl: MOCK_CLIENT.avatarUrl,
      role,
      location: 'CDMX',
      joinedDate: new Date().toISOString().split('T')[0],
    });
    navigate('/home');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pt-12 pb-2">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="px-6 pb-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-12 h-12 bg-[#1A56DB] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-xl font-black">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {tab === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tab === 'login'
              ? 'Ingresa tus datos para continuar'
              : `Regístrate como ${role === 'client' ? 'cliente' : 'trabajador'}`}
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="mx-6 flex bg-muted rounded-xl p-1 mb-6">
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        ))}
      </div>

      <div className="flex-1 px-6 overflow-y-auto">
        {tab === 'login' ? (
          <motion.form
            key="login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...loginForm.register('email', { required: true })}
                  defaultValue="sofia@example.com"
                  placeholder="tu@correo.com"
                  className="w-full bg-input-background rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...loginForm.register('password', { required: true })}
                  type={showPass ? 'text' : 'password'}
                  defaultValue="password123"
                  placeholder="••••••••"
                  className="w-full bg-input-background rounded-xl pl-10 pr-10 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPass ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
              <p className="text-xs text-[#1A56DB] text-right mt-1.5 cursor-pointer">¿Olvidaste tu contraseña?</p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="w-full bg-[#1A56DB] text-white rounded-xl py-3.5 font-semibold mt-2 shadow-lg shadow-[#1A56DB]/30"
            >
              Iniciar sesión
            </motion.button>

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">o continuar con</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex gap-3">
              {['Google', 'Apple'].map((p) => (
                <button key={p} type="button" className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={registerForm.handleSubmit(handleRegister)}
            className="flex flex-col gap-4 pb-8"
          >
            {[
              { name: 'name' as const, label: 'Nombre completo', icon: User, placeholder: 'Tu nombre', type: 'text' },
              { name: 'email' as const, label: 'Correo electrónico', icon: Mail, placeholder: 'tu@correo.com', type: 'email' },
              { name: 'phone' as const, label: 'Teléfono', icon: Phone, placeholder: '+52 55 1234 5678', type: 'tel' },
            ].map(({ name, label, icon: Icon, placeholder, type }) => (
              <div key={name}>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...registerForm.register(name, { required: true })}
                    type={type}
                    placeholder={placeholder}
                    className="w-full bg-input-background rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...registerForm.register('password', { required: true, minLength: 6 })}
                  type="password"
                  placeholder="Mín. 6 caracteres"
                  className="w-full bg-input-background rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Confirmar contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  {...registerForm.register('confirm', { required: true })}
                  type="password"
                  placeholder="Repite tu contraseña"
                  className="w-full bg-input-background rounded-xl pl-10 pr-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-[#1A56DB]/30"
                />
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="w-full bg-[#1A56DB] text-white rounded-xl py-3.5 font-semibold mt-2 shadow-lg shadow-[#1A56DB]/30"
            >
              Crear cuenta
            </motion.button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
