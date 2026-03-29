import { useCallback, useRef, useState } from 'react';
import type { ChartImage } from '../types';

interface ChartUploaderProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  image: ChartImage | null;
  onImageSet: (image: ChartImage | null) => void;
  onMultipleFiles?: (files: File[]) => void;
  accentColor: string;
  highlight?: boolean;
}

export default function ChartUploader({ label, description, icon, image, onImageSet, onMultipleFiles, accentColor, highlight }: ChartUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const preview = URL.createObjectURL(file);
    onImageSet({ file, preview, name: file.name });
  }, [onImageSet]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 1 && onMultipleFiles) {
      onMultipleFiles(files);
    } else if (files.length === 1) {
      handleFile(files[0]);
    }
  }, [handleFile, onMultipleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    if (files.length > 1 && onMultipleFiles) {
      onMultipleFiles(files);
    } else if (files.length === 1) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [handleFile, onMultipleFiles]);

  const borderColor = isDragging || highlight
    ? 'border-neon-blue shadow-[0_0_20px_rgba(0,149,255,0.3)]'
    : image
    ? 'border-green-500/50'
    : 'border-dark-500';
  const bgColor = isDragging || highlight
    ? 'bg-neon-blue/5'
    : image
    ? 'bg-green-500/5'
    : 'bg-dark-800/50';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{label}</h3>
          <p className="text-[10px] text-slate-500">{description}</p>
        </div>
        {image && (
          <button
            onClick={() => onImageSet(null)}
            className="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors bg-red-400/10 px-2 py-1 rounded"
          >
            ✕ Remove
          </button>
        )}
      </div>

      <div
        className={`relative flex-1 min-h-[180px] rounded-xl border-2 border-dashed ${borderColor} ${bgColor} transition-all duration-300 cursor-pointer overflow-hidden group`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        tabIndex={0}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />

        {image ? (
          <div className="relative w-full h-full">
            <img
              src={image.preview}
              alt={label}
              className="w-full h-full object-contain bg-black/30"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">Chart loaded</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">{image.name}</p>
            </div>
            <div className="absolute inset-0 bg-neon-blue/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-xs text-white bg-dark-800/90 px-3 py-1.5 rounded-lg">Click to replace</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <div className={`text-3xl mb-3 transition-opacity ${highlight ? 'opacity-80 animate-bounce' : 'opacity-30 group-hover:opacity-60'}`}>
              {highlight ? '📋' : '📊'}
            </div>
            {highlight ? (
              <>
                <p className="text-xs text-neon-blue font-semibold mb-1 animate-pulse">⌨️ Ctrl+V to paste here</p>
                <p className="text-[10px] text-slate-400">Next empty slot</p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-400 mb-1">Drag & drop or click to upload</p>
                <p className="text-[10px] text-slate-600">Select multiple files at once</p>
                <p className="text-[10px] text-neon-blue/60 mt-1">Ctrl+V auto-pastes here</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
