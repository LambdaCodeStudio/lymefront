// src/components/ImageUpload.tsx
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { imageService } from '@/services/imageService';
import { useNotification } from '@/context/NotificationContext';

interface ImageUploadProps {
  productId?: string;
  onImageUploaded?: (success: boolean) => void;
  useBase64?: boolean;
  className?: string;
  initialImageUrl?: string | null;
}

/**
 * Componente para subir imágenes con soporte para base64
 */
const ImageUpload: React.FC<ImageUploadProps> = ({
  productId,
  onImageUploaded,
  useBase64 = false,
  className = '',
  initialImageUrl = null
}) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejar la selección de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        addNotification?.('La imagen no debe superar los 5MB', 'error');
        resetFileInput();
        return;
      }
      
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        addNotification?.('El archivo debe ser una imagen', 'error');
        resetFileInput();
        return;
      }
      
      // Guardar archivo y mostrar vista previa
      setImageFile(file);
      
      // Crear URL para vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Limpiar el input file
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setImageFile(null);
  };

  // Limpiar la imagen
  const handleRemoveImage = () => {
    setImagePreview(null);
    resetFileInput();
  };

  // Subir la imagen
  const handleUpload = async () => {
    if (!productId || !imageFile) {
      addNotification?.('Seleccione una imagen y asegúrese de tener un producto válido', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      if (useBase64) {
        // Convertir a base64 y subir
        const base64Data = await imageService.fileToBase64(imageFile);
        await imageService.uploadImageBase64(productId, base64Data);
      } else {
        // Subir como archivo
        await imageService.uploadImage(productId, imageFile);
      }
      
      addNotification?.('Imagen subida correctamente', 'success');
      onImageUploaded?.(true);
    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      addNotification?.(`Error al subir la imagen: ${error.message}`, 'error');
      onImageUploaded?.(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {imagePreview ? (
        <div className="relative w-full bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30">
          <img
            src={imagePreview}
            alt="Vista previa"
            className="w-full object-contain max-h-64"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500 hover:bg-red-600"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-[#91BEAD]/30 border-dashed rounded-md cursor-pointer bg-[#DFEFE6]/20 hover:bg-[#DFEFE6]/40 transition-colors">
            <div className="flex flex-col items-center justify-center pt-3 pb-4">
              <ImageIcon className="w-8 h-8 text-[#7AA79C] mb-1" />
              <p className="text-sm text-[#7AA79C]">
                Haz clic para seleccionar una imagen
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
              disabled={loading}
            />
          </label>
        </div>
      )}

      {imagePreview && (
        <Button
          type="button"
          onClick={handleUpload}
          className="bg-[#29696B] hover:bg-[#29696B]/90 text-white"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Subir imagen
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;