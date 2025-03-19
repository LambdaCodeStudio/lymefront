import React, { useState } from 'react';
import { AtSign, Lock, ArrowRight } from 'lucide-react';
import { 
  InputField, 
  AuthLayout, 
  PasswordRequirements,
  validatePassword,
  validateEmail 
} from './shared/AuthComponents';
import api from '../../services/api';

export const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar email
    if (!validateEmail(formData.email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    // Validar contraseña
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Validar que las contraseñas coincidan
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/register', {
        email: formData.email,
        password: formData.password
      });
      window.location.href = '/login?registered=true';
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Error al registrar usuario');
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Crear nueva cuenta"
      subtitle={
        <span>
          ¿Ya tienes una cuenta?{' '}
          <a 
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Inicia sesión aquí
          </a>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-4">
          <InputField
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="Correo electrónico"
            icon={AtSign}
            error={error}
          />

          <InputField
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="Contraseña"
            icon={Lock}
            error={error}
            showPasswordToggle
            onPasswordToggle={() => setShowPassword(!showPassword)}
          />

          <InputField
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            placeholder="Confirmar contraseña"
            icon={Lock}
            error={error}
            showPasswordToggle
            onPasswordToggle={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        </div>

        {error && (
          <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded-lg">
            {error}
          </div>
        )}

        <PasswordRequirements password={formData.password} />

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
            {isLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            {!isLoading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />}
          </span>
        </button>
      </form>
    </AuthLayout>
  );
};

export default RegisterForm;