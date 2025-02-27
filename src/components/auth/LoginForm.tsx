import React, { useState, useEffect } from 'react';
import { AtSign, Lock, ArrowRight } from 'lucide-react';
import { InputField, AuthLayout } from './shared/AuthComponents';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/ui/loading-screen';

interface LoginFormProps {
  redirectPath?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ redirectPath }) => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  
  // Usar hook de autenticación
  const { login, loading, error } = useAuth();

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
    if (redirectPath) return redirectPath;
    
    const rolePaths: Record<string, string> = {
      'admin': '/admin',
      'supervisor': '/supervisor',
      'basic': '/dashboard',
      'temporal': '/dashboard'
    };
    
    return rolePaths[role] || '/dashboard';
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Usar el hook de login
      const response = await login(formData.email, formData.password);

      // Si recordar está activado, guardar el email
      if (formData.rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Obtener el rol desde response.role o response.user.role
      const userRole = response.role || (response.user && response.user.role) || 'basic';
      
      // Redireccionar según el rol
      const redirectPath = getRedirectPath(userRole);
      window.location.href = redirectPath;
    } catch (err) {
      // El error ya es manejado por el hook
      console.error('Error en login:', err);
    }
  };

  return (
    <>
      {loading && <LoadingScreen />}
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
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 
              border border-transparent rounded-lg text-white bg-blue-600 
              hover:bg-blue-700 focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-blue-500 transition-all
              duration-200 ease-in-out disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            <span className="flex items-center">
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
            </span>
          </button>
        </form>
      </AuthLayout>
    </>
  );
};

export default LoginForm;