import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react';

export const Navbar = () => {
  const { logout } = useAuth();

  return (
    <nav className="bg-gradient-to-r from-[#00888A] to-[#50C3AD] shadow-md relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <a href="/admin" className="text-xl font-bold text-[#D4F5E6] transition-colors hover:text-white flex items-center">
              <span className="mr-1">Lyme</span>
              <span className="text-white bg-white/10 px-2 py-0.5 rounded-md text-sm font-normal">Admin</span>
            </a>
          </div>
          
          <div className="flex items-center">
            <button
              onClick={logout}
              className="ml-4 px-4 py-2 text-sm font-medium text-[#D4F5E6] hover:text-white bg-white/10 hover:bg-white/20 rounded-md transition-all flex items-center gap-2 group"
            >
              <span>Cerrar Sesión</span>
              <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Decorative bottom elements */}
      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-[#75D0E0] via-[#D4F5E6] to-[#80CFB0]"></div>
    </nav>
  );
};