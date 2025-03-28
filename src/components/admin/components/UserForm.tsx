import React, { useState, useEffect, useRef } from 'react';
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
import { User, CreateUserDTO, UpdateUserDTO } from '@/types/users';
import userService from '@/services/userService';

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
  onSubmit: (formData: CreateUserDTO | UpdateUserDTO) => Promise<void>;
  availableRoles: {value: string, label: string}[];
  formData: CreateUserDTO | UpdateUserDTO;
  setFormData: React.Dispatch<React.SetStateAction<CreateUserDTO | UpdateUserDTO>>;
  editingUser: User | null;
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
  const [availableSupervisors, setAvailableSupervisors] = useState<User[]>([]);
  
  // Estado para manejar la carga de supervisores
  const [supervisorsLoading, setSupervisorsLoading] = useState(false);
  const [supervisorsError, setSupervisorsError] = useState('');
  
  // Estado para controlar ancho de pantalla
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Nuevo estado para controlar las secciones disponibles
  const [availableSections, setAvailableSections] = useState<string[]>(['limpieza', 'mantenimiento', 'ambos']);
  
  // Nuevo estado para almacenar información del supervisor seleccionado
  const [selectedSupervisorInfo, setSelectedSupervisorInfo] = useState<User | null>(null);
  
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
  
  // Cargar supervisores cuando se selecciona rol de operario o cuando se abre el modal
  useEffect(() => {
    // Cargar supervisores cada vez que se abre el modal o cuando se cambia a rol operario
    if (isOpen) {
      const loadSupervisors = async () => {
        // Solo cargar si el rol es operario o es undefined (modal recién abierto)
        if (formData.role === ROLES.OPERARIO || !formData.role) {
          setSupervisorsLoading(true);
          setSupervisorsError('');
          
          try {
            // Forzar una nueva petición al servidor cada vez que se abre el modal
            const supervisors = await userService.getSupervisors(true);
            console.log('Supervisores actualizados:', supervisors);
            
            // Filtrar al usuario actual si es un supervisor siendo cambiado a operario
            let filteredSupervisors = [...supervisors];
            if (editingUser && editingUser._id) {
              filteredSupervisors = supervisors.filter(sup => sup._id !== editingUser._id);
            }
            
            setAvailableSupervisors(filteredSupervisors);
            
            // Garantizar que el supervisor se establezca correctamente al editar un operario
            // Verificamos SIEMPRE cuando estamos editando un operario, no solo cuando !formData.supervisorId
            if (editingUser && formData.role === ROLES.OPERARIO) {
              // Si el operario ya tiene un supervisor asignado, utilizarlo
              if (editingUser.supervisorId) {
                setFormData(prev => ({
                  ...prev,
                  supervisorId: editingUser.supervisorId
                }));
              } 
              // Si no tiene supervisor y hay supervisores disponibles, seleccionar el primero
              else if (filteredSupervisors.length > 0) {
                setFormData(prev => ({
                  ...prev,
                  supervisorId: filteredSupervisors[0]._id
                }));
              }
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
    }
  }, [isOpen, formData.role, editingUser]);
  
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
// Maneja el envío del formulario con limpieza agresiva de campos
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Crear un objeto nuevo en lugar de modificar el formData
  const submissionData: Record<string, any> = {};
  
  // Copiar campos básicos que siempre son válidos
  submissionData.usuario = formData.usuario || '';
  submissionData.nombre = formData.nombre;
  submissionData.apellido = formData.apellido;
  submissionData.celular = formData.celular;
  
  // Si se está actualizando la contraseña, incluirla
  if (formData.password) {
    submissionData.password = formData.password;
  }
  
  // Siempre incluir rol y secciones
  submissionData.role = formData.role;
  submissionData.secciones = formData.secciones || 'ambos';
  
  // Luego, agregar campos específicos al rol SOLO si el rol actual es operario
  if (formData.role === ROLES.OPERARIO) {
    // Para operarios se requiere supervisor
    if (!formData.supervisorId) {
      setSupervisorsError('Debe seleccionar un supervisor para el operario');
      return;
    }
    
    // Incluir supervisor ID para operarios
    submissionData.supervisorId = formData.supervisorId;
    
    // Para operarios temporales, agregar configuración de tiempo
    if (isTemporary) {
      submissionData.isTemporary = true;
      submissionData.expirationMinutes = formData.expirationMinutes || 30;
    } else {
      submissionData.isTemporary = false;
    }
  }
  // Importante: NO incluir supervisorId, isTemporary o expirationMinutes para otros roles
  
  // Agregar log detallado para depuración
  console.log('Datos enviados (limpios):', {
    ...submissionData,
    tieneRolOperario: formData.role === ROLES.OPERARIO,
    tieneId: Boolean(editingUser?._id),
    esTemporal: isTemporary,
  });
  
  // Finalmente realizar el envío
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
                value={formData.usuario || ''}
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
                  value={formData.expirationMinutes || 30}
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
                value={formData.secciones || 'ambos'}
                onValueChange={(value: 'limpieza' | 'mantenimiento' | 'ambos') => {
                  setFormData({
                    ...formData,
                    secciones: value
                  });
                }}
                disabled={formData.role === ROLES.OPERARIO && (availableSections.length === 1 || !formData.supervisorId)}
                required
              >
                <SelectTrigger id="secciones">
                  <SelectValue placeholder="Seleccionar secciones" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={5} align="start">
                  {availableSections.includes('limpieza') && (
                    <SelectItem value="limpieza">Limpieza</SelectItem>
                  )}
                  {availableSections.includes('mantenimiento') && (
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  )}
                  {availableSections.includes('ambos') && (
                    <SelectItem value="ambos">Ambos</SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {formData.role === ROLES.OPERARIO && !formData.supervisorId && (
                <p className="text-amber-600 text-xs mt-1">
                  Primero debes seleccionar un supervisor para determinar las secciones disponibles
                </p>
              )}
              
              {formData.role === ROLES.OPERARIO && selectedSupervisorInfo && availableSections.length === 1 && (
                <p className="text-amber-600 text-xs mt-1">
                  Las secciones están limitadas según las asignadas al supervisor seleccionado
                </p>
              )}
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