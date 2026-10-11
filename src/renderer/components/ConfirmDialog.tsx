import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Apple-style alert for destructive or irreversible actions.
 * Replaces native confirm() with a real AlertDialog: modal, focused,
 * Escape to cancel, Enter to confirm.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  onConfirm,
  onCancel
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus the cancel button (the safe action) so Enter won't destroy data
    requestAnimationFrame(() => cancelButtonRef.current?.focus());
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60] select-none"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white border border-stage-border rounded-stage p-6 w-full max-w-sm shadow-2xl flex flex-col gap-2 items-center text-center"
      >
        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-stage-red mb-1">
          <AlertTriangle size={20} />
        </div>

        <h3 className="text-[15px] font-semibold text-stage-text">{title}</h3>
        {message && <p className="text-[13px] text-stage-muted leading-relaxed">{message}</p>}

        <div className="flex items-center gap-2 w-full mt-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-full bg-stage-panel hover:bg-stage-surface border border-stage-border text-[13px] font-semibold text-stage-text transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-full text-[13px] font-semibold text-white transition-colors ${
              destructive
                ? 'bg-stage-red hover:bg-red-700'
                : 'bg-stage-accent hover:bg-stage-accentHover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
