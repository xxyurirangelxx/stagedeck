import React, { useState } from 'react';
import { Send, AlertTriangle, XCircle, BellRing, Repeat, Scissors, Music2, TriangleAlert, Volume1, SkipForward } from 'lucide-react';
import { StageAlert } from '../../shared/types';

interface StageAlertsPanelProps {
  activeAlert: StageAlert | null;
  stageConnectedCount: number;
  onSendAlert: (msg: string, type?: 'info' | 'warning' | 'urgent') => void;
  onClearAlert: () => void;
}

export const StageAlertsPanel: React.FC<StageAlertsPanelProps> = ({
  activeAlert,
  stageConnectedCount,
  onSendAlert,
  onClearAlert
}) => {
  const [customText, setCustomText] = useState('');

  const alertPresets = [
    { label: 'Repetir Refrão', msg: 'REPETIR REFRÃO!', type: 'warning' as const, icon: Repeat },
    { label: 'Corte Seco', msg: 'CORTE SECO NO FINAL!', type: 'urgent' as const, icon: Scissors },
    { label: 'Solo +1 Volta', msg: 'SOLO +1 VOLTA!', type: 'info' as const, icon: Music2 },
    { label: 'Atenção Final', msg: 'ATENÇÃO NO FINAL DA MÚSICA!', type: 'warning' as const, icon: TriangleAlert },
    { label: 'Diminuir Volume', msg: 'DIMINUIR VOLUME DO PALCO!', type: 'warning' as const, icon: Volume1 },
    { label: 'Próxima Direto', msg: 'EMENDAR PRÓXIMA MÚSICA DIRETO!', type: 'info' as const, icon: SkipForward },
  ];

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onSendAlert(customText.trim(), 'urgent');
    setCustomText('');
  };

  return (
    <div className="bg-stage-panel rounded-stage p-3 flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing size={15} className="text-stage-accent" />
          <h3 className="text-[13px] font-semibold text-stage-text">
            Avisos de Palco
          </h3>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
          stageConnectedCount > 0
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-white text-stage-muted border-stage-border'
        }`}>
          {stageConnectedCount > 0 ? `${stageConnectedCount} conectado(s)` : 'Nenhum celular'}
        </span>
      </div>

      {/* Active Alert Banner */}
      {activeAlert && (
        <div className="bg-red-50 border border-red-300 rounded-2xl p-2.5 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-stage-red flex-shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-stage-red block uppercase">Alerta ativo no palco:</span>
              <span className="text-[13px] font-semibold text-stage-text">{activeAlert.message}</span>
            </div>
          </div>
          <button
            onClick={onClearAlert}
            aria-label="Cancelar alerta"
            className="p-1 rounded-full hover:bg-red-100 text-stage-red transition-colors"
            title="Cancelar Alerta"
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Quick Alert Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {alertPresets.map((preset, idx) => {
          const Icon = preset.icon;
          return (
            <button
              key={idx}
              onClick={() => onSendAlert(preset.msg, preset.type)}
              className="px-2.5 py-1.5 rounded-full bg-white hover:bg-stage-accentTint border border-stage-border hover:border-stage-accent text-[11px] font-medium text-stage-text transition-colors text-left truncate flex items-center gap-1.5"
              title={`Enviar aviso: "${preset.msg}"`}
            >
              <Icon size={12} className="text-stage-muted flex-shrink-0" />
              <span className="truncate">{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Message Input */}
      <form onSubmit={handleSendCustom} className="flex gap-2 mt-1">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Digitar aviso personalizado para o palco..."
          className="flex-1 bg-white border border-stage-border focus:border-stage-accent rounded-full px-3.5 py-1.5 text-[13px] text-stage-text placeholder-stage-faint outline-none"
          aria-label="Aviso personalizado"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-full bg-stage-accent hover:bg-stage-accentHover text-white font-semibold text-[13px] flex items-center gap-1.5 transition-colors"
        >
          <Send size={13} />
          <span>Enviar</span>
        </button>
      </form>
    </div>
  );
};
