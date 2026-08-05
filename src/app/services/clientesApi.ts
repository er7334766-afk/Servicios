export interface NuevoCliente {
  nombre_C: string;
  password_C: string;
  correo: string;
  celular: string;
}

export async function registrarCliente(
  cliente: NuevoCliente,
) {
  const respuesta = await fetch(
    'https://servicios-59g4.onrender.com/api/clientes',
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cliente),
    },
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ??
        'No se pudo registrar el cliente',
    );
  }

  return datos;
}

// Obtener lista de clientes
export async function obtenerClientes(): Promise<any[]> {
  const resp = await fetch(
    'https://servicios-59g4.onrender.com/api/clientes',
    {
      credentials: 'include',
    },
  );

  const datos = await resp.json();

  if (!resp.ok) {
    throw new Error(
      datos.mensaje ??
        'No se pudieron obtener los clientes',
    );
  }

  return datos;
}
