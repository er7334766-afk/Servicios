import React, { useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';

interface EditProfileProps {
  onBack: () => void;
  usuarioActual?: any;
  rol: 'worker' | 'client';
}

export default function EditProfileScreen({
  onBack,
  usuarioActual,
  rol,
}: EditProfileProps) {
  const esEmpleado = rol === 'worker';

  const idUsuario = Number(
    usuarioActual?.idEmpleado ??
      usuarioActual?.id_empleado ??
      usuarioActual?.id
  );

  const [nombre, setNombre] = useState(
    usuarioActual?.name ??
      usuarioActual?.nombre_E ??
      usuarioActual?.nombre_C ??
      usuarioActual?.nombre ??
      ''
  );

  const [correo, setCorreo] = useState(
    usuarioActual?.email ??
      usuarioActual?.correo ??
      ''
  );

  const [celular, setCelular] = useState(
    usuarioActual?.phone ??
      usuarioActual?.celular ??
      ''
  );

  const [dni, setDni] = useState(
    usuarioActual?.dni ?? ''
  );

  const [titulo, setTitulo] = useState(
    usuarioActual?.titulo ?? ''
  );

  const [direccion, setDireccion] = useState(
    usuarioActual?.direccion ??
      usuarioActual?.location ??
      ''
  );

  const [antecedente, setAntecedente] = useState(
    usuarioActual?.antecedente ?? ''
  );

  const [password, setPassword] = useState(
    usuarioActual?.password_C ?? ''
  );

  const [foto, setFoto] = useState(
    usuarioActual?.foto ?? ''
  );

  const [cargando, setCargando] = useState(false);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      alert('No se encontró el ID del usuario');
      return;
    }

    try {
      setCargando(true);

      const url = esEmpleado
        ? `http://localhost:3000/api/empleados/${idUsuario}`
        : `http://localhost:3000/api/clientes/${idUsuario}`;

      const body = esEmpleado
        ? {
            nombre_E: nombre.trim(),
            correo: correo.trim().toLowerCase(),
            celular: celular.trim(),
            titulo: titulo.trim(),
            dni: dni.trim(),
            direccion: direccion.trim(),
            antecedente: antecedente.trim(),
          }
        : {
            nombre_C: nombre.trim(),
            correo: correo.trim().toLowerCase(),
            celular: celular.trim(),
            dni: dni.trim(),
            password_C: password,
            foto: foto.trim(),
          };

      const respuesta = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || 'No se pudieron guardar los cambios'
        );
      }

      alert(
        datos.mensaje || 'Cambios guardados correctamente'
      );

      onBack();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al guardar los cambios';

      alert(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-[#0f172a] p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-slate-200 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        <h1 className="text-xl font-bold text-[#1e293b]">
          {esEmpleado
            ? 'Editar Perfil Empleado'
            : 'Editar Perfil Cliente'}
        </h1>
      </div>

      <form
        onSubmit={handleGuardar}
        className="flex flex-col gap-4 max-w-md w-full mx-auto bg-white p-5 rounded-2xl shadow-sm border border-slate-100"
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase px-1">
            Nombre Completo
          </label>

          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        {!esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              Contraseña
            </label>

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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase px-1">
            Correo Electrónico
          </label>

          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase px-1">
            Celular
          </label>

          <input
            type="text"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            placeholder="Número de teléfono"
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              Título
            </label>

            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Técnico Electricista"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase px-1">
            DNI / Identificación
          </label>

          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Número de documento"
            className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              Dirección
            </label>

            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección de residencia"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              Antecedente
            </label>

            <input
              type="text"
              value={antecedente}
              onChange={(e) => setAntecedente(e.target.value)}
              placeholder="Detalles o estado de antecedentes"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        {!esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase px-1">
              URL de la Foto
            </label>

            <input
              type="text"
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
              placeholder="https://enlace-de-tu-foto.com"
              className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
        >
          <Save className="w-4 h-4" />

          {cargando
            ? 'Guardando...'
            : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}