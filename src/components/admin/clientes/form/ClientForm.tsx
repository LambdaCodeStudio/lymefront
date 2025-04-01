import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import MultiSupervisorSelect from '../components/MultiSupervisorSelect';
import { DEFAULT_VALUES } from '../constants/clients';
import { extractUserIds } from '../utils/clientUtils';
import type { Client, CreateClientData, SupervisorData } from '../types/clients';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientData) => Promise<void>;
  client: Client | null;
  supervisors: SupervisorData[];
  isLoading: boolean;
}

/**
 * Formulario para crear o editar un cliente
 */
const ClientForm: React.FC<ClientFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  supervisors,
  isLoading
}) => {
  // Estado local del formulario
  const [formData, setFormData] = useState<CreateClientData>(DEFAULT_VALUES.CLIENT_FORM);

  // Actualizar formulario cuando se recibe un cliente para edición
  useEffect(() => {
    if (client) {
      setFormData({
        nombre: client.nombre,
        descripcion: client.descripcion || '',
        userId: extractUserIds(client),
        direccion: client.direccion || '',
        telefono: client.telefono || '',
        email: client.email || '',
        activo: client.activo
      });
    } else {
      // Restablecer al valor predeterminado para un nuevo cliente
      setFormData(DEFAULT_VALUES.CLIENT_FORM);
    }
  }, [client, isOpen]);

  // Manejar cambios en los campos del formulario
  const handleChange = (field: keyof CreateClientData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Verificar si el formulario es válido para habilitar/deshabilitar el botón de envío
  const isFormValid = formData.nombre.trim() !== '' && 
    Array.isArray(formData.userId) && 
    formData.userId.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto bg-white border border-[#91BEAD]/20">
        <DialogHeader className="sticky top-0 bg-white pt-4 pb-2 z-10">
          <DialogTitle className="text-[#29696B]">
            {client ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="nombre" className="text-sm text-[#29696B]">
              Nombre del Cliente*
            </Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Ej: Ministerio de Salud, Universidad XYZ"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              required
              aria-required="true"
              className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
            />
          </div>

          <div>
            <Label htmlFor="descripcion" className="text-sm text-[#29696B]">
              Descripción
            </Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              placeholder="Descripción opcional del cliente"
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              className="mt-1 border-[#91BEAD] focus:border-[#29696B] resize-none"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="userId" className="text-sm text-[#29696B]">
              Supervisores Asignados*
            </Label>
            <div className="mt-1">
              <MultiSupervisorSelect
                supervisors={supervisors}
                selectedSupervisors={formData.userId}
                onChange={(newValue) => handleChange('userId', newValue)}
                placeholder="Seleccionar supervisores..."
              />
            </div>
            {(!formData.userId || formData.userId.length === 0) && (
              <p className="text-xs text-red-500 mt-1" id="userId-error">
                Debe seleccionar al menos un supervisor
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="direccion" className="text-sm text-[#29696B]">
              Dirección
            </Label>
            <Input
              id="direccion"
              name="direccion"
              placeholder="Ej: Av. Rivadavia 1234, Buenos Aires"
              value={formData.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="telefono" className="text-sm text-[#29696B]">
                Teléfono
              </Label>
              <Input
                id="telefono"
                name="telefono"
                type="tel"
                placeholder="Ej: +54 11 12345678"
                value={formData.telefono}
                onChange={(e) => handleChange('telefono', e.target.value)}
                className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm text-[#29696B]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Ej: contacto@empresa.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="mt-1 border-[#91BEAD] focus:border-[#29696B]"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="activo"
              name="activo"
              type="checkbox"
              checked={formData.activo}
              onChange={(e) => handleChange('activo', e.target.checked)}
              className="form-checkbox h-4 w-4 text-[#29696B] rounded border-[#91BEAD] focus:ring-[#29696B]/20"
            />
            <Label htmlFor="activo" className="text-sm text-[#29696B]">
              Cliente activo
            </Label>
          </div>

          <DialogFooter className="sticky bottom-0 bg-white pt-2 pb-4 z-10 gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : client
                ? 'Guardar Cambios'
                : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;