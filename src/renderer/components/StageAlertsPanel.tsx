import React, { useState } from 'react';
import { Send, AlertTriangle, XCircle, BellRing } from 'lucide-react';
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
    { label: '🔁 REPETIR REFRÃO', msg: 'REPETIR REFRÃO!', type: 'warning' as const },
    { label: '✂️ CORTE SECO', msg: 'CORTE SECO NO FINAL!', type: 'urgent' as const },
    { label: '🎸 SOLO +1 VOLTA', msg: 'SOLO +1 VOLTA!', type: 'info' as const },
    { label: '⚠️ ATENÇÃO FINAL', msg: 'ATENÇÃO NO FINAL DA MÚSICA!', type: 'warning' as const },
    { label: '🔉 DIMINUIR VOLUME', msg: 'DIMINUIR VOLUME DO PALCO!', type: 'warning' as const },
    { label: '⏩ PRÓXIMA DIRETO', msg: 'EMENDAR PRÓXIMA MÚSICA DIRETO!', type: 'info' as const },
  ];

  const handleSendCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    onSendAlert(customText.trim(), 'urgent');
    setCustomText('');
  };

  return (
    <div className="bg-stage-panel border border-stage-border rounded-xl p-3 flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BellRing size={16} className="text-stage-amber" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Avisos de Palco em Tempo Real
          </h3>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          stageConnectedCount > 0
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-zinc-800 text-zinc-500'
        }`}>
          {stageConnectedCount > 0 ? `${stageConnectedCount} conectado(s)` : 'Nenhum celular conectado'}
        </span>
      </div>

      {/* Active Alert Banner */}
      {activeAlert && (
        <div className="bg-red-500/20 border-2 border-red-500/80 rounded-lg p-2.5 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-red-300 block uppercase">Alerta Ativo no Palco:</span>
              <span className="text-sm font-black text-white">{activeAlert.message}</span>
            </div>
          </div>
          <button
            onClick={onClearAlert}
            className="p-1 rounded hover:bg-red-500/40 text-red-300 hover:text-white transition-all"
            title="Cancelar Alerta"
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Quick Alert Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {alertPresets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onSendAlert(preset.msg, preset.type)}
            className="px-2.5 py-1.5 rounded-md bg-stage-card hover:bg-stage-surface border border-stage-border hover:border-stage-borderLight text-xs font-bold text-stage-text hover:text-white transition-all text-left truncate active:scale-95"
            title={`Enviar aviso: "${preset.msg}"`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Message Input */}
      <form onSubmit={handleSendCustom} className="flex gap-2 mt-1">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Digitar aviso personalizado para o palco..."
          className="flex-1 bg-stage-bg border border-stage-border focus:border-stage-amber rounded-md px-3 py-1.5 text-xs text-white placeholder-stage-muted outline-none"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-md bg-stage-amber hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
        >
          <Send size={13} />
          <span>Enviar</span>
        </button>
      </form>
    </div>
  );
};
