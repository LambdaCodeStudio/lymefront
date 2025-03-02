import React from 'react';

interface DashboardSectionProps {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  id,
  label,
  icon: Icon,
  isExpanded,
  onToggle,
  children
}) => {
  return (
    <div className={`border-b border-[#91BEAD]/20 last:border-b-0 transition-all duration-300 ${
      isExpanded ? 'bg-[#DFEFE6]/30' : 'hover:bg-[#DFEFE6]/10'
    }`}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between focus:outline-none"
        aria-expanded={isExpanded}
        aria-controls={`${id}-content`}
      >
        <div className="flex items-center">
          <Icon className={`w-5 h-5 ${isExpanded ? 'text-[#29696B]' : 'text-[#7AA79C]'}`} />
          <span className={`ml-3 font-medium ${isExpanded ? 'text-[#29696B]' : 'text-[#29696B]/80'}`}>
            {label}
          </span>
        </div>
        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg
            className="w-5 h-5 text-[#7AA79C]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>
      <div
        id={`${id}-content`}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;