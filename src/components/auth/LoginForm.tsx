import React, { useState } from 'react';
import { AtSign, Lock, ArrowRight } from 'lucide-react';
import { InputField, AuthLayout } from './shared/AuthComponents';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import api from '../../services/api';

export const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const getRedirectPath = (role) => {
    const rolePaths = {
      'admin': '/admin',
      'supervisor': '/supervisor',
      'basic': '/dashboard',
      'temporal': '/dashboard'
    };
    return rolePaths[role] || '/dashboard';
  };

  const saveAuthData = (token, userData, remember) => {
    // Si remember está activado, guardamos en localStorage
    if (remember) {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      // Si no, guardamos en sessionStorage (se borra al cerrar el navegador)
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(userData));
    }

    // Siempre guardamos el token en cookie para las peticiones API
    document.cookie = `token=${token}; path=/; ${remember ? 'max-age=2592000' : 'session'}; secure; samesite=strict`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      if (response.data.token) {
        const userData = {
          email: formData.email,
          role: response.data.role
        };

        // Guardar datos de autenticación
        saveAuthData(response.data.token, userData, rememberMe);

        //Guardar rol en localStorage
        localStorage.setItem('userRole', response.data.role);
        
        // Redireccionar según el rol
        const redirectPath = getRedirectPath(response.data.role);
        window.location.href = redirectPath;
      } else {
        throw new Error('No se recibió token en la respuesta');
      }
    } catch (err: any) {
      console.error('Error detallado:', err);
      setError(
        err.response?.data?.msg || 
        err.response?.data?.error || 
        err.message || 
        'Error al iniciar sesión'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Iniciar Sesión"
      subtitle="Ingresa tus credenciales para continuar"
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

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <Label
              htmlFor="remember"
              className="ml-2 block text-sm text-gray-700"
            >
              Recordar sesión
            </Label>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full flex justify-center py-3 px-4 
            border border-transparent rounded-lg text-white bg-blue-600 
            hover:bg-blue-700 focus:outline-none focus:ring-2 
            focus:ring-offset-2 focus:ring-blue-500 transition-all
            duration-200 ease-in-out"
        >
          <span className="flex items-center">
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            {!isLoading && <ArrowRight className="ml-2 h-5 w-5" />}
          </span>
        </button>
      </form>
    </AuthLayout>
  );
};

export default LoginForm;