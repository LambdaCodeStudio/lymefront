import React from 'react';
import { AtSign, Lock, EyeOff, Eye } from 'lucide-react';

interface InputFieldProps {
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ElementType;
  error?: string;
  showPasswordToggle?: boolean;
  onPasswordToggle?: () => void;
}

export const InputField: React.FC<InputFieldProps> = ({ 
  type, 
  value, 
  onChange, 
  placeholder, 
  icon: Icon, 
  error,
  showPasswordToggle = false,
  onPasswordToggle
}) => {
  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pl-10 pr-12 py-3 border rounded-lg 
          ${error ? 'border-red-500' : 'border-gray-300'}
          focus:outline-none focus:ring-2 focus:ring-blue-500/50
          bg-white text-gray-900 transition-all duration-200`}
        required
      />
      {showPasswordToggle && onPasswordToggle && (
        <button
          type="button"
          onClick={onPasswordToggle}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          {type === 'password' ? (
            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          )}
        </button>
      )}
    </div>
  );
};

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string | React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12">
    <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-xl">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => (
  <div className="text-xs text-gray-600 space-y-1">
    <p>La contraseña debe contener:</p>
    <ul className="list-disc pl-4 space-y-1">
      <li className={password.length >= 8 ? 'text-green-600' : ''}>
        Mínimo 8 caracteres
      </li>
      <li className={/\d/.test(password) ? 'text-green-600' : ''}>
        Al menos un número
      </li>
      <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
        Al menos una letra minúscula
      </li>
      <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
        Al menos una letra mayúscula
      </li>
    </ul>
  </div>
);

interface SubmitButtonProps {
  isLoading: boolean;
  text: string;
  loadingText: string;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ 
  isLoading, 
  text, 
  loadingText 
}) => (
  <button
    type="submit"
    disabled={isLoading}
    className="group relative w-full flex justify-center py-3 px-4 
      border border-transparent rounded-lg text-white bg-blue-600 
      hover:bg-blue-700 focus:outline-none focus:ring-2 
      focus:ring-offset-2 focus:ring-blue-500 transition-all
      duration-200 ease-in-out transform hover:-translate-y-0.5
      disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <span className="flex items-center">
      {isLoading ? loadingText : text}
    </span>
  </button>
);

// Utility functions
export const validatePassword = (password: string): string => {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (!/\d/.test(password)) {
    return 'La contraseña debe contener al menos un número';
  }
  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra minúscula';
  }
  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe contener al menos una letra mayúscula';
  }
  return '';
};

export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};