import React, { useEffect } from 'react';
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
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
  onCancel
}) => {
  // Manejar tecla Escape
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
    <div className="confirm-dialog-overlay" onClick={handleBackdropClick}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="confirm-dialog__header">
          <h3 id="dialog-title" className="confirm-dialog__title">
            {title}
          </h3>
          <button 
            className="confirm-dialog__close"
            onClick={onCancel}
            aria-label="Cerrar diálogo"
          >
            ×
          </button>
        </div>
        
        <div className="confirm-dialog__body">
          <div className="confirm-dialog__message">
            {message}
          </div>
        </div>
        
        <div className="confirm-dialog__footer">
          <button 
            className="confirm-dialog__button confirm-dialog__button--cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-dialog__button confirm-dialog__button--confirm confirm-dialog__button--${confirmVariant}`}
            onClick={onConfirm}
            type="button"
            autoFocus
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
