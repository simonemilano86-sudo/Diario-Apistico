
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
    noScroll?: boolean;
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    disableBackdropClick = false, 
    hideCloseButton = false,
    fullScreen = false,
    alignTop = false,
    noScroll = false
}) => {
    React.useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex justify-center ${
                fullScreen 
                    ? 'items-stretch p-0' 
                    : (alignTop 
                        ? 'items-start pt-20 sm:pt-16 p-4' 
                        : 'items-center justify-center p-4 py-8 sm:py-6')
            } overflow-y-auto`}
            onClick={disableBackdropClick ? undefined : onClose}
        >
            <div
                className={`bg-white dark:bg-slate-800 shadow-2xl w-full flex flex-col relative my-auto ${
                    fullScreen 
                        ? 'min-h-screen rounded-none' 
                        : 'max-w-lg max-h-[78vh] sm:max-h-[88vh] rounded-[28px]'
                } overflow-hidden`}
                onClick={(e) => e.stopPropagation()}
            >
                {!hideCloseButton && (
                    <button
                        onClick={onClose}
                        className="absolute right-3.5 top-3.5 sm:right-4 sm:top-4 z-50 p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition rounded-full bg-slate-100/80 dark:bg-slate-700/80 backdrop-blur-sm hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 touch-manipulation shadow-sm"
                        aria-label="Chiudi finestra"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                
                <div className={`flex-1 p-5 sm:p-6 ${noScroll ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
                    {title && (
                        <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white text-center mt-1 mb-5 px-10 sm:px-12 tracking-tight uppercase leading-snug">
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

