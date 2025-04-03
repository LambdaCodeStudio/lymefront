import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, ChevronUp, Info, Loader2, UserCircle, Check, Search, X } from 'lucide-react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { User, CreateUserDTO, UpdateUserDTO, SubservicioAsignado, Cliente, SubServicio } from '@/types/users';
import { ROLES } from '@/utils/userComponentUtils';

// Nombres cortos de roles para el formulario
const shortRoleLabels = {
  admin: 'Admin',
  supervisor_de_supervisores: 'Sup. de Supervisores',
  supervisor: 'Supervisor',
  operario: 'Operario'
};

// Estilos comunes para reutilización
const STYLES = {
  formContainer: "space-y-4",
  inputGrid: "grid gap-4",
  inputRow: "grid grid-cols-1 sm:grid-cols-2 gap-4",
  requiredMark: "text-red-500",
  errorMessage: "text-red-500 text-xs mt-1",
  loadingIcon: "flex items-center space-x-2 text-gray-500",
  helperText: "text-xs text-gray-500 mt-1",
  checkboxContainer: "flex items-center space-x-2",
  warningText: "text-amber-600 text-xs mt-1",
  clientesContainer: "mt-4 border rounded-md p-2 max-h-[300px] overflow-auto",
  clienteItem: "py-2 px-2 rounded-md hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors duration-150",
  subservicioItem: "ml-7 py-1.5 px-2 rounded-md hover:bg-gray-50 flex items-center transition-colors duration-150",
  selectedItem: "bg-[#DFEFE6]",
  chevronIcon: "w-4 h-4 text-gray-500",
  subservicioList: "mt-1 space-y-1",
  noData: "text-gray-500 text-sm p-3 text-center",
  searchContainer: "mb-3 relative",
  searchIcon: "absolute left-2.5 top-2.5 h-4 w-4 text-gray-400",
  searchInput: "pl-9 w-full h-9",
  selectAllBtn: "text-xs text-blue-600 hover:text-blue-800 font-medium",
  selectionSummary: "flex justify-between items-center mb-2",
  badge: "bg-[#DFEFE6] text-[#29696B] font-normal text-xs",
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
  
  // Props para manejar clientes y subservicios
  clientesDelSupervisor: Cliente[];
  clientesLoading: boolean;
  clientesError: string;
  selectedSubservicios: SubservicioAsignado[];
  availableSupervisors: User[];
  supervisorsLoading: boolean;
  
  // Funciones para manejar clientes y subservicios
  toggleClienteExpanded: (clienteId: string) => void;
  toggleSubservicioSelected: (clienteId: string, subServicioId: string) => void;
  handleRoleChange: (role: string) => void;
  handleSupervisorChange: (supervisorId: string) => void;
}

