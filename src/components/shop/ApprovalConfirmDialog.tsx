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
        icon: <CheckCircle2 className="h-6 w-6 text-green-500" />,
        title: 'Aprobar Pedido',
        titleColor: 'text-green-500',
        description: `¿Estás seguro de que deseas aprobar el pedido #${orderNumber}?`,
        buttonText: 'Confirmar Aprobación',
        buttonClass: 'bg-green-600 hover:bg-green-700 text-white',
        bgClass: 'from-[#15497E]/70 to-[#2A82C7]/70'
      };
    } else {
      return {
        icon: <XCircle className="h-6 w-6 text-red-500" />,
        title: 'Rechazar Pedido',
        titleColor: 'text-red-500',
        description: `¿Estás seguro de que deseas rechazar el pedido #${orderNumber}?`,
        buttonText: 'Confirmar Rechazo',
        buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
        bgClass: 'from-[#15497E]/70 to-[#2A82C7]/70'
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
      <DialogContent className={`bg-gradient-to-r ${styles.bgClass} backdrop-blur-md border-[#2A82C7] text-white max-w-md mx-auto`}>
        <DialogHeader className="pb-2">
          <div className="flex items-center mb-2">
            {styles.icon}
            <DialogTitle className={`ml-2 ${styles.titleColor} text-xl`}>
              {styles.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#F8F9FA]">
            {styles.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Información del pedido */}
          <div className="bg-white/10 rounded-md p-3 space-y-2 border border-[#2A82C7]/30">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center text-[#F8F9FA]">
                <ClipboardList className="h-4 w-4 mr-1" />
                Pedido #:
              </span>
              <span className="font-medium text-[#F8F9FA]">{orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#F8F9FA]">Total:</span>
              <span className="font-medium text-[#F8F9FA]">${orderTotal}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[#F8F9FA]">Items:</span>
              <span className="font-medium text-[#F8F9FA]">{orderItems}</span>
            </div>
          </div>

          {/* Campo para notas y comentarios */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[#F8F9FA]">
              Notas {type === 'reject' && <span className="text-red-300">(requerido para rechazo)</span>}
            </Label>
            <Textarea
              id="notes"
              placeholder={type === 'approve' 
                ? "Comentarios adicionales (opcional)" 
                : "Razón del rechazo (obligatorio)"}
              className="bg-white/10 border-[#2A82C7] text-[#F8F9FA] placeholder:text-[#F8F9FA]/50"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required={type === 'reject'}
              rows={4}
            />
          </div>

          {/* Alerta para rechazo */}
          {type === 'reject' && (
            <div className="flex items-start space-x-2 text-yellow-200 text-sm bg-yellow-900/30 p-2 rounded-md border border-yellow-500/50">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>El pedido será rechazado y el operario será notificado con tu comentario. Esta acción no puede deshacerse.</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-[#2A82C7] text-[#F8F9FA] hover:bg-[#2A82C7]/20"
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