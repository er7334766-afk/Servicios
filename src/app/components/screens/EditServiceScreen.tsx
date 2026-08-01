// EditServiceScreen.tsx
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface EditServicesScreenProps {
  idEmpleado: number;
  onBack: () => void;
}

interface Categoria {
  id_categoria: number | string;
  nombre: string;
  //subCategoria?: string;
  //subCatgeoria?: string;
}


interface Subcategoria {
  id_subcategoria: number;
  nombre: string;
  descripcion?: string;
  fk_categoria?: number;
  id_categoria?: number;
}

export default function EditServicesScreen({
  idEmpleado,
  onBack,
}: EditServicesScreenProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [seleccionadasOriginales, setSeleccionadasOriginales] =
    useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [subcategoriasPorCategoria, setSubcategoriasPorCategoria] =
  useState<Record<number, Subcategoria[]>>({});

  const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] =
  useState<number[]>([]);

  const [cargandoSubcategorias, setCargandoSubcategorias] =
  useState<Record<number, boolean>>({});

  useEffect(() => {
  const cargarDatosIniciales = async () => {
    try {
      setCargando(true);
      setError('');

      const [
        respuestaCategorias,
        respuestaCategoriasEmpleado,
        respuestaSubcategoriasEmpleado,
      ] = await Promise.all([
        fetch(
          'http://localhost:3000/api/categorias',
          { cache: 'no-store' }
        ),

        fetch(
          `http://localhost:3000/api/empleados/${idEmpleado}/categorias`,
          { cache: 'no-store' }
        ),

        fetch(
          `http://localhost:3000/api/empleados/${idEmpleado}/subcategorias`,
          { cache: 'no-store' }
        ),
      ]);

      if (!respuestaCategorias.ok) {
        throw new Error(
          'No se pudieron cargar las categorías'
        );
      }

      const datosCategorias =
        await respuestaCategorias.json();

      const todasLasCategorias: Categoria[] =
        Array.isArray(datosCategorias)
          ? datosCategorias
          : Array.isArray(
                datosCategorias?.categorias
              )
            ? datosCategorias.categorias
            : [];

      setCategorias(todasLasCategorias);

      // ==========================================
      // CATEGORÍAS GUARDADAS DEL EMPLEADO
      // ==========================================
      let idsCategoriasSeleccionadas: number[] = [];

      if (respuestaCategoriasEmpleado.ok) {
        const datosCategoriasEmpleado =
          await respuestaCategoriasEmpleado.json();

        const categoriasEmpleado: Categoria[] =
          Array.isArray(datosCategoriasEmpleado)
            ? datosCategoriasEmpleado
            : Array.isArray(
                  datosCategoriasEmpleado?.categorias
                )
              ? datosCategoriasEmpleado.categorias
              : [];

        idsCategoriasSeleccionadas =
          categoriasEmpleado
            .map((categoria) =>
              Number(categoria.id_categoria)
            )
            .filter(
              (id) =>
                Number.isInteger(id) && id > 0
            );
      }

      setSeleccionadas(
        idsCategoriasSeleccionadas
      );

      setSeleccionadasOriginales(
        idsCategoriasSeleccionadas
      );

      // ==========================================
      // SUBCATEGORÍAS GUARDADAS DEL EMPLEADO
      // ==========================================
      if (respuestaSubcategoriasEmpleado.ok) {
        const datosSubcategoriasEmpleado =
          await respuestaSubcategoriasEmpleado.json();

        const subcategoriasEmpleado:
          Subcategoria[] = Array.isArray(
            datosSubcategoriasEmpleado
          )
            ? datosSubcategoriasEmpleado
            : Array.isArray(
                  datosSubcategoriasEmpleado
                    ?.subcategorias
                )
              ? datosSubcategoriasEmpleado
                  .subcategorias
              : [];

        const idsSubcategorias =
          subcategoriasEmpleado
            .map((subcategoria) =>
              Number(
                subcategoria.id_subcategoria
              )
            )
            .filter(
              (id) =>
                Number.isInteger(id) && id > 0
            );

        setSubcategoriasSeleccionadas(
          idsSubcategorias
        );
      } else {
        setSubcategoriasSeleccionadas([]);
      }

      // ==========================================
      // CARGAR LAS SUBCATEGORÍAS DE TODAS LAS
      // CATEGORÍAS YA SELECCIONADAS
      // ==========================================
      const resultadosSubcategorias =
        await Promise.all(
          idsCategoriasSeleccionadas.map(
            async (idCategoria) => {
              try {
                const respuesta = await fetch(
                  `http://localhost:3000/api/categorias/${idCategoria}/subcategorias`,
                  { cache: 'no-store' }
                );

                if (!respuesta.ok) {
                  return {
                    idCategoria,
                    subcategorias: [] as Subcategoria[],
                  };
                }

                const datos =
                  await respuesta.json();

                const subcategorias:
                  Subcategoria[] = Array.isArray(
                    datos
                  )
                    ? datos
                    : Array.isArray(
                          datos?.subcategorias
                        )
                      ? datos.subcategorias
                      : [];

                return {
                  idCategoria,
                  subcategorias,
                };
              } catch (error) {
                console.error(
                  `Error al cargar subcategorías de la categoría ${idCategoria}:`,
                  error
                );

                return {
                  idCategoria,
                  subcategorias:
                    [] as Subcategoria[],
                };
              }
            }
          )
        );

      const subcategoriasAgrupadas: Record<
        number,
        Subcategoria[]
      > = {};

      resultadosSubcategorias.forEach(
        ({
          idCategoria,
          subcategorias,
        }) => {
          subcategoriasAgrupadas[idCategoria] =
            subcategorias;
        }
      );

      setSubcategoriasPorCategoria(
        subcategoriasAgrupadas
      );
    } catch (error) {
      console.error(
        'Error al cargar servicios:',
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los servicios'
      );
    } finally {
      setCargando(false);
    }
  };

  if (
    Number.isInteger(idEmpleado) &&
    idEmpleado > 0
  ) {
    cargarDatosIniciales();
  }
}, [idEmpleado]);

  const toggleCategoria = async (idCategoria: number) => {
  const yaSeleccionada = seleccionadas.includes(idCategoria);

  if (yaSeleccionada) {
    setSeleccionadas((anteriores) =>
      anteriores.filter((id) => id !== idCategoria)
    );

    const subcategoriasCategoria =
      subcategoriasPorCategoria[idCategoria] ?? [];

    const idsSubcategoriasCategoria = subcategoriasCategoria.map(
      (subcategoria) => Number(subcategoria.id_subcategoria)
    );

    setSubcategoriasSeleccionadas((anteriores) =>
      anteriores.filter(
        (idSubcategoria) =>
          !idsSubcategoriasCategoria.includes(idSubcategoria)
      )
    );

    return;
  }

  setSeleccionadas((anteriores) => [
    ...anteriores,
    idCategoria,
  ]);

  // Evita volver a consultar si ya fueron cargadas
  if (subcategoriasPorCategoria[idCategoria]) {
    return;
  }

  try {
    setCargandoSubcategorias((anteriores) => ({
      ...anteriores,
      [idCategoria]: true,
    }));

    console.log('ID EMPLEADO ENVIADO:', idEmpleado);
    const respuesta = await fetch(
      `http://localhost:3000/api/categorias/${idCategoria}/subcategorias`
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.mensaje || 'No se pudieron cargar las subcategorías'
      );
    }

    // Funciona si el backend devuelve un arreglo directo
    // o { subcategorias: [...] }
    const subcategorias: Subcategoria[] = Array.isArray(datos)
      ? datos
      : datos.subcategorias ?? [];

    setSubcategoriasPorCategoria((anteriores) => ({
      ...anteriores,
      [idCategoria]: subcategorias,
    }));
  } catch (error) {
    console.error('Error al cargar subcategorías:', error);

    alert(
      error instanceof Error
        ? error.message
        : 'No se pudieron cargar las subcategorías'
    );

    setSeleccionadas((anteriores) =>
      anteriores.filter((id) => id !== idCategoria)
    );
  } finally {
    setCargandoSubcategorias((anteriores) => ({
      ...anteriores,
      [idCategoria]: false,
    }));
  }
};

