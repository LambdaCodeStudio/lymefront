import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ProductStockInputProps {
  value: number | string;
  onChange: (value: number) => void;
  label?: string;
  id?: string;
  error?: string;
  required?: boolean;
  maxStock?: number;
}

/**
 * Componente para input de stock con límite máximo
 * Se debe usar en el formulario de creación/edición de productos
 */
const ProductStockInput: React.FC<ProductStockInputProps> = ({
  value,
  onChange,
  label = "Stock",
  id = "stock",
  error,
  required = true,
  maxStock = 999999999 // Límite máximo de stock (9 dígitos)
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Permitir campo vacío para que el usuario pueda borrar el input
    if (inputValue === '') {
      onChange(0);
      return;
    }
    
    // Convertir a número y verificar que sea un entero positivo
    const numValue = parseInt(inputValue, 10);
    
    // Verificar que sea un número válido
    if (isNaN(numValue)) {
      return;
    }
    
    // Limitar al valor máximo
    if (numValue > maxStock) {
      onChange(maxStock);
    } else if (numValue < 0) {
      onChange(0);
    } else {
      onChange(numValue);
    }
  };

  return (
    <div className="mb-4">
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-[#29696B] mb-1"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="number"
          id={id}
          value={value}
          onChange={handleChange}
          min="0"
          max={maxStock}
          required={required}
          className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                     ${error 
                       ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                       : 'border-[#91BEAD] focus:border-[#29696B] focus:ring-[#29696B]/20'}`}
        />
        {error && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      <p className="mt-1 text-xs text-[#7AA79C]">
        Valor máximo: {maxStock.toLocaleString()}
      </p>
    </div>
  );
};

export default ProductStockInput;