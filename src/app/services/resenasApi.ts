const API_URL = '/api';

async function leerRespuesta(
  respuesta: Response,
): Promise<any> {
  const texto = await respuesta.text();

  if (!texto.trim()) {
    return {};
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(
      'La API devolvió una respuesta inválida',
    );
  }
}

export async function responderResena(
  idResena: number,
  respuestaTexto: string,
): Promise<any> {
  const texto = respuestaTexto.trim();

  if (
    !Number.isInteger(idResena) ||
    idResena <= 0
  ) {
    throw new Error(
      'El ID de la reseña es inválido',
    );
  }

  if (texto.length < 3) {
    throw new Error(
      'La respuesta debe tener al menos 3 caracteres',
    );
  }

  if (texto.length > 500) {
    throw new Error(
      'La respuesta no puede superar los 500 caracteres',
    );
  }

  const respuesta = await fetch(
    `${API_URL}/resenas/${idResena}/respuesta`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type':
          'application/json',
      },
      body: JSON.stringify({
        respuesta: texto,
      }),
    },
  );

  const datos =
    await leerRespuesta(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos?.mensaje ??
        'No se pudo publicar la respuesta',
    );
  }

  return datos;
}