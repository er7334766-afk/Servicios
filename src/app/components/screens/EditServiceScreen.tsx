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
  subCategoria?: string;
  subCatgeoria?: string;
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

  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        setCargando(true);

        const [respuestaCategorias, respuestaEmpleado] = await Promise.all([
          fetch('http://localhost:3000/api/categorias'),
          fetch(
            `http://localhost:3000/api/empleados/${idEmpleado}/categorias`
          ),
        ]);

        if (!respuestaCategorias.ok) {
          throw new Error('No se pudieron cargar todas las categorías');
        }

        const todasLasCategorias = await respuestaCategorias.json();

        const categoriasNormalizadas: Categoria[] = Array.isArray(
          todasLasCategorias
        )
          ? todasLasCategorias
          : todasLasCategorias.categorias || [];

        setCategorias(categoriasNormalizadas);

        if (respuestaEmpleado.ok) {
          const datosEmpleado = await respuestaEmpleado.json();

          const categoriasEmpleado: Categoria[] = Array.isArray(datosEmpleado)
            ? datosEmpleado
            : datosEmpleado.categorias || [];

          const idsSeleccionados = categoriasEmpleado.map((categoria) =>
            Number(categoria.id_categoria)
          );

          setSeleccionadas(idsSeleccionados);
          setSeleccionadasOriginales(idsSeleccionados);
        } else {
          setSeleccionadas([]);
          setSeleccionadasOriginales([]);
        }
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        alert('No se pudieron cargar los servicios');
      } finally {
        setCargando(false);
      }
    };

    cargarCategorias();
  }, [idEmpleado]);

  const toggleCategoria = (idCategoria: number) => {
    setSeleccionadas((anteriores) => {
      if (anteriores.includes(idCategoria)) {
        return anteriores.filter((id) => id !== idCategoria);
      }

      return [...anteriores, idCategoria];
    });
  };

 const guardar = async () => {
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
      alert(error.message);
    } else {
      alert('No se pudieron guardar los servicios');
    }
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

              return (
                <label
                  key={idCategoria}
                  className="flex items-center justify-between p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary transition-colors"
                >
                  <span className="font-medium">
                    {categoria.nombre}
                  </span>

                  <input
                    type="checkbox"
                    checked={seleccionadas.includes(idCategoria)}
                    onChange={() => toggleCategoria(idCategoria)}
                    className="w-5 h-5 accent-[#1A56DB]"
                  />
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón */}
      <div className="px-5 pb-6">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={guardar}
          disabled={guardando || cargando}
          className="w-full bg-[#1A56DB] text-white rounded-xl py-3 font-semibold disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </motion.button>
      </div>
    </div>
  );
}