const toggleSubcategoria = (idSubcategoria: number) => {
  setSubcategoriasSeleccionadas((anteriores) => {
    if (anteriores.includes(idSubcategoria)) {
      return anteriores.filter(
        (id) => id !== idSubcategoria
      );
    }

    return [...anteriores, idSubcategoria];
  });
};



 /*const guardar = async () => {
  try {
    setGuardando(true);

    const categoriasAgregar = seleccionadas.filter(
      (id) => !seleccionadasOriginales.includes(id)
    );

    const categoriasEliminar = seleccionadasOriginales.filter(
      (id) => !seleccionadas.includes(id)
    );

    for (const idCategoria of categoriasAgregar) {
      const respuesta = await fetch(
        `http://localhost:3000/api/empleados/${idEmpleado}/categorias`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ idCategoria }),
        }
      );

      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(`POST: ${texto}`);
      }
    }

    for (const idCategoria of categoriasEliminar) {
      const respuesta = await fetch(
        `http://localhost:3000/api/empleados/${idEmpleado}/categorias/${idCategoria}`,
        {
          method: 'DELETE',
        }
      );

      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(`DELETE: ${texto}`);
      }
    }

    onBack();
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      setError(error.message);
    } else {
      setError('No se pudieron guardar los servicios');
    }

    window.setTimeout(() => setError(''), 5000);
  } finally {
    setGuardando(false);
  }
};*/
const guardar = async () => {
  try {
    setGuardando(true);
    setError('');
    setSuccess('');

    const cuerpo = {
      categorias: seleccionadas,
      subcategorias:
        subcategoriasSeleccionadas,
    };

    console.log(
      'ID empleado:',
      idEmpleado
    );

    console.log(
      'Datos que se enviarán:',
      cuerpo
    );

    const respuesta = await fetch(
  `http://localhost:3000/api/empleados/${idEmpleado}/categorias`,
  {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cuerpo),
  }
);

    const texto = await respuesta.text();

    console.log(
      'Respuesta cruda:',
      texto
    );

    let datos: any = {};

    try {
      datos = JSON.parse(texto);
    } catch {
      datos = {
        mensaje: texto,
      };
    }

    if (!respuesta.ok) {
      throw new Error(
        datos.detalle ||
          datos.mensaje ||
          `Error HTTP ${respuesta.status}`
      );
    }

    setSuccess(
      'Servicios guardados correctamente'
    );

    alert(
      'Categorías y subcategorías guardadas correctamente'
    );

    onBack();
  } catch (error) {
    console.error(
      'ERROR DEL FRONTEND:',
      error
    );

    const mensaje =
      error instanceof Error
        ? error.message
        : 'No se pudo guardar';

    setError(mensaje);
    alert(mensaje);
  } finally {
    setGuardando(false);
  }
};

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          <h1 className="text-lg font-bold text-white">
            Editar servicios
          </h1>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 px-5 py-5">
        <p className="text-sm text-muted-foreground mb-5">
          Selecciona los servicios que deseas ofrecer.
        </p>

        {cargando ? (
          <p className="text-sm text-muted-foreground">
            Cargando servicios...
          </p>
        ) : (
          <div className="space-y-3">
  {categorias.map((categoria) => {
    const idCategoria = Number(categoria.id_categoria);
    const categoriaSeleccionada =
      seleccionadas.includes(idCategoria);

    const subcategorias =
      subcategoriasPorCategoria[idCategoria] ?? [];

    return (
      <div
        key={idCategoria}
        className="overflow-hidden rounded-xl border border-border"
      >
        <label className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-secondary">
          <span className="font-medium">
            {categoria.nombre}
          </span>

          <input
            type="checkbox"
            checked={categoriaSeleccionada}
            onChange={() => toggleCategoria(idCategoria)}
            className="h-5 w-5 accent-[#1A56DB]"
          />
        </label>

        {categoriaSeleccionada && (
          <div className="border-t border-border bg-slate-50 px-4 py-3">
            {cargandoSubcategorias[idCategoria] ? (
              <p className="text-sm text-muted-foreground">
                Cargando subcategorías...
              </p>
            ) : subcategorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta categoría no tiene subcategorías.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Selecciona las subcategorías
                </p>

                {subcategorias.map((subcategoria) => {
                  const idSubcategoria = Number(
                    subcategoria.id_subcategoria
                  );

                  return (
                    <label
                      key={idSubcategoria}
                      className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3"
                    >
                      <input
                        type="checkbox"
                        checked={subcategoriasSeleccionadas.includes(
                          idSubcategoria
                        )}
                        onChange={() =>
                          toggleSubcategoria(idSubcategoria)
                        }
                        className="mt-0.5 h-4 w-4 accent-[#1A56DB]"
                      />

                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {subcategoria.nombre}
                        </p>

                        {subcategoria.descripcion && (
                          <p className="mt-1 text-xs text-slate-500">
                            {subcategoria.descripcion}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  })}
</div>
        )}
      </div>

      {/* Botón */}
      <div className="px-5 pb-6">
        <motion.button
          type="button"
          onClick={guardar}
          disabled={guardando || cargando}
          className="w-full bg-[#1A56DB] text-white rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {guardando
            ? 'Guardando...'
            : 'Guardar cambios'}
        </motion.button>
      </div>
    </div>
  );
}