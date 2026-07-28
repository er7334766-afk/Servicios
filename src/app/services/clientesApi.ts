export interface NuevoCliente {
  nombre_C: string;
  password_C: string;
  correo: string;
  celular: string;
}

export async function registrarCliente(cliente: NuevoCliente) {
  const respuesta = await fetch(
    'http://localhost:3000/api/clientes',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cliente),
    },
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ?? 'No se pudo registrar el cliente',
    );
  }

  return datos;
}

// Obtener lista de clientes
export async function obtenerClientes(): Promise<any[]> {
  const resp = await fetch('http://localhost:3000/api/clientes');
  const datos = await resp.json();

  if (!resp.ok) {
    throw new Error(datos.mensaje ?? 'No se pudieron obtener los clientes');
  }

  return datos;
}