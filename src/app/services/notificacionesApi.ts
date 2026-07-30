const API_URL = 'http://localhost:3000/api';

export interface NotificacionBackend {
  id_notificacion: number;
  titulo: string;
  descripcion: string;
  tipo: string;
  leida: boolean | number;
  fecha: string;
  fk_servicio: number | null;
}

export async function obtenerNotificacionesEmpleado(
  idEmpleado: number
): Promise<NotificacionBackend[]> {
  const respuesta = await fetch(
    `${API_URL}/notificaciones/empleado/${idEmpleado}`,
    {
      method: 'GET',
      cache: 'no-store',
    }
  );

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(
      datos?.mensaje ?? 'No se pudieron obtener las notificaciones'
    );
  }

  return Array.isArray(datos) ? datos : [];
}

export async function marcarNotificacionLeida(
  idNotificacion: number
): Promise<void> {
  const respuesta = await fetch(
    `${API_URL}/notificaciones/${idNotificacion}/leida`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(
      datos?.mensaje ?? 'No se pudo marcar la notificación como leída'
    );
  }
}