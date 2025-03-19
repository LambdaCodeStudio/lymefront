import React, { useState, useEffect } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { UserCircle } from 'lucide-react';
import type { RoleOption } from '../shared/UserRolesConfig';
import type { AdminUser, CreateUserData } from '../services/userService';
import userService  from '../../../services/userService';

// Constante con roles para usar en el componente
const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR_DE_SUPERVISORES: 'supervisor_de_supervisores',
  SUPERVISOR: 'supervisor',
  OPERARIO: 'operario'
};

// Nombres cortos de roles para el formulario
const shortRoleLabels = {
  admin: 'Admin',
  supervisor_de_supervisores: 'Sup. de Supervisores',
  supervisor: 'Supervisor',
  operario: 'Operario'
};

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: CreateUserData) => Promise<void>;
  availableRoles: RoleOption[];
  formData: CreateUserData;
  setFormData: React.Dispatch<React.SetStateAction<CreateUserData>>;
  editingUser: AdminUser | null;
  loading: boolean;
  error: string;
  currentUserRole: string;
}

/**
 * Formulario para creación y edición de usuarios
 */
const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableRoles,
  formData,
  setFormData,
  editingUser,
  loading,
  error,
  currentUserRole
}) => {
  // Estado para controlar la opción de usuario temporal
  const [isTemporary, setIsTemporary] = useState(false);
  
  // Estado para almacenar lista de supervisores
  const [availableSupervisors, setAvailableSupervisors] = useState<AdminUser[]>([]);
  
  // Estado para manejar la carga de supervisores
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [supervisorsError, setSupervisorsError] = useState('');
  
  // Estado para controlar ancho de pantalla
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  
  // Efecto para detectar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);
  
  // Cargar supervisores cuando se selecciona rol de operario
  useEffect(() => {
    const loadSupervisors = async () => {
      // Cargar supervisores para nuevos operarios Y cuando se edita/cambia a operario
      if (formData.role === ROLES.OPERARIO) {
        setSupervisorsLoading(true);
        setSupervisorsError('');
        try {
          // Usar directamente la respuesta, no response.data
          const supervisors = await userService.getSupervisors();
          
          console.log('Supervisores cargados:', supervisors);
          
          // Filtrar al usuario actual si es un supervisor siendo cambiado a operario
          let filteredSupervisors = [...supervisors];
          if (editingUser && editingUser._id) {
            filteredSupervisors = supervisors.filter(sup => sup._id !== editingUser._id);
          }
          
          setAvailableSupervisors(filteredSupervisors);

          // Si estamos editando un operario, asegurarnos de que el supervisor actual esté seleccionado
          if (editingUser && editingUser.supervisorId && !formData.supervisorId) {
            setFormData(prev => ({
              ...prev,
              supervisorId: editingUser.supervisorId
            }));
          }
          
          // Verificar si hay supervisores
          if (filteredSupervisors.length === 0) {
            setSupervisorsError('No hay supervisores disponibles');
          }
        } catch (err) {
          console.error('Error al cargar supervisores:', err);
          setSupervisorsError('No se pudieron cargar los supervisores');
        } finally {
          setSupervisorsLoading(false);
        }
      }
    };
  
    loadSupervisors();
  }, [formData.role, editingUser]);
  
  // Efecto para actualizar isTemporary cuando cambie el usuario editado
  useEffect(() => {
    if (editingUser) {
      // Detectar si es un operario temporal
      const isTemp = editingUser.role === ROLES.OPERARIO && editingUser.expiresAt;
      setIsTemporary(isTemp);
    } else {
      // Para nuevo usuario, inicializar en false
      setIsTemporary(false);
    }
  }, [editingUser]);

  // Maneja el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Asegurarnos que secciones tiene un valor válido
    if (!formData.secciones) {
      setFormData({
        ...formData,
        secciones: 'ambos'
      });
    }
    
    // Para operarios nuevos, requerir supervisor
    if (!editingUser && formData.role === ROLES.OPERARIO) {
      if (!formData.supervisorId) {
        setSupervisorsError('Debe seleccionar un supervisor para el operario');
        return;
      }
    }
    
    // Preparar datos con la configuración temporal correcta
    const submissionData = {
      ...formData,
      // Para operarios, agregar flag de temporal según corresponda
      isTemporary: formData.role === ROLES.OPERARIO ? isTemporary : undefined
    };
    
    await onSubmit(submissionData);
  };

  // Función para determinar si mostrar nombres cortos según ancho de pantalla
  const useShortNames = windowWidth < 450;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
        <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
          <DialogTitle>
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="usuario">Nombre de Usuario <span className="text-red-500">*</span></Label>
              <Input
                id="usuario"
                type="text"
                value={formData.usuario}
                onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                placeholder="usuario123"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  type="text"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  type="text"
                  value={formData.apellido || ''}
                  onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  placeholder="Apellido"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="celular">Teléfono</Label>
                <Input
                  id="celular"
                  type="tel"
                  value={formData.celular || ''}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  placeholder="+123456789"
                />
              </div>
              <div>
                <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
                {availableRoles.length > 0 ? (
                  <Select
                    value={formData.role}
                    onValueChange={(value: string) => {
                      setFormData({
                        ...formData,
                        role: value,
                        // Resetear supervisor y tiempo de expiración si cambia el rol
                        supervisorId: undefined,
                        expirationMinutes: value === ROLES.OPERARIO && isTemporary ? 30 : undefined
                      });
                      
                      // Resetear isTemporary si no es operario
                      if (value !== ROLES.OPERARIO) {
                        setIsTemporary(false);
                      }
                    }}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} align="start">
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {/* Usar nombres cortos en pantallas pequeñas */}
                          {useShortNames ? shortRoleLabels[role.value] || role.label : role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-red-500 text-sm p-2 border rounded-md">
                    No hay roles disponibles para este usuario
                  </div>
                )}
              </div>
            </div>

            {/* Selector de supervisor para operarios */}
            {formData.role === ROLES.OPERARIO && (
              <div>
                <Label htmlFor="supervisorId">
                  Supervisor <span className="text-red-500">*</span>
                </Label>
                {supervisorsLoading ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <UserCircle className="w-5 h-5 animate-pulse" />
                    <span>Cargando supervisores...</span>
                  </div>
                ) : (
                  <Select
                    value={formData.supervisorId}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        supervisorId: value
                      });
                      // Limpiar cualquier error de supervisores
                      setSupervisorsError('');
                    }}
                    required
                  >
                    <SelectTrigger id="supervisorId">
                      <SelectValue placeholder="Seleccionar supervisor" />
                    </SelectTrigger>
                    <SelectContent position="popper" sideOffset={5} align="start">
                      {availableSupervisors.length > 0 ? (
                        availableSupervisors.map((supervisor) => (
                          <SelectItem key={supervisor._id} value={supervisor._id}>
                            {supervisor.usuario} 
                            {supervisor.nombre && supervisor.apellido 
                              ? ` - ${supervisor.nombre} ${supervisor.apellido}` 
                              : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-supervisors">No hay supervisores disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {supervisorsError && (
                  <p className="text-red-500 text-xs mt-1">{supervisorsError}</p>
                )}
                {availableSupervisors.length === 0 && !supervisorsLoading && (
                  <p className="text-yellow-600 text-xs mt-1">
                    No hay supervisores disponibles
                  </p>
                )}
              </div>
            )}

            {/* Mostrar checkbox de temporal sólo para operarios */}
            {formData.role === ROLES.OPERARIO && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="isTemporary" 
                  checked={isTemporary}
                  onCheckedChange={(checked) => {
                    setIsTemporary(!!checked);
                    
                    // Si marca como temporal, establecer tiempo de expiración predeterminado
                    if (checked) {
                      setFormData({
                        ...formData,
                        expirationMinutes: 30
                      });
                    } else {
                      setFormData({
                        ...formData,
                        expirationMinutes: undefined
                      });
                    }
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="isTemporary"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center"
                  >
                    Operario temporal
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="ml-1 h-3.5 w-3.5 text-gray-500" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs max-w-xs">
                          Los operarios temporales tienen acceso limitado por tiempo, ideal para contratistas o personal eventual.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
              </div>
            )}

            {/* Mostrar configuración de tiempo si es temporal */}
            {(formData.role === ROLES.OPERARIO && isTemporary) && (
              <div>
                <Label htmlFor="expirationMinutes">
                  Tiempo de expiración (minutos) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expirationMinutes"
                  type="number"
                  min={1}
                  max={10080} // 7 días máximo
                  value={formData.expirationMinutes}
                  onChange={(e) => setFormData({
                    ...formData,
                    expirationMinutes: parseInt(e.target.value)
                  })}
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tiempo máximo: 7 días (10080 minutos)
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="password">
                {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'} 
                {!editingUser && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
                minLength={6}
                placeholder={editingUser ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
                className="w-full"
              />
              {!editingUser && (
                <p className="text-xs text-gray-500 mt-1">
                  La contraseña debe tener al menos 6 caracteres
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="secciones">Secciones <span className="text-red-500">*</span></Label>
              <Select
                value={formData.secciones}
                onValueChange={(value: 'limpieza' | 'mantenimiento' | 'ambos') => {
                  setFormData({
                    ...formData,
                    secciones: value
                  });
                }}
                required
              >
                <SelectTrigger id="secciones">
                  <SelectValue placeholder="Seleccionar secciones" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5} align="start">
                  <SelectItem value="limpieza">Limpieza</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;