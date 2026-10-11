import React, { useState } from 'react';
import { X, QrCode, Smartphone, Wifi, Copy, Check, ExternalLink } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: { url: string; qrDataUrl: string }[];
  connectedCount: number;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  addresses,
  connectedCount
}) => {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const primary = addresses[0] || {
    url: 'http://localhost:5050/stage',
    qrDataUrl: ''
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white border border-stage-border rounded-stage p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stage-border">
          <div className="flex items-center gap-3">
            <img
              src={logoImg}
              alt="StageDeck"
              className="w-10 h-10 rounded-xl object-cover border border-stage-border shadow-sm"
            />
            <div>
              <h3 className="text-[15px] font-semibold text-stage-text">
                Conectar Celular / Tablet de Palco
              </h3>
              <p className="text-xs text-stage-muted">
                100% offline — sem precisar de internet ou instalar aplicativos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar janela de conexão"
            className="p-1.5 rounded-full text-stage-muted hover:text-stage-text hover:bg-stage-panel transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code and URL display */}
        <div className="flex flex-col items-center justify-center gap-4 bg-stage-panel p-5 rounded-stage border border-stage-border">
          {primary.qrDataUrl ? (
            <div className="bg-white p-3 rounded-2xl border border-stage-border shadow-sm">
              <img
                src={primary.qrDataUrl}
                alt="QR Code de Conexão do Palco"
                className="w-48 h-48 block"
              />
            </div>
          ) : (
            <div className="w-48 h-48 bg-white rounded-2xl border border-stage-border flex items-center justify-center text-stage-faint">
              <QrCode size={64} />
            </div>
          )}

          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[11px] font-medium text-stage-muted uppercase">
              Endereço na Rede Local:
            </span>
            <div className="flex items-center gap-2 w-full justify-center">
              <code className="bg-white border border-stage-border px-3 py-1.5 rounded-full text-[13px] font-semibold text-stage-text tabular-nums truncate max-w-[280px]">
                {primary.url}
              </code>
              <button
                onClick={() => handleCopy(primary.url)}
                aria-label="Copiar URL"
                className="p-1.5 rounded-full bg-white hover:bg-stage-accentTint border border-stage-border hover:border-stage-accent text-stage-text transition-colors"
                title="Copiar URL"
              >
                {copiedUrl === primary.url ? (
                  <Check size={16} className="text-stage-green" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
              <a
                href={primary.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir no navegador"
                className="p-1.5 rounded-full bg-white hover:bg-stage-accentTint border border-stage-border hover:border-stage-accent text-stage-accent transition-colors"
                title="Abrir no navegador"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-[13px] text-stage-muted bg-stage-panel p-3.5 rounded-stage border border-stage-border">
          <div className="flex items-start gap-2">
            <Wifi size={14} className="text-stage-accent mt-0.5 flex-shrink-0" />
            <span>
              Certifique-se de que o celular está no <strong className="text-stage-text">mesmo Wi-Fi</strong> do computador (ou no Ponto de Acesso / Roteador 4G de um dos celulares).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Smartphone size={14} className="text-stage-cyan mt-0.5 flex-shrink-0" />
            <span>
              Aponte a câmera do celular para escanear o QR Code. A tela possui <strong className="text-stage-text">WakeLock automático</strong> (não apaga durante o show).
            </span>
          </div>
        </div>

        {/* Footer Status */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              connectedCount > 0 ? 'bg-stage-green' : 'bg-stage-borderLight'
            }`} />
            <span className="text-[13px] font-medium text-stage-text tabular-nums">
              {connectedCount} dispositivo(s) conectado(s) ao vivo
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold text-[13px] transition-colors"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
