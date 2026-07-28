const API_URL = '/api';

export interface ServicioDisponible {
  id_servicio: number;
  fk_cliente: number;
  fk_categoria: number;
  fk_empleado?: number | null;
  fk_evidencia?: number | null;

  titulo?: string | null;
  descripcion: string;
  direccion: string;
  presupuesto: number | string;
  fecha: string;
  estado: string;

  nombre_cliente?: string | null;
  nombre_categoria?: string | null;
  foto_cliente?: string | null;
}

export interface PostulacionEmpleado {
  id_postulacion?: number;
  fk_servicio: number;
  fk_empleado?: number;
  estado: string;
  fecha?: string;
}

export interface RespuestaPostulacion {
  mensaje: string;
}

async function leerRespuesta(
  respuesta: Response
): Promise<any> {
  const texto = await respuesta.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(
      'El servidor devolvió una respuesta inválida'
    );
  }
}

function extraerPostulaciones(
  datos: any
): any[] {
  if (Array.isArray(datos)) {
    return datos;
  }

  if (
    datos &&
    Array.isArray(datos.postulaciones)
  ) {
    return datos.postulaciones;
  }

  if (
    datos &&
    Array.isArray(datos.recordset)
  ) {
    return datos.recordset;
  }

  if (
    datos &&
    Array.isArray(datos.recordsets) &&
    Array.isArray(datos.recordsets[0])
  ) {
    return datos.recordsets[0];
  }

  if (
    datos &&
    Array.isArray(datos.rows)
  ) {
    return datos.rows;
  }

  return [];
}

export async function obtenerServiciosDisponibles(): Promise<
  ServicioDisponible[]
> {
  const respuesta = await fetch(
    `${API_URL}/servicios`,
    {
      cache: 'no-store',
    }
  );

  const datos =
    await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ||
        'No se pudieron cargar las solicitudes'
    );
  }

  if (!Array.isArray(datos)) {
    return [];
  }

  return datos.filter(
    (servicio: ServicioDisponible) => {
      const estado = String(
        servicio.estado ?? ''
      )
        .trim()
        .toLowerCase();

      return estado === 'pendiente';
    }
  );
}

export async function obtenerServicioPorId(
  idServicio: number
): Promise<ServicioDisponible> {
  if (
    !Number.isInteger(idServicio) ||
    idServicio <= 0
  ) {
    throw new Error(
      'El ID del servicio es inválido'
    );
  }

  const respuesta = await fetch(
    `${API_URL}/servicios/${idServicio}`,
    {
      cache: 'no-store',
    }
  );

  const datos =
    await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ||
        'No se pudo cargar la solicitud'
    );
  }

  const servicio =
    datos?.servicio ?? datos;

  if (
    !servicio ||
    Number(servicio.id_servicio) !==
      idServicio
  ) {
    throw new Error(
      'No se encontró la solicitud'
    );
  }

  return servicio as ServicioDisponible;
}

export async function obtenerPostulacionesCompletasEmpleado(
  idEmpleado: number
): Promise<PostulacionEmpleado[]> {
  if (
    !Number.isInteger(idEmpleado) ||
    idEmpleado <= 0
  ) {
    return [];
  }

  const respuesta = await fetch(
    `${API_URL}/empleados/${idEmpleado}/postulaciones`,
    {
      cache: 'no-store',
    }
  );

  if (respuesta.status === 404) {
    return [];
  }

  const datos =
    await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos.detalle ||
        datos.mensaje ||
        'No se pudieron consultar las postulaciones'
    );
  }

  const lista =
    extraerPostulaciones(datos);

  return lista
    .map(
      (
        item: any
      ): PostulacionEmpleado => ({
        id_postulacion:
          item.id_postulacion !==
          undefined
            ? Number(
                item.id_postulacion
              )
            : undefined,

        fk_servicio: Number(
          item.fk_servicio ??
            item.id_servicio
        ),

        fk_empleado:
          item.fk_empleado !==
          undefined
            ? Number(
                item.fk_empleado
              )
            : undefined,

        estado: String(
          item.estado ?? 'Pendiente'
        )
          .trim()
          .toLowerCase(),

        fecha:
          item.fecha !== undefined
            ? String(item.fecha)
            : undefined,
      })
    )
    .filter(
      (item) =>
        Number.isInteger(
          item.fk_servicio
        ) &&
        item.fk_servicio > 0
    );
}

export async function obtenerPostulacionesEmpleado(
  idEmpleado: number
): Promise<number[]> {
  const postulaciones =
    await obtenerPostulacionesCompletasEmpleado(
      idEmpleado
    );

  return [
    ...new Set(
      postulaciones.map(
        (item) =>
          item.fk_servicio
      )
    ),
  ];
}

export async function obtenerEstadoPostulacion(
  idEmpleado: number,
  idServicio: number
): Promise<string | null> {
  if (
    !Number.isInteger(idEmpleado) ||
    idEmpleado <= 0 ||
    !Number.isInteger(idServicio) ||
    idServicio <= 0
  ) {
    return null;
  }

  const postulaciones =
    await obtenerPostulacionesCompletasEmpleado(
      idEmpleado
    );

  const postulacion =
    postulaciones.find(
      (item) =>
        Number(item.fk_servicio) ===
          idServicio &&
        (
          item.fk_empleado ===
            undefined ||
          Number(item.fk_empleado) ===
            idEmpleado
        )
    );

  return postulacion?.estado ?? null;
}

export async function postularEmpleadoServicio(
  idServicio: number,
  idEmpleado: number
): Promise<RespuestaPostulacion> {
  if (
    !Number.isInteger(idServicio) ||
    idServicio <= 0
  ) {
    throw new Error(
      'El ID del servicio es inválido'
    );
  }

  if (
    !Number.isInteger(idEmpleado) ||
    idEmpleado <= 0
  ) {
    throw new Error(
      'El ID del empleado es inválido'
    );
  }

  const respuesta = await fetch(
    `${API_URL}/servicios/${idServicio}/postular`,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        fk_empleado: idEmpleado,
      }),
    }
  );

  const datos =
    await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos.detalle ||
        datos.mensaje ||
        'No se pudo registrar la postulación'
    );
  }

  return datos;
}