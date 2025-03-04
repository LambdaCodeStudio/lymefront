// src/components/admin/components/ImageUpload.tsx
import React, { useState, useRef } from 'react';
import { imageService } from '@/services/imageService';
import { ImageIcon, Upload, X, Loader2, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotification } from '@/context/NotificationContext';

interface ImageUploadProps {
  productId: string;
  useBase64?: boolean;
  onImageUploaded?: (success: boolean) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  productId,
  useBase64 = false,
  onImageUploaded
}) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Validar y procesar el archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño del archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        setError('La imagen no debe superar los 5MB');
        addNotification?.('La imagen no debe superar los 5MB', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('El archivo debe ser una imagen');
        addNotification?.('El archivo debe ser una imagen', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Resetear estados previos
      setError(null);
      setSuccess(false);
      
      // Mostrar vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Iniciar la carga
      uploadImage(file);
    }
  };
  
  // Subir imagen al servidor
  const uploadImage = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      if (useBase64) {
        // Convertir a base64 y subir
        const base64Data = await imageService.fileToBase64(file);
        await imageService.uploadImageBase64(productId, base64Data);
      } else {
        // Subir como archivo (método original)
        await imageService.uploadImage(productId, file);
      }
      
      setSuccess(true);
      addNotification?.('Imagen subida correctamente', 'success');
      
      // Notificar al componente padre
      if (onImageUploaded) {
        onImageUploaded(true);
      }
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      setError(err.message || 'Error al subir la imagen');
      addNotification?.(`Error al subir imagen: ${err.message}`, 'error');
      
      // Notificar al componente padre
      if (onImageUploaded) {
        onImageUploaded(false);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Reintentar subida
  const handleRetry = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Limpiar selección y estados
  const handleClear = () => {
    setImagePreview(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="relative">
      {/* Vista previa */}
      {imagePreview && (
        <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30 mb-2">
          <img 
            src={imagePreview} 
            alt="Vista previa" 
            className="w-full h-full object-contain" 
          />
          
          {/* Estado de carga */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                <span className="text-xs text-white font-medium">
                  {useBase64 ? 'Procesando imagen...' : 'Subiendo imagen...'}
                </span>
              </div>
            </div>
          )}
          
          {/* Indicador de éxito */}
          {success && !loading && (
            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
          
          {/* Botón para eliminar */}
          {!loading && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleClear}
              className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      
      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded-md mb-2 text-xs">
          {error}
        </div>
      )}
      
      {/* Área de subida */}
      {!imagePreview ? (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-[#91BEAD]/30 border-dashed rounded-md cursor-pointer bg-[#DFEFE6]/20 hover:bg-[#DFEFE6]/40 transition-colors">
            <div className="flex flex-col items-center justify-center pt-3 pb-4">
              <ImageIcon className="w-8 h-8 text-[#7AA79C] mb-1" />
              <p className="text-xs text-[#7AA79C]">
                Haz clic para subir una imagen
              </p>
              <p className="text-xs text-[#7AA79C]">
                Máximo 5MB
              </p>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
          </label>
        </div>
      ) : error ? (
        <Button
          type="button"
          variant="outline"
          className="w-full border-amber-500 text-amber-700 hover:bg-amber-50"
          onClick={handleRetry}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      ) : success ? (
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="outline" 
            className="flex-1 border-[#91BEAD] text-[#29696B] hover:bg-[#DFEFE6]/30"
            onClick={handleClear}
          >
            <Upload className="w-4 h-4 mr-2" />
            Subir otra
          </Button>
        </div>
      ) : null}
      
      {/* Indicador de modo */}
      <div className="mt-2 text-xs text-[#7AA79C] text-center">
        Modo: <span className="font-medium">{useBase64 ? 'Base64' : 'Binario'}</span>
      </div>
    </div>
  );
};

export default ImageUpload;