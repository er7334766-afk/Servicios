const API_URL = 'https://servicios-59g4.onrender.com/api';

export interface CredencialesLogin {
  correo: string;
  password: string;
  rol: 'client' | 'worker'; // Le enviamos el rol para que el backend sepa dónde buscar
}

export interface RespuestaLogin {
  mensaje: string;
  usuario: {
    id: number;
    nombre: string;
    correo: string;
    celular: string;
    estado?: string;
    foto?: string;
  };
}

export async function iniciarSesion(
  credenciales: CredencialesLogin,
): Promise<RespuestaLogin> {
  const respuesta = await fetch(`${API_URL}/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credenciales),
  });

  const texto = await respuesta.text();
  let datos: any = {};

  try {
    datos = texto ? JSON.parse(texto) : {};
  } catch (error) {
    throw new Error(
      `Respuesta inválida del servidor: ${texto || respuesta.statusText}`,
    );
  }

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ?? 'Correo o contraseña incorrectos',
    );
  }

  return datos;
}