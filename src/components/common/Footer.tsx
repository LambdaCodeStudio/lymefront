import React from 'react';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-[#00888A] to-[#50C3AD] py-4 shadow-lg relative z-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-3 md:mb-0">
            <p className="text-[#D4F5E6] text-sm font-medium">
              © {new Date().getFullYear()} Lyme S.A. Todos los derechos reservados.
            </p>
          </div>
          
          <a 
            href="https://portfolio-lambdacodestudios-projects.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-[#D4F5E6] hover:text-white transition-colors duration-300 group"
          >
            <span className="text-sm font-medium mr-2">Creado por LambdaCodeStudio</span>
            <div className="bg-white/10 rounded-full p-1 group-hover:bg-white/20 transition-all duration-300">
              <ExternalLink size={12} className="transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
            </div>
          </a>
        </div>
      </div>
      
      {/* Decorative accents */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#75D0E0] via-[#D4F5E6] to-[#80CFB0]"></div>
      <div className="absolute bottom-0 left-0 w-24 h-1 bg-[#D4F5E6]/30 rounded-r-full"></div>
      <div className="absolute bottom-0 right-0 w-24 h-1 bg-[#D4F5E6]/30 rounded-l-full"></div>
    </footer>
  );
};

export default Footer;