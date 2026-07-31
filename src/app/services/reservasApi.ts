const API_URL = 'http://localhost:3000/api';

export interface ReservaDetalle {
  id_reserva: number;
  id_servicio?: number;
  id_empleado: number;
  descripcion?: string | null;
  fecha?: string | null;
  hora?: string | null;
  nombre_empleado?: string | null;
  foto_empleado?: string | null;
}

export interface CrearResenaPayload {
  id_reserva: number;
  id_empleado: number;
  calificacion_general: number;
  puntualidad?: number | null;
  calidad?: number | null;
  comunicacion?: number | null;
  comentario?: string | null;
}

async function leerRespuesta(respuesta: Response): Promise<any> {
  const texto = await respuesta.text();

  if (!texto) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error('La API devolvió una respuesta inválida');
  }
}

export async function obtenerReservaPorId(
  idReserva: number
): Promise<ReservaDetalle> {
  if (!Number.isInteger(idReserva) || idReserva <= 0) {
    throw new Error('El ID de la reserva es inválido');
  }

  const respuesta = await fetch(`${API_URL}/reservas/${idReserva}`, {
    cache: 'no-store',
  });

  const datos = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(datos?.mensaje || 'No se pudo cargar la reserva');
  }

  const reserva = datos?.reserva ?? datos;

  if (!reserva || !Number.isInteger(Number(reserva.id_reserva))) {
    throw new Error('No se encontró la reserva');
  }

  return reserva as ReservaDetalle;
}

export async function obtenerReservaPorServicio(
  idServicio: number
): Promise<ReservaDetalle> {
  if (!Number.isInteger(idServicio) || idServicio <= 0) {
    throw new Error('El ID del servicio es inválido');
  }

  const respuesta = await fetch(
    `${API_URL}/reservas/servicio/${idServicio}`,
    {
      cache: 'no-store',
    }
  );

  const datos = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos?.mensaje || 'No se pudo cargar la reserva asociada al servicio'
    );
  }

  const reserva = datos?.reserva ?? datos;

  if (!reserva || !Number.isInteger(Number(reserva.id_reserva))) {
    throw new Error('No existe una reserva para este servicio');
  }

  return reserva as ReservaDetalle;
}

export async function crearResena(payload: CrearResenaPayload): Promise<any> {
  if (!Number.isInteger(payload.id_reserva) || payload.id_reserva <= 0) {
    throw new Error('Falta un id_reserva válido');
  }

  if (!Number.isInteger(payload.id_empleado) || payload.id_empleado <= 0) {
    throw new Error('Falta un id_empleado válido');
  }

  if (
    !Number.isInteger(payload.calificacion_general) ||
    payload.calificacion_general < 1 ||
    payload.calificacion_general > 5
  ) {
    throw new Error('La calificación general debe estar entre 1 y 5');
  }

  const respuesta = await fetch(`${API_URL}/resenas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const datos = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(datos?.mensaje || 'No se pudo enviar la reseña');
  }

  return datos;
}