/**
 * Formulario mejorado para creación y edición de usuarios
 * Con selección específica de subservicios para operarios
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
  currentUserRole,
  
  // Props
  clientesDelSupervisor,
  clientesLoading,
  clientesError,
  selectedSubservicios,
  availableSupervisors,
  supervisorsLoading,
  
  // Funciones
  toggleClienteExpanded,
  toggleSubservicioSelected,
  handleRoleChange,
  handleSupervisorChange
}) => {
  // Estado para controlar la opción de usuario temporal
  const [isTemporary, setIsTemporary] = useState(false);
  
  // Estado para controlar ancho de pantalla
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Estado para controlar las secciones disponibles
  const [availableSections] = useState<string[]>(['limpieza', 'mantenimiento', 'ambos']);
  
  // Estado para búsqueda de clientes y subservicios
  const [searchTerm, setSearchTerm] = useState('');
  
  // Determinar si mostrar nombres cortos según ancho de pantalla
  const useShortNames = useMemo(() => windowWidth < 450, [windowWidth]);

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
  
  // Efecto para actualizar isTemporary cuando cambie el usuario editado
  useEffect(() => {
    if (editingUser) {
      // Detectar si es un operario temporal
      const isTemp = editingUser.role === ROLES.OPERARIO && editingUser.expiresAt;
      setIsTemporary(!!isTemp);
    } else {
      // Para nuevo usuario, inicializar en false
      setIsTemporary(false);
    }
  }, [editingUser]);

  // Filtrar clientes y subservicios según término de búsqueda
  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientesDelSupervisor;
    
    const termLower = searchTerm.toLowerCase();
    
    return clientesDelSupervisor.map(cliente => {
      // Verificar si el cliente coincide con la búsqueda
      const clienteMatches = cliente.nombre.toLowerCase().includes(termLower);
      
      // Filtrar subservicios que coinciden
      const filteredSubServicios = cliente.subServicios.filter(subserv => 
        subserv.nombre.toLowerCase().includes(termLower)
      );
      
      // Si el cliente coincide, devolver todos sus subservicios
      if (clienteMatches) {
        return {
          ...cliente,
          isExpanded: true, // Expandir automáticamente si coincide
        };
      } 
      // Si hay subservicios que coinciden, devolver solo esos
      else if (filteredSubServicios.length > 0) {
        return {
          ...cliente,
          isExpanded: true, // Expandir automáticamente
          subServicios: filteredSubServicios
        };
      }
      // Si no hay coincidencias, no incluir este cliente
      return null;
    }).filter(Boolean) as Cliente[];
  }, [clientesDelSupervisor, searchTerm]);

  // Calcular estadísticas para selección
  const selectionStats = useMemo(() => {
    const totalSubservicios = clientesDelSupervisor.reduce(
      (total, cliente) => total + cliente.subServicios.length, 0
    );
    
    return {
      totalClientes: clientesDelSupervisor.length,
      totalSubservicios,
      selected: selectedSubservicios.length,
      percentSelected: totalSubservicios ? 
        Math.round((selectedSubservicios.length / totalSubservicios) * 100) : 0
    };
  }, [clientesDelSupervisor, selectedSubservicios]);

  // Handlers para cambios en el formulario
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, [setFormData]);

  const handleNumberInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: parseInt(value) }));
  }, [setFormData]);

  const handleInternalRoleChange = useCallback((value: string) => {
    handleRoleChange(value);
    
    // Resetear isTemporary si no es operario
    if (value !== ROLES.OPERARIO) {
      setIsTemporary(false);
    }
  }, [handleRoleChange]);

  const handleTemporaryChange = useCallback((checked: boolean) => {
    setIsTemporary(!!checked);
    
    // Si marca como temporal, establecer tiempo de expiración predeterminado
    if (checked) {
      setFormData(prev => ({
        ...prev,
        expirationMinutes: 30,
        isTemporary: true
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        expirationMinutes: undefined,
        isTemporary: false
      }));
    }
  }, [setFormData]);

  const handleSectionChange = useCallback((value: 'limpieza' | 'mantenimiento' | 'ambos') => {
    setFormData(prev => ({
      ...prev,
      secciones: value
    }));
  }, [setFormData]);

  // Función para seleccionar/deseleccionar todos los subservicios
  const toggleSelectAll = useCallback(() => {
    const allSelected = selectionStats.selected === selectionStats.totalSubservicios;
    
    // Si todos están seleccionados, deseleccionar todos
    if (allSelected) {
      clientesDelSupervisor.forEach(cliente => {
        cliente.subServicios.forEach(subservicio => {
          if (subservicio.isSelected) {
            toggleSubservicioSelected(cliente._id, subservicio._id);
          }
        });
      });
    } 
    // Si no todos están seleccionados, seleccionar todos
    else {
      clientesDelSupervisor.forEach(cliente => {
        cliente.subServicios.forEach(subservicio => {
          if (!subservicio.isSelected) {
            toggleSubservicioSelected(cliente._id, subservicio._id);
          }
        });
      });
    }
  }, [clientesDelSupervisor, selectionStats, toggleSubservicioSelected]);

  // Función para expandir/colapsar todos los clientes
  const toggleExpandAll = useCallback(() => {
    // Verificar si todos están expandidos
    const allExpanded = clientesDelSupervisor.every(cliente => cliente.isExpanded);
    
    clientesDelSupervisor.forEach(cliente => {
      if (allExpanded) {
        // Si todos están expandidos, colapsar todos
        if (cliente.isExpanded) {
          toggleClienteExpanded(cliente._id);
        }
      } else {
        // Si no todos están expandidos, expandir todos
        if (!cliente.isExpanded) {
          toggleClienteExpanded(cliente._id);
        }
      }
    });
  }, [clientesDelSupervisor, toggleClienteExpanded]);

  // Maneja el envío del formulario
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // Ya no validamos la selección de subservicios para operarios
    await onSubmit(formData);
  }, [formData, onSubmit]);

  // Función para resetear búsqueda
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
          <DialogTitle>
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="flex-1 overflow-auto">
          <div className={STYLES.formContainer}>
            <div className={STYLES.inputGrid}>
              <div>
                <Label htmlFor="usuario">Nombre de Usuario <span className={STYLES.requiredMark}>*</span></Label>
                <Input
                  id="usuario"
                  type="text"
                  value={formData.usuario || ''}
                  onChange={handleInputChange}
                  placeholder="usuario123"
                  required
                  aria-required="true"
                />
              </div>

              <div className={STYLES.inputRow}>
                <div>
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    type="text"
                    value={formData.nombre || ''}
                    onChange={handleInputChange}
                    placeholder="Nombre"
                  />
                </div>
                <div>
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    type="text"
                    value={formData.apellido || ''}
                    onChange={handleInputChange}
                    placeholder="Apellido"
                  />
                </div>
              </div>

              <div className={STYLES.inputRow}>
                <div>
                  <Label htmlFor="celular">Teléfono</Label>
                  <Input
                    id="celular"
                    type="tel"
                    value={formData.celular || ''}
                    onChange={handleInputChange}
                    placeholder="+123456789"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol <span className={STYLES.requiredMark}>*</span></Label>
                  {availableRoles.length > 0 ? (
                    <Select
                      value={formData.role}
                      onValueChange={handleInternalRoleChange}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={5} align="start">
                        {availableRoles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {/* Usar nombres cortos en pantallas pequeñas */}
                            {useShortNames ? shortRoleLabels[role.value as keyof typeof shortRoleLabels] || role.label : role.label}
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
                    Supervisor <span className={STYLES.requiredMark}>*</span>
                  </Label>
                  {supervisorsLoading ? (
                    <div className={STYLES.loadingIcon}>
                      <UserCircle className="w-5 h-5 animate-pulse" aria-hidden="true" />
                      <span>Cargando supervisores...</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.supervisorId}
                      onValueChange={handleSupervisorChange}
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
                  {clientesError && (
                    <p className={STYLES.errorMessage}>{clientesError}</p>
                  )}
                </div>
              )}

              {/* Mostrar checkbox de temporal sólo para operarios */}
              {formData.role === ROLES.OPERARIO && (
                <div className={STYLES.checkboxContainer}>
                  <Checkbox 
                    id="isTemporary" 
                    checked={isTemporary}
                    onCheckedChange={handleTemporaryChange}
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
                            <Info className="ml-1 h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
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
                    Tiempo de expiración (minutos) <span className={STYLES.requiredMark}>*</span>
                  </Label>
                  <Input
                    id="expirationMinutes"
                    type="number"
                    min={1}
                    max={10080} // 7 días máximo
                    value={formData.expirationMinutes || 30}
                    onChange={handleNumberInputChange}
                    required
                    className="w-full"
                    aria-required="true"
                  />
                  <p className={STYLES.helperText}>
                    Tiempo máximo: 7 días (10080 minutos)
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="password">
                  {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'} 
                  {!editingUser && <span className={STYLES.requiredMark}>*</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  required={!editingUser}
                  minLength={6}
                  placeholder={editingUser ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
                  className="w-full"
                  aria-required={!editingUser ? "true" : "false"}
                />
                {!editingUser && (
                  <p className={STYLES.helperText}>
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="secciones">Secciones <span className={STYLES.requiredMark}>*</span></Label>
                <Select
                  value={formData.secciones || 'ambos'}
                  onValueChange={handleSectionChange}
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
              </div>

              {/* Lista mejorada de clientes y subservicios del supervisor (ahora opcionales) */}
              {formData.role === ROLES.OPERARIO && formData.supervisorId && (
                <div className="mt-2">
                  <div className={STYLES.selectionSummary}>
                    <Label className="mb-0">
                      Subservicios asignados {/* Quitado el asterisco de requerido */}
                    </Label>
                    <Badge className={STYLES.badge}>
                      {selectedSubservicios.length} de {selectionStats.totalSubservicios} seleccionados
                    </Badge>
                  </div>
                  
                  {/* Texto informativo de que es opcional */}
                  <p className={STYLES.helperText + " mb-2"}>
                    Opcional: Si no selecciona ningún subservicio, el operario se creará sin asignaciones específicas.
                  </p>
                  
                  {/* Acciones y búsqueda */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={toggleSelectAll}
                        className="text-xs h-8 px-2 flex-1 sm:flex-none"
                        size="sm"
                      >
                        {selectionStats.selected === selectionStats.totalSubservicios ? 'Deseleccionar todo' : 'Seleccionar todo'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={toggleExpandAll}
                        className="text-xs h-8 px-2 flex-1 sm:flex-none"
                        size="sm"
                      >
                        {clientesDelSupervisor.every(c => c.isExpanded) ? 'Colapsar todos' : 'Expandir todos'}
                      </Button>
                    </div>
                    <div className={STYLES.searchContainer + " flex-1"}>
                      <Search className={STYLES.searchIcon} />
                      <Input
                        className={STYLES.searchInput}
                        placeholder="Buscar cliente o subservicio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="absolute right-1 top-1 h-7 w-7 p-0"
                          onClick={clearSearch}
                        >
                          <span className="sr-only">Limpiar</span>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {clientesLoading ? (
                    <div className="flex items-center justify-center p-4 border rounded-md">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-500 mr-2" />
                      <span className="text-gray-500">Cargando clientes y subservicios...</span>
                    </div>
                  ) : clientesError && !clientesDelSupervisor.length ? (
                    <div className="p-4 border rounded-md bg-red-50 text-red-800">
                      <AlertCircle className="h-4 w-4 text-red-600 inline-block mr-2" />
                      {clientesError}
                    </div>
                  ) : (
                    <ScrollArea className={STYLES.clientesContainer + " border-[#E5F1EA]"}>
                      {filteredClientes.length === 0 ? (
                        searchTerm ? (
                          <div className={STYLES.noData}>
                            No se encontraron coincidencias para "{searchTerm}"
                          </div>
                        ) : (
                          <div className={STYLES.noData}>
                            Este supervisor no tiene clientes o subservicios asignados
                          </div>
                        )
                      ) : (
                        filteredClientes.map(cliente => (
                          <div key={cliente._id} className="mb-3 last:mb-0">
                            {/* Cliente header */}
                            <div
                              className={`${STYLES.clienteItem} ${searchTerm && 'bg-[#F5F9F7]'}`}
                              onClick={() => toggleClienteExpanded(cliente._id)}
                            >
                              <div className="font-medium text-gray-800 flex items-center">
                                {cliente.isExpanded ? 
                                  <ChevronDown className={STYLES.chevronIcon} /> : 
                                  <ChevronRight className={STYLES.chevronIcon} />
                                }
                                <span className="ml-1 truncate">{cliente.nombre}</span>
                              </div>
                              <div className="flex items-center">
                                <Badge className={STYLES.badge + " ml-2"}>
                                  {cliente.subServicios.filter(s => s.isSelected).length} / {cliente.subServicios.length}
                                </Badge>
                              </div>
                            </div>
                            
                           {/* Subservicios list */}
                           {cliente.isExpanded && (
                              <div className={STYLES.subservicioList}>
                                {cliente.subServicios.map(subservicio => (
                                  <div 
                                    key={subservicio._id}
                                    className={`${STYLES.subservicioItem} ${subservicio.isSelected ? STYLES.selectedItem : ''}`}
                                  >
                                    <Checkbox 
                                      className="mr-2"
                                      checked={!!subservicio.isSelected}
                                      onCheckedChange={() => toggleSubservicioSelected(cliente._id, subservicio._id)}
                                      id={`checkbox-${cliente._id}-${subservicio._id}`}
                                    />
                                    <Label 
                                      htmlFor={`checkbox-${cliente._id}-${subservicio._id}`}
                                      className="flex-1 cursor-pointer truncate"
                                      onClick={() => toggleSubservicioSelected(cliente._id, subservicio._id)}
                                    >
                                      {subservicio.nombre}
                                    </Label>
                                    {subservicio.isSelected && (
                                      <Check className="ml-auto w-4 h-4 text-green-600 flex-shrink-0" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  )}
                </div>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </form>

        <DialogFooter className="gap-2 mt-4">
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
            onClick={handleFormSubmit}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                Procesando...
              </span>
            ) : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserForm;