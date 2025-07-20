import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * ID único para el diálogo, usado para accesibilidad
   * @default 'confirm-dialog'
   */
  id?: string;
  /**
   * Si es true, el botón de confirmar se enfocará al abrir el diálogo
   * @default false
   */
  focusConfirm?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  id = 'confirm-dialog',
  focusConfirm = false
}) => {
  // Refs para enfocar elementos
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  
  // Enfocar botón correspondiente al abrir el diálogo
  useEffect(() => {
    if (isOpen) {
      // Pequeño retraso para asegurar que el DOM está listo
      const timer = setTimeout(() => {
        if (focusConfirm && confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        } else if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, focusConfirm]);
  
  // Manejar tecla Escape y prevenir scroll
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  const dialogContent = (
    <div 
      className="confirm-dialog-overlay" 
      onClick={handleBackdropClick} 
      data-testid="confirm-dialog-overlay"
    >
      <div 
        className="confirm-dialog" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby={`${id}-title`} 
        aria-describedby={`${id}-description`}
        id={id}
      >
        <div className="confirm-dialog__header">
          <h3 id={`${id}-title`} className="confirm-dialog__title">
            {title}
          </h3>
          <button 
            className="confirm-dialog__close"
            onClick={onCancel}
            aria-label="Cerrar diálogo"
            type="button"
          >
            ×
          </button>
        </div>
        
        <div className="confirm-dialog__body">
          <div id={`${id}-description`} className="confirm-dialog__message">
            {message}
          </div>
        </div>
        
        <div className="confirm-dialog__footer">
          <button 
            ref={cancelButtonRef}
            className="confirm-dialog__button confirm-dialog__button--cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button 
            ref={confirmButtonRef}
            className={`confirm-dialog__button confirm-dialog__button--confirm confirm-dialog__button--${confirmVariant}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
  
  return ReactDOM.createPortal(dialogContent, document.body);
};

export default ConfirmDialog;
