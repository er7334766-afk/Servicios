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
  };
}

export async function iniciarSesion(
  credenciales: CredencialesLogin,
): Promise<RespuestaLogin> {
  // NOTA: Ajusta esta URL según cómo esté configurado tu backend.
  // Si tu backend tiene rutas separadas, podrías hacer un if (credenciales.rol === 'worker') aquí.
  const respuesta = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credenciales),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ?? 'Correo o contraseña incorrectos',
    );
  }

  return datos;
}