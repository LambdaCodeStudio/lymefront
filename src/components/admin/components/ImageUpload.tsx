// src/components/admin/components/ImageUpload.tsx
import React, { useState, useRef } from 'react';
import { imageService } from '@/services/imageService';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotification } from '@/context/NotificationContext';
import { getAuthToken } from '@/utils/inventoryUtils';

interface ImageUploadProps {
  productId: string;
  useBase64?: boolean;
  onImageUploaded?: (success: boolean) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  productId,
  onImageUploaded
}) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Validar y procesar el archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validar tamaño del archivo (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        console.log('La imagen no debe superar los 5MB');
        addNotification?.('La imagen no debe superar los 5MB', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        console.log('El archivo debe ser una imagen');
        addNotification?.('El archivo debe ser una imagen', 'error');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Mostrar vista previa
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setFileToUpload(file); // Guardar el archivo para subirlo posteriormente
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Subir imagen al servidor
  const uploadImage = async () => {
    if (!fileToUpload) {
      console.log('No hay imagen para subir');
      return;
    }

    setLoading(true);
    
    try {
      // Convertir a base64 y subir
      try {
        console.log('Subiendo imagen en Base64 para producto:', productId);
        const base64Data = await convertFileToBase64(fileToUpload);
        await uploadBase64Direct(productId, base64Data);
        
        console.log('Imagen Base64 subida correctamente');
        addNotification?.('Imagen subida correctamente', 'success');
        
        if (onImageUploaded) {
          onImageUploaded(true);
        }
      } catch (err: any) {
        console.error('Error en subida Base64:', err);
        throw err;
      }
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      
      if (onImageUploaded) {
        onImageUploaded(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para convertir File a Base64
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Función auxiliar para subir Base64 directamente (evita problemas potenciales con imageService)
  const uploadBase64Direct = async (productId: string, base64Image: string): Promise<void> => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`https://lyme-back.vercel.app/api/producto/${productId}/imagen-base64`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base64Image })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Error al subir imagen');
    }
  };
  
  // Limpiar selección y estados
  const handleClear = () => {
    setImagePreview(null);
    setFileToUpload(null);
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
                  Procesando imagen...
                </span>
              </div>
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
      
      {/* Área de subida */}
      {!imagePreview ? (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-[#91BEAD]/30 border-dashed rounded-md cursor-pointer bg-[#DFEFE6]/20 hover:bg-[#DFEFE6]/40 transition-colors">
            <div className="flex flex-col items-center justify-center pt-3 pb-4">
              <ImageIcon className="w-8 h-8 text-[#7AA79C] mb-1" />
              <p className="text-xs text-[#7AA79C]">
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
            />
          </label>
        </div>
      ) : (
        <div className="flex justify-between gap-2">
          {!loading && (
            <Button
              type="button"
              className="flex-1 bg-[#29696B] hover:bg-[#29696B]/90 text-white"
              onClick={uploadImage}
              disabled={loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Subir imagen
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;