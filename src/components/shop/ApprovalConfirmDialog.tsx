import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ClipboardList } from 'lucide-react';

interface ApprovalConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
  orderNumber: string;
  orderTotal: string;
  orderItems: number;
  type: 'approve' | 'reject';
  isProcessing: boolean;
}

const ApprovalConfirmDialog: React.FC<ApprovalConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderNumber,
  orderTotal,
  orderItems,
  type,
  isProcessing
}) => {
  const [notes, setNotes] = useState<string>('');

  // Determinar colores y estilos basados en el tipo de acción
  const getDialogStyles = () => {
    if (type === 'approve') {
      return {
        icon: <CheckCircle2 className="h-6 w-6 text-[--state-success]" />,
        title: 'Aprobar Pedido',
        titleColor: 'text-[--state-success]',
        description: `¿Estás seguro de que deseas aprobar el pedido #${orderNumber}?`,
        buttonText: 'Confirmar Aprobación',
        buttonClass: 'bg-[--state-success] hover:bg-[--accent-tertiary] text-white',
        bgClass: 'bg-[--background-card]'
      };
    } else {
      return {
        icon: <XCircle className="h-6 w-6 text-[--state-error]" />,
        title: 'Rechazar Pedido',
        titleColor: 'text-[--state-error]',
        description: `¿Estás seguro de que deseas rechazar el pedido #${orderNumber}?`,
        buttonText: 'Confirmar Rechazo',
        buttonClass: 'bg-[--state-error] hover:bg-[--state-error]/80 text-white',
        bgClass: 'bg-[--background-card]'
      };
    }
  };

  const styles = getDialogStyles();

  // Manejar la confirmación del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(notes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`shop-theme 
                    ${styles.bgClass} 
                    backdrop-blur-md 
                    border-[--accent-primary]/30 
                    text-[--text-primary] 
                    max-w-md 
                    mx-auto`}
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center mb-2">
            {styles.icon}
            <DialogTitle className={`ml-2 ${styles.titleColor} text-xl`}>
              {styles.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[--text-secondary]">
            {styles.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Información del pedido */}
          <div 
            className="bg-[--background-component] 
                       rounded-md p-3 
                       space-y-2 
                       border border-[--accent-primary]/20"
          >
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center text-[--text-primary]">
                <ClipboardList className="h-4 w-4 mr-1" />
                Pedido #:
              </span>
              <span className="font-medium text-[--text-primary]">{orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[--text-primary]">Total:</span>
              <span className="font-medium text-[--accent-quaternary]">${orderTotal}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[--text-primary]">Items:</span>
              <span className="font-medium text-[--text-primary]">{orderItems}</span>
            </div>
          </div>

          {/* Campo para notas y comentarios */}
          <div className="space-y-2">
            <Label 
              htmlFor="notes" 
              className="text-[--text-primary] mb-2 block"
            >
              Notas {type === 'reject' && <span className="text-[--state-error]/80">(requerido para rechazo)</span>}
            </Label>
            <Textarea
              id="notes"
              placeholder={type === 'approve' 
                ? "Comentarios adicionales (opcional)" 
                : "Razón del rechazo (obligatorio)"}
              className="bg-[--background-card] 
                         border-[--accent-primary]/30 
                         text-[--text-primary] 
                         placeholder:text-[--text-tertiary]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={type === 'reject'}
              rows={4}
            />
          </div>

          {/* Alerta para rechazo */}
          {type === 'reject' && (
            <div 
              className="flex items-start space-x-2 
                         text-[--state-warning] 
                         text-sm 
                         bg-[--state-warning]/10 
                         p-2 
                         rounded-md 
                         border border-[--state-warning]/30"
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>El pedido será rechazado y el operario será notificado con tu comentario. Esta acción no puede deshacerse.</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[--accent-primary]/30 
                         text-[--text-primary] 
                         hover:bg-[--accent-primary]/20"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={styles.buttonClass}
              disabled={isProcessing || (type === 'reject' && !notes.trim())}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                styles.buttonText
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ApprovalConfirmDialog;