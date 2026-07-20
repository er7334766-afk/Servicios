// services/workerApi.ts
export const actualizarDisponibilidad = async (workerId: string, status: boolean) => {
  const response = await fetch(`http://localhost:3000/api/workers/${workerId}/disponibilidad`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ disponible: status }),
  });

  if (!response.ok) throw new Error('Error al actualizar disponibilidad');
  return await response.json();
};