import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';

interface EditServicesScreenProps {
  onBack: () => void;
}

export default function EditServicesScreen({
  onBack,
  }: EditServicesScreenProps) {

  // cambiar la lista de categorías de servicios disponibles
  const categorias = [
    'Plomería',
    'Construcción',
    'Electricidad',
    'Pintura',
    'Carpintería',
    'Jardinería',
    'Limpieza',
    'Electrodomésticos',
    'Instalación de tuberías',
    'Reparación de fugas',
    'Destapado de cañerías',
    'Remodelación de baño',
  ];

  const [seleccionadas, setSeleccionadas] = useState<string[]>([
    'Plomería',
    'Construcción',
  ]);

  const toggleCategoria = (categoria: string) => {
    if (seleccionadas.includes(categoria)) {
      setSeleccionadas(
        seleccionadas.filter((c) => c !== categoria)
      );
    } else {
      setSeleccionadas([
        ...seleccionadas,
        categoria,
      ]);
    }
  };

  const guardar = () => {
    console.log('Servicios seleccionados:', seleccionadas);

    // Aquí después se conectará con el backend

    onBack();
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

        <div className="space-y-3">

          {categorias.map((categoria) => (

            <label
              key={categoria}
              className="flex items-center justify-between p-4 rounded-xl border border-border cursor-pointer hover:bg-secondary transition-colors"
            >

              <span className="font-medium">
                {categoria}
              </span>

              <input
                type="checkbox"
                checked={seleccionadas.includes(categoria)}
                onChange={() => toggleCategoria(categoria)}
                className="w-5 h-5 accent-[#1A56DB]"
              />

            </label>

          ))}

        </div>

      </div>

      {/* Botón */}
      <div className="px-5 pb-6">

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={guardar}
          className="w-full bg-[#1A56DB] text-white rounded-xl py-3 font-semibold"
        >
          Guardar cambios
        </motion.button>

      </div>

    </div>
  );
}