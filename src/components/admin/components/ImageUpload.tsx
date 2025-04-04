import React, { useState, useRef, useCallback } from 'react';
import { ImageIcon, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotification } from '@/context/NotificationContext';
import { getAuthToken } from '@/utils/inventoryUtils';

// API URL base
const API_URL = "/api/";

interface ImageUploadProps {
  productId: string;
  onImageUploaded?: (success: boolean, productId?: string) => void;
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  productId,
  onImageUploaded,
  maxSizeMB = 5,
  maxWidth = 1200,
  maxHeight = 1200
}) => {
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Improved file validation and processing
  const validateAndProcessFile = useCallback(async (file: File) => {
    // Size validation (in bytes)
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      addNotification?.(`La imagen no debe superar los ${maxSizeMB}MB`, 'error');
      return null;
    }

    // Type validation
    if (!file.type.startsWith('image/')) {
      addNotification?.('El archivo debe ser una imagen', 'error');
      return null;
    }
    
    // Process and compress image if needed
    let processedFile = file;
    if (file.size > 1024 * 1024) { // Compress if larger than 1MB
      try {
        // Compression
        processedFile = await compressImage(file, maxWidth, maxHeight);
        
        // Add notification about compression
        const reduction = Math.round((1 - processedFile.size / file.size) * 100);
        if (reduction > 10) { // Only notify if significant reduction
          addNotification?.(
            `Imagen optimizada (reducida un ${reduction}%)`,
            'info'
          );
        }
      } catch (err) {
        console.warn('Error compressing image:', err);
        // Continue with original file if compression fails
      }
    }
    
    return processedFile;
  }, [addNotification, maxSizeMB, maxWidth, maxHeight]);

  // Improved file change handler
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Process and validate file
      const processedFile = await validateAndProcessFile(file);
      if (!processedFile) {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setImagePreview(reader.result as string);
          setFileToUpload(processedFile);
        }
      };
      reader.readAsDataURL(processedFile);
    }
  }, [validateAndProcessFile]);
  
  // Optimized image compression using canvas
  const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200): Promise<File> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        const img = new Image();
        
        reader.onload = (event) => {
          if (!event.target?.result) {
            return resolve(file);
          }
          
          img.onload = () => {
            try {
              // Use OffscreenCanvas if available for better performance
              let canvas: HTMLCanvasElement | OffscreenCanvas;
              let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
              
              if (typeof OffscreenCanvas !== 'undefined') {
                canvas = new OffscreenCanvas(img.width, img.height);
                ctx = canvas.getContext('2d');
              } else {
                canvas = document.createElement('canvas');
                ctx = canvas.getContext('2d');
              }
              
              if (!ctx) {
                return resolve(file);
              }

              // Calculate dimensions
              let width = img.width;
              let height = img.height;
              
              if (width > height) {
                if (width > maxWidth) {
                  height *= maxWidth / width;
                  width = maxWidth;
                }
              } else {
                if (height > maxHeight) {
                  width *= maxHeight / height;
                  height = maxHeight;
                }
              }
              
              width = Math.floor(width);
              height = Math.floor(height);
              
              // Set dimensions
              if (canvas instanceof HTMLCanvasElement) {
                canvas.width = width;
                canvas.height = height;
              } else {
                // For OffscreenCanvas
                canvas.width = width;
                canvas.height = height;
              }
              
              // Draw image
              ctx.drawImage(img, 0, 0, width, height);
              
              // Determine output format - preferir WebP para mejor compresión
              const outputType = 'image/webp';
              const quality = file.size > 2 * 1024 * 1024 ? 0.6 : 0.8;
              
              // Create blob
              const canvasToBlob = (canvas: HTMLCanvasElement | OffscreenCanvas, callback: (blob: Blob | null) => void) => {
                if (canvas instanceof HTMLCanvasElement) {
                  canvas.toBlob(callback, outputType, quality);
                } else {
                  // For OffscreenCanvas
                  canvas.convertToBlob({ type: outputType, quality }).then(callback);
                }
              };
              
              canvasToBlob(canvas, (blob) => {
                if (!blob) {
                  return resolve(file);
                }
                
                // Create filename with appropriate extension
                let fileName = file.name;
                if (outputType === 'image/webp' && !fileName.toLowerCase().endsWith('.webp')) {
                  const nameParts = fileName.split('.');
                  fileName = nameParts.length > 1 
                    ? nameParts.slice(0, -1).join('.') + '.webp'
                    : fileName + '.webp';
                }
                
                const compressedFile = new File([blob], fileName, {
                  type: outputType,
                  lastModified: Date.now()
                });
                
                resolve(compressedFile);
              });
              
            } catch (err) {
              console.error('Compression error:', err);
              resolve(file);
            }
          };
          
          img.onerror = () => resolve(file);
          img.src = event.target.result as string;
        };
        
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
        
      } catch (err) {
        console.error('General compression error:', err);
        resolve(file);
      }
    });
  };
  
  // Optimized image upload using FormData (ahora preferido ya que guardamos en sistema de archivos)
  const uploadImage = async () => {
    if (!fileToUpload) {
      addNotification?.('No hay imagen para subir', 'warning');
      return;
    }

    setLoading(true);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Crear FormData para enviar la imagen
      const formDataObj = new FormData();
      formDataObj.append('imagen', fileToUpload);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${API_URL}producto/${productId}/imagen`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataObj,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Error en subida (${response.status}): ${response.statusText}`);
        }
        
        // Obtener la URL de la imagen desde la respuesta
        const data = await response.json();
        
        // Mostrar notificación de éxito
        addNotification?.('Imagen subida correctamente', 'success');
        
        // Notificar al componente padre
        if (onImageUploaded) {
          onImageUploaded(true, productId);
        }
        
        // Limpiar el formulario
        handleClear();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error('La solicitud tardó demasiado tiempo');
        }
        throw error;
      }

    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      addNotification?.(`Error al subir la imagen: ${err.message || 'Error desconocido'}`, 'error');
      
      if (onImageUploaded) {
        onImageUploaded(false);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Clear form
  const handleClear = () => {
    setImagePreview(null);
    setFileToUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <div className="relative">
      {/* Preview */}
      {imagePreview && (
        <div className="relative w-full h-32 bg-[#DFEFE6]/20 rounded-md overflow-hidden border border-[#91BEAD]/30 mb-2">
          <img 
            src={imagePreview} 
            alt="Vista previa" 
            className="w-full h-full object-contain" 
          />
          
          {/* Loading state */}
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
          
          {/* Clear button */}
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
      
      {/* Upload area */}
      {!imagePreview ? (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-[#91BEAD]/30 border-dashed rounded-md cursor-pointer bg-[#DFEFE6]/20 hover:bg-[#DFEFE6]/40 transition-colors">
            <div className="flex flex-col items-center justify-center pt-3 pb-4">
              <ImageIcon className="w-8 h-8 text-[#7AA79C] mb-1" />
              <p className="text-xs text-[#7AA79C]">
                Haz clic para seleccionar una imagen
              </p>
              <p className="text-xs text-[#7AA79C]">
                Máximo {maxSizeMB}MB
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