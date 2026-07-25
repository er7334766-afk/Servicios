interface NuevaSolicitudParams {
  fk_cliente: number;
  categoria: number | null;
  titulo: string;
  descripcion: string;
  presupuesto: number;
  direccion: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

interface RespuestaRegistroSolicitud {
  mensaje: string;
  resultado: {
    insertId: number;
  };
}

// ==========================================
// OBTENER CATEGORÍAS
// ==========================================
export const obtenerCategoriasDB = async () => {
  const response = await fetch(
    'http://localhost:3000/api/categorias'
  );

  const datos = await response.json();

  if (!response.ok) {
    throw new Error(
      datos.mensaje ??
        'Error al obtener las categorías'
    );
  }

  return datos;
};

// ==========================================
// CREAR SOLICITUD
// ==========================================
export async function crearSolicitud(
  params: NuevaSolicitudParams
): Promise<RespuestaRegistroSolicitud> {
  if (
    !params.categoria ||
    !params.fecha ||
    !params.hora_inicio ||
    !params.hora_fin
  ) {
    throw new Error(
      'La categoría, fecha y horario son obligatorios'
    );
  }

  if (params.hora_fin <= params.hora_inicio) {
    throw new Error(
      'La hora final debe ser posterior a la hora inicial'
    );
  }

  const payloadBD = {
    fk_cliente: Number(params.fk_cliente),
    fk_categoria: Number(params.categoria),
    fk_evidencia: null,

    titulo: params.titulo.trim(),

    descripcion: params.descripcion.trim(),

    direccion: params.direccion.trim(),

    presupuesto: Number(params.presupuesto),

    fecha: params.fecha,

    hora_inicio: params.hora_inicio,

    hora_fin: params.hora_fin,
  };

  const respuesta = await fetch(
    'http://localhost:3000/api/servicios',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadBD),
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ??
        'No se pudo publicar la solicitud'
    );
  }

  return datos;
}