const API_URL = '/api';

export interface SolicitudCliente {
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

  cantidad_postulaciones?: number;
}

export interface PostulanteServicio {
  id_postulacion: number;
  fk_servicio: number;
  fk_empleado: number;
  
  estado_postulacion: string;
  estado_negociacion?: string | null;
  
  fecha_postulacion?: string | null;

  id_empleado: number;
  nombre_E: string;
  correo?: string | null;
  celular?: string | null;
  titulo?: string | null;
  direccion?: string | null;
  estado_empleado?: string | null;
  N_trabajos?: number | null;

  tipo_postulacion?: 'aceptar' | 'negociar' | string | null;
}

export interface DetallePostulaciones {
  servicio: SolicitudCliente;
  postulaciones: PostulanteServicio[];
}

interface RespuestaMensaje {
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

export async function obtenerSolicitudesCliente(
  idCliente: number
): Promise<SolicitudCliente[]> {
  if (
    !Number.isInteger(idCliente) ||
    idCliente <= 0
  ) {
    return [];
  }

  const respuesta = await fetch(
    `${API_URL}/servicios`
  );

  const datos = await leerRespuesta(
    respuesta
  );

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ||
        'No se pudieron cargar tus solicitudes'
    );
  }

  if (!Array.isArray(datos)) {
    return [];
  }

  const solicitudesCliente =
    datos.filter(
      (servicio: SolicitudCliente) =>
        Number(servicio.fk_cliente) ===
        idCliente
    );

  const solicitudesConCantidad =
    await Promise.all(
      solicitudesCliente.map(
        async (
          servicio: SolicitudCliente
        ) => {
          try {
            const detalle =
              await obtenerPostulacionesServicio(
                Number(
                  servicio.id_servicio
                )
              );

            return {
              ...servicio,
              cantidad_postulaciones:
                detalle.postulaciones.length,
            };
                  } catch (error) {
          console.error(
            `Error al obtener postulaciones del servicio ${servicio.id_servicio}:`,
            error
          );

          return {
            ...servicio,
            cantidad_postulaciones: 0,
          };
        }

        }
      )
    );

  return solicitudesConCantidad.sort(
    (a, b) =>
      Number(b.id_servicio) -
      Number(a.id_servicio)
  );
}

export async function obtenerPostulacionesServicio(
  idServicio: number
): Promise<DetallePostulaciones> {
  if (
    !Number.isInteger(idServicio) ||
    idServicio <= 0
  ) {
    throw new Error(
      'El ID del servicio es inválido'
    );
  }

  const respuesta = await fetch(
    `${API_URL}/servicios/${idServicio}/postulaciones`
  );

  const datos = await leerRespuesta(
    respuesta
  );

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ||
        'No se pudieron consultar las postulaciones'
    );
  }

  return {
    servicio: datos.servicio,
    postulaciones: Array.isArray(
      datos.postulaciones
    )
      ? datos.postulaciones
      : [],
  };
}

export async function aceptarPostulante(
  idServicio: number,
  idEmpleado: number
): Promise<RespuestaMensaje> {
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
    `${API_URL}/servicios/${idServicio}/aceptar`,
    {
      method: 'PUT',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        fk_empleado: idEmpleado,
      }),
    }
  );

  const datos = await leerRespuesta(
    respuesta
  );

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ||
        'No se pudo seleccionar al trabajador'
    );
  }

  return datos;
}

export async function rechazarPostulante(
  idPostulacion: number
): Promise<RespuestaMensaje> {
  if (!Number.isInteger(idPostulacion) || idPostulacion <= 0) {
    throw new Error('ID de postulación inválido');
  }

  const respuesta = await fetch(
    `${API_URL}/postulaciones/${idPostulacion}/rechazar`,
    {
      method: 'PUT',
    }
  );

  const datos = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'No se pudo rechazar la postulación');
  }

  return datos;
}