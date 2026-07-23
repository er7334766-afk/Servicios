//EditProfileScreen.tsx
import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';

interface EditProfileProps {
  onBack: () => void;
  usuarioActual?: any;
  rol: 'worker' | 'client'; // <-- Nueva propiedad para saber quién edita
}

export default function EditProfileScreen({ onBack, usuarioActual, rol }: EditProfileProps) {
  const esEmpleado = rol === 'worker';

  // --- Estados comunes (Ambos roles) ---
  const [nombre, setNombre] = useState(usuarioActual?.name || usuarioActual?.nombre_C || usuarioActual?.nombre || '');
  const [correo, setCorreo] = useState(usuarioActual?.correo || '');
  const [dni, setDni] = useState(usuarioActual?.dni || '');

  // --- Estados exclusivos de EMPLEADO ---
  const [titulo, setTitulo] = useState(usuarioActual?.titulo || '');
  const [direccion, setDireccion] = useState(usuarioActual?.direccion || '');
  const [antecedente, setAntecedente] = useState(usuarioActual?.antecedente || '');
  const [sobreMi, setSobreMi] = useState(
    usuarioActual?.sobre_mi || usuarioActual?.sobreMi || ''
  );

  // --- Estados exclusivos de CLIENTE ---
  const [password, setPassword] = useState(usuarioActual?.password_C || '');
  const [foto, setFoto] = useState(usuarioActual?.foto || '');

  const [cargando, setCargando] = useState(false);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (esEmpleado) {
        const datosEmpleado = {
          nombre,
          correo,
          dni,
          titulo,
          direccion,
          antecedente,
          sobre_mi: sobreMi,
        };

        console.log('Guardando Empleado:', datosEmpleado);
      } else {
        const datosCliente = {
          nombre,
          correo,
          dni,
          password,
          foto,
        };

        console.log('Guardando Cliente:', datosCliente);
      }

      alert('Cambios guardados correctamente');
      onBack();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar los cambios');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0f172a] p-4">
      {/* Encabezado dinámico */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-[#1e293b]">
          {esEmpleado ? 'Editar Perfil Empleado' : 'Editar Perfil Cliente'}
        </h1>
      </div>

      {/* Formulario */}
      <form onSubmit={handleGuardar} className="flex flex-col gap-4 max-w-md w-full mx-auto bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        
        {/* CAMPO COMÚN: Nombre */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase px-1">Nombre Completo</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        {/* CAMPO EXCLUSIVO CLIENTE: Contraseña */}
        {!esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>
        )}

        {/* CAMPO COMÚN: Correo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase px-1">Correo Electrónico</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            
          />
        </div>

        {/* CAMPO EXCLUSIVO EMPLEADO: Título */}
        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Técnico Electricista"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* CAMPO COMÚN: DNI */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase px-1">DNI / Identificación</label>
          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Número de documento"
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* CAMPO EXCLUSIVO EMPLEADO: Dirección */}
        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección de residencia"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* CAMPO EXCLUSIVO EMPLEADO: Sobre mí */}
        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              Sobre mí
            </label>

            <textarea
              value={sobreMi}
              onChange={(e) => setSobreMi(e.target.value)}
              placeholder="Describe tu experiencia, habilidades y los servicios que realizas"
              rows={5}
              maxLength={500}
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors"
            />

            <span className="text-xs text-slate-400 text-right px-1">
              {sobreMi.length}/500
            </span>
          </div>
        )}

        {/* CAMPO EXCLUSIVO EMPLEADO: Antecedente */}
        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">Antecedente</label>
            <input
              type="text"
              value={antecedente}
              onChange={(e) => setAntecedente(e.target.value)}
              placeholder="Detalles o estado de antecedentes"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* CAMPO EXCLUSIVO CLIENTE: Foto Texto */}
        {!esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">URL de la Foto (Texto)</label>
            <input
              type="text"
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
              placeholder="https://enlace-de-tu-foto.com"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {/* Botón de acción */}
        <button
          type="submit"
          disabled={cargando}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <Save className="w-4 h-4" />
          {cargando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
