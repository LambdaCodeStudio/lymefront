import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react';

export const Navbar = () => {
  const { logout } = useAuth();

  return (
    <nav className="bg-white border-b border-[#91BEAD]/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a className="text-xl font-bold text-[#29696B] transition-colors hover:text-[#29696B]/90">
              Lyme
            </a>
          </div>
          <div className="flex items-center">
            <button
              onClick={logout}
              className="ml-4 px-4 py-2 text-sm font-medium text-[#29696B] hover:text-[#29696B]/80 hover:bg-[#DFEFE6]/50 rounded-md transition-colors flex items-center gap-2"
            >
              <span>Cerrar Sesión</span>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};