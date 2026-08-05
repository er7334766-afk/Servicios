// services/workerApi.ts
export const actualizarDisponibilidad = async (workerId: string, status: boolean, idEmpleado?: string | number) => {
  const response = await fetch(`https://servicios-59g4.onrender.com/api/workers/${workerId}/disponibilidad`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      disponible: status,
      idEmpleado: idEmpleado ?? workerId,
    }),
  });

  if (!response.ok) throw new Error('Error al actualizar disponibilidad');
  return await response.json();
};
