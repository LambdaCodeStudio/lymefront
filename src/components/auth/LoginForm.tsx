import React, { useState, useEffect } from 'react';
import { AtSign, Lock, ArrowRight } from 'lucide-react';
import { InputField, AuthLayout } from './shared/AuthComponents';
import { Alert, AlertDescription } from "@/components/ui/alert";

export const LoginForm = () => {
  // Estado para el formulario incluyendo "recordar sesión"
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Cargar email guardado al montar el componente
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        rememberMe: true
      }));
    }
  }, []);

  // Función para manejar el guardado de credenciales
  const handleRememberMe = (checked: boolean) => {
    setFormData(prev => ({ ...prev, rememberMe: checked }));
    if (!checked) {
      localStorage.removeItem('rememberedEmail');
    }
  };

  // Determinar la ruta de redirección según el rol
  const getRedirectPath = (role: string) => {
    const rolePaths = {
      'admin': '/admin',
      'supervisor': '/supervisor',
      'basic': '/dashboard',
      'temporal': '/dashboard'
    };
    return rolePaths[role] || '/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Realizar la petición de login
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Error de autenticación');
      }

      // Guardar token y rol en localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('userRole', data.role);

      // Si recordar está activado, guardar el email
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Redireccionar según el rol
      const redirectPath = getRedirectPath(data.role);
      window.location.href = redirectPath;

    } catch (err: any) {
      console.error('Error en login:', err);
      setError(
        err.response?.data?.msg || 
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
            onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
            placeholder="Correo electrónico"
            icon={AtSign}
            error={error}
            required
          />

          <InputField
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
            placeholder="Contraseña"
            icon={Lock}
            error={error}
            required
            showPasswordToggle
            onPasswordToggle={() => setShowPassword(!showPassword)}
          />

          {/* Checkbox para recordar sesión */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember-me"
              checked={formData.rememberMe}
              onChange={(e) => handleRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 
                border-gray-300 rounded cursor-pointer"
            />
            <label
              htmlFor="remember-me"
              className="ml-2 block text-sm text-gray-700 cursor-pointer"
            >
              Recordar mi correo
            </label>
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
            duration-200 ease-in-out disabled:bg-blue-400 disabled:cursor-not-allowed"
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