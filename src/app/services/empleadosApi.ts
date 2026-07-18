export interface NuevoEmpleado {
  nombre_E: string;
  password_E: string;
  correo: string;
  celular: string;
}

interface RespuestaRegistroEmpleado {
  mensaje: string;
  resultado: {
    insertId: number;
  };
}

export async function registrarEmpleado(
  empleado: NuevoEmpleado,
): Promise<RespuestaRegistroEmpleado> {
  const respuesta = await fetch(
    'http://localhost:3000/api/empleados',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(empleado),
    },
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ?? 'No se pudo registrar el empleado',
    );
  }

  return datos;
}