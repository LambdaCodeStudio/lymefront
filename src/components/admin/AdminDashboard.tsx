import React, { useState } from 'react';
import { 
  Package2, 
  Users, 
  Download,
  ChevronDown
} from 'lucide-react';

import InventorySection from './InventorySection';
import AdminUserManagement from './AdminUserManagement';
import DownloadsManagement from './DownloadsManagement';

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState('inventory');

  const NavItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`flex items-center w-full p-4 text-left transition-colors
        ${activeSection === id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}
      `}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium">{label}</span>
      <ChevronDown className={`w-5 h-5 ml-auto transition-transform
        ${activeSection === id ? 'rotate-180' : ''}`} 
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow">
          {/* Navegación */}
          <div className="border-b">
            <NavItem 
              id="inventory" 
              label="Inventario" 
              icon={Package2}
            />
            <NavItem 
              id="users" 
              label="Usuarios" 
              icon={Users}
            />
            <NavItem 
              id="downloads" 
              label="Descargas" 
              icon={Download}
            />
          </div>

          {/* Contenido */}
          <div className="p-6">
            {activeSection === 'inventory' && <InventorySection />}
            {activeSection === 'users' && <div><AdminUserManagement/></div>}
            {activeSection === 'downloads' && <div><DownloadsManagement/></div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;