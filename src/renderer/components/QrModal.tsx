import React, { useState } from 'react';
import { X, QrCode, Smartphone, Wifi, Copy, Check, ExternalLink } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-stage-panel border border-stage-border rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stage-border">
          <div className="flex items-center gap-2.5">
            <Smartphone size={20} className="text-stage-amber" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                Conectar Celular / Tablet de Palco
              </h3>
              <p className="text-[11px] text-stage-muted">
                100% offline — sem precisar de internet ou instalar aplicativos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stage-muted hover:text-white hover:bg-stage-card"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR Code and URL display */}
        <div className="flex flex-col items-center justify-center gap-4 bg-stage-bg p-5 rounded-xl border border-stage-border">
          {primary.qrDataUrl ? (
            <div className="bg-white p-3 rounded-xl shadow-lg">
              <img
                src={primary.qrDataUrl}
                alt="QR Code de Conexão do Palco"
                className="w-48 h-48 block"
              />
            </div>
          ) : (
            <div className="w-48 h-48 bg-stage-card rounded-xl flex items-center justify-center text-stage-muted">
              <QrCode size={64} className="text-stage-borderLight" />
            </div>
          )}

          <div className="w-full flex flex-col items-center gap-2">
            <span className="text-[11px] font-bold text-stage-muted uppercase tracking-wider">
              Endereço na Rede Local:
            </span>
            <div className="flex items-center gap-2 w-full justify-center">
              <code className="bg-stage-card border border-stage-borderLight px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-stage-amber truncate max-w-[280px]">
                {primary.url}
              </code>
              <button
                onClick={() => handleCopy(primary.url)}
                className="p-1.5 rounded-lg bg-stage-surface hover:bg-stage-card border border-stage-border text-white transition-all"
                title="Copiar URL"
              >
                {copiedUrl === primary.url ? (
                  <Check size={16} className="text-emerald-400" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
              <a
                href={primary.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg bg-stage-surface hover:bg-stage-card border border-stage-border text-cyan-400 transition-all"
                title="Abrir no navegador"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 text-xs text-stage-muted bg-stage-card p-3.5 rounded-xl border border-stage-border">
          <div className="flex items-start gap-2">
            <Wifi size={14} className="text-stage-amber mt-0.5 flex-shrink-0" />
            <span>
              Certifique-se de que o celular está no <strong>mesmo Wi-Fi</strong> do computador (ou no Ponto de Acesso / Roteador 4G de um dos celulares).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Smartphone size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <span>
              Aponte a câmera do celular para escanear o QR Code. A tela possui <strong>WakeLock automático</strong> (não apaga durante o show).
            </span>
          </div>
        </div>

        {/* Footer Status */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              connectedCount > 0 ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-zinc-600'
            }`} />
            <span className="text-xs font-semibold text-white">
              {connectedCount} dispositivo(s) conectado(s) ao vivo
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stage-amber hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
