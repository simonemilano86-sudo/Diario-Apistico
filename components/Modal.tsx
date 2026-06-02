
import React, { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    disableBackdropClick?: boolean;
    hideCloseButton?: boolean;
    fullScreen?: boolean;
    alignTop?: boolean;
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    disableBackdropClick = false, 
    hideCloseButton = false,
    fullScreen = false,
    alignTop = false
}) => {
    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex justify-center ${fullScreen ? 'items-stretch p-0' : (alignTop ? 'items-start pt-8 sm:pt-16 p-4' : 'items-start sm:items-center p-4 pt-16 sm:pt-4')} overflow-y-auto`}
            onClick={disableBackdropClick ? undefined : onClose}
        >
            <div
                className={`bg-white dark:bg-slate-800 shadow-2xl w-full flex flex-col relative ${fullScreen ? 'min-h-screen rounded-none' : 'max-w-lg max-h-[82vh] sm:max-h-[90vh] rounded-[32px]'} overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {!hideCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 z-50 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-full bg-slate-100/50 dark:bg-slate-700/50 backdrop-blur-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {title && (
                        <h2 className="text-xl font-black text-slate-800 dark:text-white text-center mt-2 mb-6 tracking-tight uppercase">
                            {title}
                        </h2>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
