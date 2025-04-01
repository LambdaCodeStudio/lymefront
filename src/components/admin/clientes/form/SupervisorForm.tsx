import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Mail, Shield, User, Users } from 'lucide-react';
import { getSupervisorIdentifier } from '../utils/clientUtils';
import type { Client, SubServicio, SupervisorData } from '../types/clients';

interface SupervisorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (supervisorId: string) => Promise<void>;
  client: Client | null;
  subservicio: SubServicio | null;
  supervisors: SupervisorData[];
  selectedSupervisorId: string;
  setSelectedSupervisorId: (id: string) => void;
  isLoading: boolean;
}

/**
 * Formulario para asignar un supervisor a un subservicio
 */
const SupervisorForm: React.FC<SupervisorFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  client,
  subservicio,
  supervisors,
  selectedSupervisorId,
  setSelectedSupervisorId,
  isLoading
}) => {
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(selectedSupervisorId);
  };

  // Obtener supervisores disponibles para este cliente
  const clientSupervisors = client && Array.isArray(client.userId)
    ? supervisors.filter(supervisor => 
        client.userId.some(userId => 
          typeof userId === 'object' && userId !== null && userId._id 
            ? userId._id === supervisor._id
            : userId === supervisor._id
        )
      )
    : [];

  // Obtener información del supervisor seleccionado
  const selectedSupervisor = supervisors.find(s => s._id === selectedSupervisorId);

  // Verificar si el formulario es válido para habilitar/deshabilitar el botón de envío
  const isFormValid = selectedSupervisorId !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-[#91BEAD]/20">
        <DialogHeader>
          <DialogTitle className="text-[#29696B] flex items-center">
            <Shield className="w-5 h-5 mr-2" aria-hidden="true" />
            {subservicio?.supervisorId ? 'Cambiar Supervisor' : 'Asignar Supervisor'}
          </DialogTitle>
          {client && subservicio && (
            <DialogDescription className="text-[#7AA79C]">
              Cliente: <span className="text-[#29696B]">{client.nombre}</span>
              <br />
              Subservicio: <span className="text-[#29696B]">{subservicio.nombre}</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <Label htmlFor="supervisor-id" className="text-sm text-[#29696B]">
              Seleccionar Supervisor*
            </Label>
            <Select
              value={selectedSupervisorId}
              onValueChange={setSelectedSupervisorId}
              required
            >
              <SelectTrigger 
                id="supervisor-id" 
                className="mt-1 border-[#91BEAD] focus:ring-[#29696B]/20"
                aria-required="true"
              >
                <SelectValue placeholder="Seleccionar supervisor" />
              </SelectTrigger>
              <SelectContent>
                {clientSupervisors.length > 0 ? (
                  clientSupervisors.map(supervisor => (
                    <SelectItem key={supervisor._id} value={supervisor._id}>
                      {supervisor.email || supervisor.usuario || `${supervisor.nombre || ''} ${supervisor.apellido || ''}`.trim() || supervisor._id}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-supervisors" disabled>
                    No hay supervisores asignados al cliente
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Mostrar información del supervisor seleccionado */}
            {selectedSupervisorId && selectedSupervisor && (
              <div className="mt-3 p-3 bg-[#DFEFE6]/20 border border-[#91BEAD]/30 rounded-md">
                <div className="flex items-center mb-2">
                  <Shield className="w-4 h-4 text-[#29696B] mr-2" aria-hidden="true" />
                  <span className="font-medium text-[#29696B]">Información del Supervisor</span>
                </div>
                <div className="text-sm space-y-1 text-[#7AA79C]">
                  {selectedSupervisor.email && (
                    <div className="flex items-center">
                      <Mail className="w-3 h-3 mr-1 text-[#29696B]" aria-hidden="true" />
                      Email: <span className="ml-1 text-[#29696B]">{selectedSupervisor.email}</span>
                    </div>
                  )}
                  {selectedSupervisor.usuario && (
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1 text-[#29696B]" aria-hidden="true" />
                      Usuario: <span className="ml-1 text-[#29696B]">{selectedSupervisor.usuario}</span>
                    </div>
                  )}
                  {selectedSupervisor.nombre && (
                    <div className="flex items-center">
                      <User className="w-3 h-3 mr-1 text-[#29696B]" aria-hidden="true" />
                      Nombre: <span className="ml-1 text-[#29696B]">
                        {`${selectedSupervisor.nombre || ''} ${selectedSupervisor.apellido || ''}`.trim()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-[#7AA79C] mt-2">
              Nota: Solo puede seleccionar supervisores que estén asignados a este cliente.
            </p>
          </div>

          <DialogFooter className="gap-2 mt-4">
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
              ) : subservicio?.supervisorId
                ? 'Cambiar Supervisor'
                : 'Asignar Supervisor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupervisorForm;