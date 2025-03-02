import React, { useState, useEffect } from 'react';
import { AtSign, Lock, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/ui/loading-screen';

interface LoginFormProps {
  redirectPath?: string;
}

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

interface InputFieldProps {
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.FC<{ size?: number; className?: string }>;
  error?: string;
  required?: boolean;
  showPasswordToggle?: boolean;
  onPasswordToggle?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, children }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#DFEFE6] p-4">
    <div className="bg-white rounded-xl shadow-xl overflow-hidden w-full max-w-md border border-[#91BEAD]/20">
      <div className="bg-[#29696B] px-6 py-8 text-white">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-[#DFEFE6]">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export const InputField: React.FC<InputFieldProps> = ({
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  error,
  required,
  showPasswordToggle,
  onPasswordToggle
}) => (
  <div className="relative">
    <div className={`flex items-center border-2 rounded-lg overflow-hidden ${
      error ? 'border-red-400' : 'border-[#91BEAD] focus-within:border-[#29696B]'
    } transition-colors bg-white`}>
      <div className="px-3 py-2 bg-[#DFEFE6]">
        <Icon size={20} className="text-[#29696B]" />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 focus:outline-none text-[#29696B]"
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onPasswordToggle}
          className="px-3 text-[#7AA79C] hover:text-[#29696B] transition-colors"
        >
          {type === 'password' ? 'Mostrar' : 'Ocultar'}
        </button>
      )}
    </div>
  </div>
);

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
      'basic': '/shop',
      'temporal': '/shop'
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
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
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
                className="h-4 w-4 text-[#29696B] focus:ring-[#8DB3BA] 
                  border-[#91BEAD] rounded cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-[#29696B] cursor-pointer"
              >
                Recordar mi correo
              </label>
            </div>
          </div>

          {error && (
            <Alert className="bg-red-50 border border-red-200 text-red-700">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 
              border border-transparent rounded-lg text-white bg-[#29696B] 
              hover:bg-[#1D4E50] focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-[#7AA79C] transition-all
              duration-200 ease-in-out disabled:bg-[#8DB3BA] disabled:cursor-not-allowed"
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