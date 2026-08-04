const API_URL = '/api';

export interface MetodoPago {
  id_payment_method: number;
  fk_usuario: number;
  tipo: string;
  titular: string;
  numero_enmascarado: string;
  expiracion?: string | null;
  fecha_creacion?: string | null;
}

export interface CrearMetodoPagoPayload {
  fk_usuario: number;
  tipo: 'card';
  titular: string;
  numero_enmascarado: string;
  expiracion?: string | null;
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

export async function obtenerMetodosPago(
  idUsuario: number,
): Promise<MetodoPago[]> {
  if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
    throw new Error('El ID del usuario es inválido');
  }

  const respuesta = await fetch(
    `${API_URL}/payment-methods/${idUsuario}`,
    {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  const datos = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos?.mensaje ?? 'No se pudieron cargar los métodos de pago',
    );
  }

  return Array.isArray(datos) ? datos : [];
}

export async function guardarMetodoPago(
  payload: CrearMetodoPagoPayload,
): Promise<any> {
  if (!Number.isInteger(payload.fk_usuario) || payload.fk_usuario <= 0) {
    throw new Error('El ID del usuario es inválido');
  }

  if (!payload.titular.trim()) {
    throw new Error('El titular es obligatorio');
  }

  if (!payload.numero_enmascarado.trim()) {
    throw new Error('El número enmascarado es obligatorio');
  }

  const respuesta = await fetch(
    `${API_URL}/payment-methods`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  const datos = await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos?.mensaje ?? 'No se pudo guardar el método de pago',
    );
  }

  return datos;
}