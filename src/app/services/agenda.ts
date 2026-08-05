const API_URL = 'https://servicios-59g4.onrender.com/api';

export interface AgendaReserva {
  id_reserva: number;
  id_servicio?: number | null;
  id_empleado: number;
  descripcion: string;
  fecha: string;
  hora?: string | null;
  fecha_creacion?: string;
}

export interface CrearAgendaPayload {
  id_empleado: number;
  descripcion: string;
  fecha: string;
  hora?: string | null;
  id_servicio?: number | null;
}

export async function obtenerReservasEmpleado(
  idEmpleado: number
): Promise<AgendaReserva[]> {
  if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
    return [];
  }

  const response = await fetch(
    `${API_URL}/agenda/empleados/${idEmpleado}`,
    { cache: 'no-store' }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensaje || 'No se pudieron cargar las reservas de agenda');
  }

  return Array.isArray(data) ? data : [];
}

export async function crearReservaAgenda(
  payload: CrearAgendaPayload
): Promise<{ mensaje: string; resultado: unknown }> {
  if (!Number.isInteger(payload.id_empleado) || payload.id_empleado <= 0) {
    throw new Error('El empleado es obligatorio');
  }

  if (!String(payload.descripcion ?? '').trim()) {
    throw new Error('La descripción es obligatoria');
  }

  if (!String(payload.fecha ?? '').trim()) {
    throw new Error('La fecha es obligatoria');
  }

  const body = {
    id_servicio: payload.id_servicio ?? null,
    id_empleado: payload.id_empleado,
    descripcion: String(payload.descripcion).trim(),
    fecha: String(payload.fecha).trim(),
    hora: payload.hora ? String(payload.hora).trim() : null,
  };

  const response = await fetch(`${API_URL}/agenda`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.mensaje || 'No se pudo guardar la reserva de agenda');
  }

  return data;
}
