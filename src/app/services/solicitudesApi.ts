
interface NuevaSolicitudParams {
  fk_cliente: number;
  categoria: number | null;
  titulo: string;
  descripcion: string;
  presupuesto: number;
  direccion: string;
  fecha: string;
}
interface RespuestaRegistroSolicitud {
  mensaje: string;
  resultado: {
    insertId: number;
  };
}

// 1. FUNCIÓN PARA OBTENER CATEGORÍAS (Va afuera, es independiente)
export const obtenerCategoriasDB = async () => {
  const response = await fetch('http://localhost:3000/api/categorias');
  if (!response.ok) {
    throw new Error('Error al obtener las categorías');
  }
  return await response.json();
};

// 2. FUNCIÓN PARA CREAR LA SOLICITUD
export async function crearSolicitud(
  params: NuevaSolicitudParams,
): Promise<RespuestaRegistroSolicitud> {
  
  // Adaptamos los datos para que coincidan exactamente con la tabla "servicios"
  const payloadBD = {
    fk_cliente: Number(params.fk_cliente),
    fk_categoria: Number(params.categoria),
    // Unimos el título y la descripción ya que la BD solo tiene un campo
    descripcion: params.descripcion 
      ? `${params.titulo} - ${params.descripcion}` 
      : params.titulo,
    direccion: params.direccion,
    presupuesto: Number(params.presupuesto),
    // Generamos la fecha actual en formato YYYY-MM-DD
    fecha: new Date().toISOString().split('T')[0],
    
    fk_evidencia: null 
  };

  const respuesta = await fetch(
    'http://localhost:3000/api/servicios', 
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadBD),
    },
  );

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(
      datos.mensaje ?? 'No se pudo publicar la solicitud',
    );
  }

  return datos;
}