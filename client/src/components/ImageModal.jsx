import React, { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

const ImageModal = ({ isOpen, onClose, imageUrl, title, subtitle }) => {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-opacity duration-300">
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
                <X className="h-8 w-8" />
            </button>

            {/* Content Container */}
            <div className="relative w-full h-full max-w-5xl flex flex-col items-center justify-center">
                
                {/* Image Wrapper */}
                <div className="relative w-full flex-1 flex items-center justify-center min-h-0 overflow-hidden">
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={title} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    ) : (
                        <div className="text-gray-400 text-center">
                            <p>No image available</p>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-4 text-center text-white w-full bg-black/50 p-4 rounded-xl backdrop-blur-md border border-white/10">
                    <h3 className="text-xl font-bold tracking-wide">{title}</h3>
                    {subtitle && (
                        <p className="text-sm text-gray-300 font-mono mt-1">{subtitle}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageModal;
