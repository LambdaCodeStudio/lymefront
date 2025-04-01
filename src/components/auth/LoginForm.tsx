import React, { useState, useEffect } from 'react';
import { Lock, ArrowRight, User, AlertTriangle, Loader } from 'lucide-react';
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
  disabled?: boolean;
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
  onPasswordToggle,
  disabled
}) => (
  <div className="relative">
    <div className={`flex items-center border-2 rounded-lg overflow-hidden ${
      error ? 'border-red-400' : 'border-[#91BEAD] focus-within:border-[#29696B]'
    } transition-colors bg-white ${disabled ? 'opacity-70' : ''}`}>
      <div className="px-3 py-2 bg-[#DFEFE6]">
        <Icon size={20} className="text-[#29696B]" />
      </div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full px-4 py-3 focus:outline-none text-[#29696B] disabled:bg-gray-50"
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={onPasswordToggle}
          disabled={disabled}
          className="px-3 text-[#7AA79C] hover:text-[#29696B] transition-colors disabled:opacity-50"
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
    usuario: '',
    password: '',
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Usar hook de autenticación
  const { login, loading, error } = useAuth();

  // Cargar credenciales guardadas al montar el componente
  useEffect(() => {
    const savedUsuario = localStorage.getItem('rememberedUsuario');
    if (savedUsuario) {
      setFormData(prev => ({
        ...prev,
        usuario: savedUsuario,
        rememberMe: true
      }));
    }
  }, []);
  
  // Efecto para manejar el error 429
  useEffect(() => {
    if (error && error.includes('Demasiados intentos')) {
      setIsRetrying(true);
      
      // Crear un contador regresivo para informar al usuario
      const countdown = 5; // segundos para reintentar
      setRetryCount(countdown);
      
      const timer = setInterval(() => {
        setRetryCount(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRetrying(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [error]);

  // Función para manejar el guardado de credenciales
  const handleRememberMe = (checked: boolean) => {
    setFormData(prev => ({ ...prev, rememberMe: checked }));
    if (!checked) {
      localStorage.removeItem('rememberedUsuario');
    }
  };

  // Determinar la ruta de redirección según el rol y secciones
  const getRedirectPath = (role: string, secciones?: string) => {
    if (redirectPath) return redirectPath;
    
    // Mapear los roles del backend a rutas de la aplicación
    const rolePaths: Record<string, string> = {
      'admin': '/admin',
      'supervisor_de_supervisores': '/admin',
      'supervisor': '/shop',
      'operario': '/shop'
    };
    
    // Usar el rol para determinar la ruta base
    let basePath = rolePaths[role.toLowerCase()] || '/shop';
    
    return basePath;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // No intentar login si estamos en periodo de espera
    if (isRetrying) return;

    try {
      // Usar el hook de login
      const response = await login(formData.usuario, formData.password);

      // Si recordar está activado, guardar el identificador
      if (formData.rememberMe) {
        localStorage.setItem('rememberedUsuario', formData.usuario);
      } else {
        localStorage.removeItem('rememberedUsuario');
      }

      // Verificar la estructura de respuesta del backend actualizado
      // El backend ahora devuelve: { success, token, user: { id, usuario, nombre, role, secciones } }
      if (response.success && response.user) {
        // Obtener el rol y secciones del usuario
        const userRole = response.user.role;
        const userSecciones = response.user.secciones;
        
        // Almacenar información adicional del usuario si es necesario
        localStorage.setItem('userSecciones', userSecciones);
        
        // Verificar si es un operario temporal
        const isTemporary = userRole === 'operario' && response.user.expiresAt;
        if (isTemporary) {
          // Guardar información sobre expiración para mostrar alertas
          localStorage.setItem('expiresAt', response.user.expiresAt);
        }
        
        // Redireccionar según el rol y secciones
        const redirectPath = getRedirectPath(userRole, userSecciones);
        window.location.href = redirectPath;
      } else {
        console.error('Respuesta de autenticación inválida:', response);
        throw new Error('Error de autenticación: respuesta inválida del servidor');
      }
    } catch (err) {
      // El error ya es manejado por el hook
      console.error('Error en login:', err);
    }
  };

  // Render de alerta de error con información específica para error 429
  const renderError = () => {
    if (!error) return null;
    
    if (error.includes('Demasiados intentos')) {
      return (
        <Alert className="bg-amber-50 border border-amber-200 text-amber-700">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription className="flex items-center">
            {isRetrying ? (
              <>
                <Loader className="animate-spin mr-2 h-4 w-4" />
                <span>Demasiados intentos. Reintentando en {retryCount} {retryCount === 1 ? 'segundo' : 'segundos'}...</span>
              </>
            ) : (
              'Demasiados intentos. Por favor, espere un momento antes de volver a intentarlo.'
            )}
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <Alert className="bg-red-50 border border-red-200 text-red-700">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
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
              type="text"
              value={formData.usuario}
              onChange={(e) => setFormData(prev => ({...prev, usuario: e.target.value}))}
              placeholder="Nombre de usuario"
              icon={User}
              error={error}
              required
              disabled={loading || isRetrying}
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
              disabled={loading || isRetrying}
            />

            {/* Checkbox para recordar sesión */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember-me"
                checked={formData.rememberMe}
                onChange={(e) => handleRememberMe(e.target.checked)}
                disabled={loading || isRetrying}
                className="h-4 w-4 text-[#29696B] focus:ring-[#8DB3BA] 
                  border-[#91BEAD] rounded cursor-pointer disabled:opacity-50"
              />
              <label
                htmlFor="remember-me"
                className={`ml-2 block text-sm text-[#29696B] cursor-pointer ${
                  (loading || isRetrying) ? 'opacity-70' : ''
                }`}
              >
                Recordar mi usuario
              </label>
            </div>
          </div>

          {renderError()}

          <button
            type="submit"
            disabled={loading || isRetrying}
            className="group relative w-full flex justify-center py-3 px-4 
              border border-transparent rounded-lg text-white bg-[#29696B] 
              hover:bg-[#1D4E50] focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-[#7AA79C] transition-all
              duration-200 ease-in-out disabled:bg-[#8DB3BA] disabled:cursor-not-allowed"
          >
            <span className="flex items-center">
              {loading ? 'Iniciando sesión...' : (
                isRetrying ? `Reintentando en ${retryCount}s...` : 'Iniciar Sesión'
              )}
              {!loading && !isRetrying && <ArrowRight className="ml-2 h-5 w-5" />}
              {isRetrying && <Loader className="ml-2 h-5 w-5 animate-spin" />}
            </span>
          </button>
        </form>
      </AuthLayout>
    </>
  );
};

export default LoginForm;