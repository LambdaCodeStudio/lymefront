import React, { useState } from 'react';
import { X, Clock, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

const useNotificationSafe = () => {
  try {
    const { useNotification } = require('@/context/NotificationContext');
    return useNotification();
  } catch (error) {
    return {
      addNotification: (message, type) => {
        console.log(`Notification (${type}): ${message}`);
      }
    };
  }
};

export const CreateTemporalUserModal = ({ isOpen, onClose }) => {
  const { addNotification } = useNotificationSafe();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    usuario: '',
    nombre: '',
    apellido: '',
    // Importante: Añadimos explícitamente el rol
    role: 'temporal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null); // Para depuración

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      usuario: '',
      nombre: '',
      apellido: '',
      role: 'temporal'
    });
    setError(null);
    setSuccess(false);
    setLoading(false);
    setDebugInfo(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDebugInfo(null);
    
    try {
      // Validar datos básicos
      if (!formData.usuario || !formData.password) {
        throw new Error('El nombre de usuario y contraseña son obligatorios');
      }
      
      // Obtener token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay sesión activa. Por favor, inicie sesión nuevamente.');
      }
      
      console.log('Enviando solicitud para crear usuario temporal:', {
        ...formData,
        password: '********' // No mostrar contraseña en consola
      });
      
      // Enviar solicitud para crear usuario temporal
      const response = await fetch('https://lyme-back.vercel.app/api/auth/temporary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      // Capturar información de respuesta para depuración
      const responseData = await response.json();
      console.log('Respuesta del servidor:', responseData);
      
      if (!response.ok) {
        // Mostrar información detallada del error
        const errorMessage = responseData.msg || responseData.error || responseData.mensaje || 'Error desconocido al crear usuario temporal';
        setDebugInfo({
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        throw new Error(errorMessage);
      }
      
      // Si llegamos aquí, la solicitud fue exitosa
      setSuccess(true);
      
      // Calcular tiempo de expiración en minutos para mostrar al usuario
      const expirationDate = new Date(responseData.expiresAt);
      const minutesRemaining = Math.ceil((expirationDate - new Date()) / (1000 * 60));
      
      if (addNotification) {
        addNotification(`Usuario temporal creado correctamente. Expira en ${minutesRemaining} minutos.`, 'success');
      }
      
      // Cerrar el modal después de 2 segundos
      setTimeout(() => {
        handleClose();
        // Opcional: redirigir a la página de usuarios temporales
        window.location.href = '/temporal-users';
      }, 2000);
      
    } catch (error) {
      console.error('Error al crear usuario temporal:', error);
      setError(error.message || 'Error desconocido al crear usuario temporal');
      
      if (addNotification) {
        addNotification(error.message || 'Error al crear usuario temporal', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-[#00888A] border-[#80CFB0] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center text-[#D4F5E6]">
            <Clock className="w-5 h-5 mr-2" />
            Crear Usuario Temporal
          </DialogTitle>
          <DialogDescription className="text-[#75D0E0]">
            Este usuario expirará automáticamente después de 30 minutos de actividad.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mensajes de error o éxito */}
          {error && (
            <Alert className="bg-red-900/30 border border-red-500">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="ml-2 text-white">{error}</AlertDescription>
            </Alert>
          )}
          
          {debugInfo && (
            <Alert className="bg-yellow-900/30 border border-yellow-500">
              <AlertCircle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="ml-2 text-white">
                Estado HTTP: {debugInfo.status} {debugInfo.statusText}
                <br />
                {JSON.stringify(debugInfo.data, null, 2)}
              </AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="bg-green-900/30 border border-green-500">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="ml-2 text-white">
                Usuario temporal creado correctamente
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="usuario" className="text-[#D4F5E6]">Usuario *</Label>
              <Input
                id="usuario"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                className="bg-white/10 border-[#50C3AD] text-white mt-1"
                placeholder="nombre_usuario"
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="password" className="text-[#D4F5E6]">Contraseña *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                className="bg-white/10 border-[#50C3AD] text-white mt-1"
                placeholder="••••••••"
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="email" className="text-[#D4F5E6]">Email (opcional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="bg-white/10 border-[#50C3AD] text-white mt-1"
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div>
              <Label htmlFor="nombre" className="text-[#D4F5E6]">Nombre (opcional)</Label>
              <Input
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="bg-white/10 border-[#50C3AD] text-white mt-1"
                placeholder="Nombre"
              />
            </div>
            
            <div>
              <Label htmlFor="apellido" className="text-[#D4F5E6]">Apellido (opcional)</Label>
              <Input
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className="bg-white/10 border-[#50C3AD] text-white mt-1"
                placeholder="Apellido"
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-[#50C3AD] text-[#D4F5E6] hover:bg-[#50C3AD]/20"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#50C3AD] hover:bg-[#80CFB0] text-white"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};