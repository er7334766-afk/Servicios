//para cuando exista el panel de administrador, este es el componente que se mostrará, con la opción de bloquear y desbloquear cuentas de usuarios y trabajadores, así como eliminar cuentas definitivamente. También se muestran métricas y reportes generales del sistema.
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, BarChart3, ShieldAlert, UserX, UserCheck, 
  Trash2, FileText, ArrowLeft, Download, Eye 
} from 'lucide-react';
import { MOCK_WORKERS } from '../../data/mockData';

// Datos simulados extras para complementar el panel
const MOCK_CLIENTS = [
  { id: 'c1', name: 'Carlos Mendoza', email: 'carlos@mail.com', status: 'active', registered: '2026-03-15', rol: 'Cliente' },
  { id: 'c2', name: 'Ana Gómez', email: 'ana@mail.com', status: 'blocked', registered: '2026-05-20', rol: 'Cliente' },
];

const MOCK_STATS = {
  totalServicios: 142,
  serviciosCompletados: 118,
  ingresosTotales: 3450,
  nuevosClientes: 12
};

export default function AdminDashboardScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');
  
  // Unificamos trabajadores y clientes en una lista común controlable
  const [usuarios, setUsuarios] = useState([
    ...MOCK_CLIENTS,
    ...MOCK_WORKERS.map(w => ({ 
      id: w.id, 
      name: w.name, 
      email: `${w.name.toLowerCase().replace(/\s+/g, '')}@mail.com`, 
      status: w.isAvailable ? 'active' : 'blocked', 
      rol: 'Trabajador' 
    }))
  ]);

  // Función para bloquear o desbloquear cuentas de usuario
  const toggleBloquearUsuario = (id: string) => {
    setUsuarios(prev => prev.map(u => {
      if (u.id === id) {
        const nuevoEstado = u.status === 'active' ? 'blocked' : 'active';
        alert(`Usuario ${u.name} ha sido ${nuevoEstado === 'blocked' ? 'BLOQUEADO' : 'DESBLOQUEADO'}`);
        return { ...u, status: nuevoEstado };
      }
      return u;
    }));
  };

  // Función para eliminar cuentas definitivamente
  const eliminarUsuario = (id: string, name: string) => {
    if (window.confirm(`¿Estás completamente seguro de eliminar la cuenta de ${name}?`)) {
      setUsuarios(prev => prev.filter(u => u.id !== id));
      alert('Usuario eliminado correctamente');
    }
  };

    return (
    <div className="flex flex-col min-h-full bg-[#f8fafc] text-[#0f172a]">
      {/* Encabezado Principal */}
      <div className="bg-[#1A56DB] px-5 pt-10 pb-6 text-white flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">Panel de Control</h1>
          <p className="text-xs text-white/80">Administración y Reportes Globales</p>
        </div>
      </div>

      {/* Barra de Navegación de Pestañas */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'users' ? 'border-[#1A56DB] text-[#1A56DB]' : 'border-transparent text-slate-500'
          }`}
        >
          <Users className="w-4 h-4" />
          Gestionar Cuentas
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'reports' ? 'border-[#1A56DB] text-[#1A56DB]' : 'border-transparent text-slate-500'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Reportes y Métricas
        </button>
      </div>

      {/* Contenedor del Contenido Dinámico */}
      <div className="p-5 flex-1 pb-24">
                {activeTab === 'users' ? (
          /* ================= LISTADO DE USUARIOS ================= */
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Cuentas Registradas ({usuarios.length})
            </h2>
            
            <div className="flex flex-col gap-3">
              {usuarios.map((user) => (
                <div key={user.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-foreground text-sm">{user.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          user.rol === 'Trabajador' ? 'bg-blue-50 text-[#1A56DB]' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {user.rol}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                    </div>

                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status === 'active' ? 'Activo' : 'Bloqueado'}
                    </span>
                  </div>

                  {/* Botones de Acción para Administrador */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => toggleBloquearUsuario(user.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                        user.status === 'active'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {user.status === 'active' ? (
                        <>
                          <UserX className="w-3.5 h-3.5" /> Bloquear
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Desbloquear
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => eliminarUsuario(user.id, user.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ================= MÓDULO DE REPORTES GENERALES ================= */
          <div className="flex flex-col gap-5">
            {/* Tarjetas de Métricas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Servicios Solicitados</p>
                <p className="text-xl font-black text-foreground mt-1">{MOCK_STATS.totalServicios}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Completados</p>
                <p className="text-xl font-black text-green-600 mt-1">{MOCK_STATS.serviciosCompletados}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Volumen Cobros</p>
                <p className="text-xl font-black text-[#1A56DB] mt-1">${MOCK_STATS.ingresosTotales}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Nuevos Clientes</p>
                <p className="text-xl font-black text-purple-600 mt-1">+{MOCK_STATS.nuevosClientes}</p>
              </div>
            </div>

            {/* Listado de Generación de Archivos */}
            <div className="flex flex-col gap-3 mt-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generar Reportes</h3>
              
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 text-[#1A56DB] rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Servicios Realizados</h4>
                    <p className="text-[11px] text-muted-foreground">Historial detallado en PDF</p>
                  </div>
                </div>
                <button 
                  onClick={() => alert('Descargando archivo PDF de servicios realizados...')}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Clientes Registrados</h4>
                    <p className="text-[11px] text-muted-foreground">Listado de métricas de usuarios</p>
                  </div>
                </div>
                <button 
                  onClick={() => alert('Descargando archivo PDF de clientes registrados...')}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



