import React, { useEffect, useState } from 'react';
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
      usuarioActual?.idCliente ??
      usuarioActual?.id_cliente ??
      usuarioActual?.id
  );

  const [nombre, setNombre] = useState(
    String(
      usuarioActual?.name ??
        usuarioActual?.nombre_E ??
        usuarioActual?.nombre_C ??
        usuarioActual?.nombre ??
        ''
    )
  );

  const [correo, setCorreo] = useState(
    String(usuarioActual?.email ?? usuarioActual?.correo ?? '')
  );

  const [celular, setCelular] = useState(
    String(usuarioActual?.phone ?? usuarioActual?.celular ?? '')
  );

  const [dni, setDni] = useState(String(usuarioActual?.dni ?? ''));

  const [titulo, setTitulo] = useState(
    String(usuarioActual?.titulo ?? '')
  );

  const [direccion, setDireccion] = useState(
    String(usuarioActual?.direccion ?? usuarioActual?.location ?? '')
  );

  const [antecedente, setAntecedente] = useState(
    String(usuarioActual?.antecedente ?? '')
  );

  const [sobreMi, setSobreMi] = useState(
    String(usuarioActual?.sobre_mi ?? usuarioActual?.sobreMi ?? '')
  );

  const [password, setPassword] = useState(
    String(usuarioActual?.password_C ?? '')
  );

  const [foto, setFoto] = useState(String(usuarioActual?.foto ?? ''));

  const [cargando, setCargando] = useState(false);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);

  useEffect(() => {
    const cargarPerfilEmpleado = async () => {
      if (
        !esEmpleado ||
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
      ) {
        return;
      }

      try {
        setCargandoPerfil(true);

        const respuesta = await fetch(
          `http://localhost:3000/api/empleados/${idUsuario}`
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || 'No se pudo cargar el perfil'
          );
        }

        setNombre(String(datos.nombre_E ?? ''));
        setCorreo(String(datos.correo ?? ''));
        setCelular(String(datos.celular ?? ''));
        setDni(String(datos.dni ?? ''));
        setTitulo(String(datos.titulo ?? ''));
        setDireccion(String(datos.direccion ?? ''));
        setAntecedente(String(datos.antecedente ?? ''));
        setSobreMi(String(datos.sobre_mi ?? datos.sobreMi ?? ''));
      } catch (error) {
        const mensaje =
          error instanceof Error
            ? error.message
            : 'Error al cargar el perfil';

        console.error('Error al cargar perfil:', mensaje);
        alert(mensaje);
      } finally {
        setCargandoPerfil(false);
      }
    };

    cargarPerfilEmpleado();
  }, [esEmpleado, idUsuario]);

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
            nombre_E: String(nombre).trim(),
            correo: String(correo).trim().toLowerCase(),
            celular: String(celular).trim(),
            titulo: String(titulo).trim(),
            dni: String(dni).trim(),
            direccion: String(direccion).trim(),
            antecedente: String(antecedente).trim(),
            sobre_mi: String(sobreMi).trim(),
          }
        : {
            nombre_C: String(nombre).trim(),
            correo: String(correo).trim().toLowerCase(),
            celular: String(celular).trim(),
            dni: String(dni).trim(),
            password_C: String(password),
            foto: String(foto).trim(),
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

      alert(datos.mensaje || 'Cambios guardados correctamente');
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

  if (cargandoPerfil) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f8fafc]">
        <p className="text-sm font-semibold text-slate-600">
          Cargando perfil...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8fafc] p-4 text-[#0f172a]">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 transition-colors hover:bg-slate-200"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>

        <h1 className="text-xl font-bold text-[#1e293b]">
          {esEmpleado
            ? 'Editar Perfil Empleado'
            : 'Editar Perfil Cliente'}
        </h1>
      </div>

      <form
        onSubmit={handleGuardar}
        className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-1.5">
          <label className="px-1 text-xs font-bold uppercase text-slate-500">
            Nombre completo
          </label>

          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        {!esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-bold uppercase text-slate-500">
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="px-1 text-xs font-bold uppercase text-slate-500">
            Correo electrónico
          </label>

          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="px-1 text-xs font-bold uppercase text-slate-500">
            Celular
          </label>

          <input
            type="text"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            placeholder="Número de teléfono"
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
          />
        </div>

        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-bold uppercase text-slate-500">
              Título
            </label>

            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Técnico Electricista"
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="px-1 text-xs font-bold uppercase text-slate-500">
            DNI / Identificación
          </label>

          <input
            type="text"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
            placeholder="Número de documento"
            className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
          />
        </div>

        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-bold uppercase text-slate-500">
              Dirección
            </label>

            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección de residencia"
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-bold uppercase text-slate-500">
              Sobre mí
            </label>

            <textarea
              value={sobreMi}
              onChange={(e) => setSobreMi(e.target.value)}
              placeholder="Describe tu experiencia, habilidades y los servicios que realizas"
              rows={5}
              maxLength={500}
              className="w-full resize-none rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
            />

            <span className="px-1 text-right text-xs text-slate-400">
              {sobreMi.length}/500
            </span>
          </div>
        )}

        {esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-bold uppercase text-slate-500">
              Antecedente
            </label>

            <input
              type="text"
              value={antecedente}
              onChange={(e) => setAntecedente(e.target.value)}
              placeholder="Detalles o estado de antecedentes"
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        {!esEmpleado && (
          <div className="flex flex-col gap-1.5">
            <label className="px-1 text-xs font-bold uppercase text-slate-500">
              URL de la foto
            </label>

            <input
              type="text"
              value={foto}
              onChange={(e) => setFoto(e.target.value)}
              placeholder="https://enlace-de-tu-foto.com"
              className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 text-sm transition-colors focus:border-blue-500 focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={cargando || cargandoPerfil}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {cargando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}