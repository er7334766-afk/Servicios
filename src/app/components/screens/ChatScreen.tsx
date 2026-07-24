import {
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router';
import { motion } from 'motion/react';
import {
  ChevronLeft,
  Phone,
  MoreVertical,
  Send,
  Image,
  Smile,
} from 'lucide-react';

import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../context/AppContext';

interface ContactoChat {
  id: number;
  nombre: string;
  foto: string;
  estado: string;
}

interface MensajeChat {
  id_chat: number;
  fk_cliente: number;
  fk_empleado: number;
  remitente: 'cliente' | 'empleado';
  mensaje: string;
  leido: number;
  fecha: string;
}

interface UsuarioGuardado {
  id?: number | string;
  idCliente?: number | string;
  id_cliente?: number | string;
  idEmpleado?: number | string;
  id_empleado?: number | string;
  role?: 'client' | 'worker';
  rol?: 'client' | 'worker';
  usuario?: UsuarioGuardado;
}

function leerUsuarioLocal(): UsuarioGuardado | null {
  const claves = [
    'usuario',
    'currentUser',
    'user',
    'usuarioActual',
  ];

  for (const clave of claves) {
    const valor = localStorage.getItem(clave);

    if (!valor) {
      continue;
    }

    try {
      const datos = JSON.parse(
        valor
      ) as UsuarioGuardado;

      if (datos && typeof datos === 'object') {
        return datos.usuario ?? datos;
      }
    } catch (error) {
      console.error(
        `No se pudo leer ${clave} desde localStorage:`,
        error
      );
    }
  }

  return null;
}

export default function ChatScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { currentUser, role } = useApp();

  const [contacto, setContacto] =
    useState<ContactoChat | null>(null);

  const [mensajes, setMensajes] =
    useState<MensajeChat[]>([]);

  const [texto, setTexto] = useState('');
  const [cargando, setCargando] =
    useState(true);
  const [enviando, setEnviando] =
    useState(false);
  const [error, setError] = useState('');

  const bottomRef =
    useRef<HTMLDivElement>(null);

  const primeraCargaRef = useRef(true);

  const usuarioLocal = leerUsuarioLocal();

  /*
   * Cliente:
   * /home/chat/:id representa el ID del empleado.
   *
   * Empleado:
   * /home/chat/:id representa el ID del cliente.
   */
  const idSeleccionado = Number(id);

  const rolActual =
    role ??
    usuarioLocal?.role ??
    usuarioLocal?.rol;

  const esEmpleado =
    rolActual === 'worker';

  const idUsuarioActual = Number(
    currentUser?.id ??
      (currentUser as any)?.id_cliente ??
      (currentUser as any)?.id_empleado ??
      usuarioLocal?.idEmpleado ??
      usuarioLocal?.id_empleado ??
      usuarioLocal?.idCliente ??
      usuarioLocal?.id_cliente ??
      usuarioLocal?.id
  );

  const idCliente = esEmpleado
    ? idSeleccionado
    : idUsuarioActual;

  const idEmpleado = esEmpleado
    ? idUsuarioActual
    : idSeleccionado;

  const cargarContacto = async () => {
    if (
      !Number.isInteger(idSeleccionado) ||
      idSeleccionado <= 0
    ) {
      throw new Error(
        'ID de contacto inválido'
      );
    }

    const url = esEmpleado
      ? `http://localhost:3000/api/clientes/${idCliente}`
      : `http://localhost:3000/api/empleados/${idEmpleado}`;

    const respuesta = await fetch(url);

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.mensaje ||
          'No se pudo cargar el contacto'
      );
    }

    if (esEmpleado) {
      setContacto({
        id: Number(datos.id_cliente),
        nombre: String(
          datos.nombre_C ?? 'Cliente'
        ),
        foto: String(datos.foto ?? ''),
        estado: 'Cliente',
      });
    } else {
      setContacto({
        id: Number(datos.id_empleado),
        nombre: String(
          datos.nombre_E ?? 'Empleado'
        ),
        foto: String(datos.foto ?? ''),
        estado: String(
          datos.estado ?? 'Desconectado'
        ),
      });
    }
  };

  const marcarMensajesComoLeidos =
    async () => {
      try {
        const respuesta = await fetch(
          'http://localhost:3000/api/chat/leidos',
          {
            method: 'PUT',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              fk_cliente: idCliente,
              fk_empleado: idEmpleado,
              lector: esEmpleado
                ? 'empleado'
                : 'cliente',
            }),
          }
        );

        if (!respuesta.ok) {
          const datos = await respuesta.json();

          throw new Error(
            datos.mensaje ||
              'No se pudieron marcar los mensajes como leídos'
          );
        }
      } catch (error) {
        console.error(
          'No se pudieron marcar los mensajes como leídos:',
          error
        );
      }
    };

  const cargarMensajes = async () => {
    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0
    ) {
      throw new Error(
        'ID de cliente inválido'
      );
    }

    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      throw new Error(
        'ID de empleado inválido'
      );
    }

    const respuesta = await fetch(
      `http://localhost:3000/api/chat/cliente/${idCliente}/empleado/${idEmpleado}`
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.mensaje ||
          'No se pudieron cargar los mensajes'
      );
    }

    const listaMensajes: MensajeChat[] =
      Array.isArray(datos) ? datos : [];

    setMensajes(listaMensajes);

    await marcarMensajesComoLeidos();
  };

  /*
   * Carga inicial de contacto y mensajes.
   */
  useEffect(() => {
    const iniciarChat = async () => {
      try {
        setCargando(true);
        setError('');

        if (
          rolActual !== 'client' &&
          rolActual !== 'worker'
        ) {
          throw new Error(
            'No se pudo identificar el rol del usuario'
          );
        }

        if (
          !Number.isInteger(
            idUsuarioActual
          ) ||
          idUsuarioActual <= 0
        ) {
          throw new Error(
            'No se encontró el ID del usuario que inició sesión'
          );
        }

        await Promise.all([
          cargarContacto(),
          cargarMensajes(),
        ]);
      } catch (error) {
        const mensaje =
          error instanceof Error
            ? error.message
            : 'Error al cargar la conversación';

        console.error(
          'Error al cargar el chat:',
          error
        );

        setError(mensaje);
      } finally {
        setCargando(false);
      }
    };

    iniciarChat();
  }, [
    idSeleccionado,
    idUsuarioActual,
    rolActual,
    idCliente,
    idEmpleado,
  ]);

  /*
   * Actualiza los mensajes automáticamente
   * cada 2 segundos.
   */
  useEffect(() => {
    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0 ||
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      return;
    }

    const intervalo = window.setInterval(
      () => {
        cargarMensajes().catch((error) => {
          console.error(
            'Error al actualizar los mensajes:',
            error
          );
        });
      },
      2000
    );

    return () => {
      window.clearInterval(intervalo);
    };
  }, [
    idCliente,
    idEmpleado,
    esEmpleado,
  ]);

  /*
   * Hace scroll al último mensaje.
   */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: primeraCargaRef.current
        ? 'auto'
        : 'smooth',
    });

    primeraCargaRef.current = false;
  }, [mensajes]);

  const handleEnviar = async () => {
    const mensajeLimpio = texto.trim();

    if (!mensajeLimpio || enviando) {
      return;
    }

    if (
      !Number.isInteger(idCliente) ||
      idCliente <= 0
    ) {
      alert('ID de cliente inválido');
      return;
    }

    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      alert('ID de empleado inválido');
      return;
    }

    try {
      setEnviando(true);

      const respuesta = await fetch(
        'http://localhost:3000/api/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            fk_cliente: idCliente,
            fk_empleado: idEmpleado,
            remitente: esEmpleado
              ? 'empleado'
              : 'cliente',
            mensaje: mensajeLimpio,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.mensaje ||
            'No se pudo enviar el mensaje'
        );
      }

      setTexto('');

      await cargarMensajes();
    } catch (error) {
      const mensaje =
        error instanceof Error
          ? error.message
          : 'Error al enviar el mensaje';

      console.error(
        'Error al enviar mensaje:',
        error
      );

      alert(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const formatTime = (fecha: string) => {
    const fechaMensaje = new Date(fecha);

    if (
      Number.isNaN(
        fechaMensaje.getTime()
      )
    ) {
      return '';
    }

    return fechaMensaje.toLocaleTimeString(
      'es-HN',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const esMensajePropio = (
    mensaje: MensajeChat
  ) => {
    return esEmpleado
      ? mensaje.remitente === 'empleado'
      : mensaje.remitente === 'cliente';
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          Cargando conversación...
        </p>
      </div>
    );
  }

  if (error || !contacto) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-sm font-semibold text-red-600">
          {error ||
            'No se encontró el contacto'}
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 rounded-xl bg-[#1A56DB] text-white text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Encabezado */}
      <div className="bg-card border-b border-border px-4 pt-10 pb-3 flex items-center gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={() =>
            navigate('/home/chat')
          }
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>

        <div className="relative">
          <ImageWithFallback
            src={contacto.foto}
            alt={contacto.nombre}
            className="w-9 h-9 rounded-full object-cover"
          />

          {!esEmpleado &&
            contacto.estado ===
              'Disponible' && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {contacto.nombre}
          </p>

          <p className="text-xs text-muted-foreground">
            {contacto.estado}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <Phone className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {mensajes.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <p className="text-sm font-semibold text-foreground">
                Inicia la conversación
              </p>

              <p className="text-xs text-muted-foreground mt-1">
                Escríbele un mensaje a{' '}
                {contacto.nombre}.
              </p>
            </div>
          </div>
        )}

        {mensajes.map((mensaje) => {
          const propio =
            esMensajePropio(mensaje);

          return (
            <motion.div
              key={mensaje.id_chat}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className={`flex ${
                propio
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[75%] flex flex-col gap-1 ${
                  propio
                    ? 'items-end'
                    : 'items-start'
                }`}
              >
                <div
                  className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                    propio
                      ? 'bg-[#1A56DB] text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                      : 'bg-card border border-border text-foreground rounded-tr-2xl rounded-tl-sm rounded-br-2xl rounded-bl-2xl'
                  }`}
                >
                  {mensaje.mensaje}
                </div>

                <span className="text-[10px] text-muted-foreground px-1">
                  {formatTime(
                    mensaje.fecha
                  )}

                  {propio && (
                    <span className="ml-1">
                      {Number(
                        mensaje.leido
                      ) === 1
                        ? '✓✓'
                        : '✓'}
                    </span>
                  )}
                </span>
              </div>
            </motion.div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Barra para escribir */}
      <div className="bg-card border-t border-border px-4 py-3 flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted"
        >
          <Image className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="flex-1 flex items-center bg-input-background rounded-2xl px-4 py-2 gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) =>
              setTexto(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey
              ) {
                e.preventDefault();
                handleEnviar();
              }
            }}
            placeholder={`Escribe a ${contacto.nombre}...`}
            className="flex-1 bg-transparent text-sm text-foreground outline-none"
            disabled={enviando}
          />

          <button type="button">
            <Smile className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={handleEnviar}
          disabled={
            !texto.trim() || enviando
          }
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            texto.trim() && !enviando
              ? 'bg-[#1A56DB] shadow-lg'
              : 'bg-muted'
          }`}
        >
          <Send
            className={`w-4 h-4 ${
              texto.trim() && !enviando
                ? 'text-white'
                : 'text-muted-foreground'
            }`}
          />
        </motion.button>
      </div>
    </div>
  );
}