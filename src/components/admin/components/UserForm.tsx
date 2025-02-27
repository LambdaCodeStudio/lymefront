/**
 * Componente de formulario para crear y editar usuarios
 * Reutilizable para diferentes secciones del panel administrativo
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';
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
import type { RoleOption } from '../shared/UserRolesConfig';
import type { AdminUser, CreateUserData } from '../services/userService';

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
  error
}) => {
  // Maneja el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div>
                <Label htmlFor="usuario">Nombre de Usuario</Label>
                <Input
                  id="usuario"
                  type="text"
                  value={formData.usuario}
                  onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                  placeholder="usuario123"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre"
                />
              </div>
              <div>
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  type="text"
                  value={formData.apellido}
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
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  placeholder="+123456789"
                />
              </div>
              <div>
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => {
                    setFormData({
                      ...formData,
                      role: value,
                      // Resetear tiempo de expiración si se cambia a temporal
                      expirationMinutes: value === 'temporal' ? 30 : undefined
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="password">
                {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
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

            {formData.role === 'temporal' && (
              <div>
                <Label htmlFor="expirationMinutes">
                  Tiempo de expiración (minutos)
                </Label>
                <Input
                  id="expirationMinutes"
                  type="number"
                  min={1}
                  max={1440} // 24 horas máximo
                  value={formData.expirationMinutes}
                  onChange={(e) => setFormData({
                    ...formData,
                    expirationMinutes: parseInt(e.target.value)
                  })}
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tiempo máximo: 24 horas (1440 minutos)
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="secciones">Secciones</Label>
              <Select
                value={formData.secciones}
                onValueChange={(value: 'limpieza' | 'mantenimiento' | 'ambos') => {
                  setFormData({
                    ...formData,
                    secciones: value
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar secciones" />
                </SelectTrigger>
                <SelectContent>
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