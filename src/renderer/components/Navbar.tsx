import React from 'react';
import { Volume2, VolumeX, QrCode, Radio, Sliders, Music, FileText, ListMusic, Calendar } from 'lucide-react';
import logoImg from '../assets/logo.png';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  masterVolume: number;
  isMasterMuted: boolean;
  onMasterVolumeChange: (vol: number) => void;
  onToggleMasterMute: () => void;
  stageConnectedCount: number;
  onOpenQrModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  masterVolume,
  isMasterMuted,
  onMasterVolumeChange,
  onToggleMasterMute,
  stageConnectedCount,
  onOpenQrModal
}) => {
  const tabs = [
    { id: 'live', label: 'Modo Show / Ao Vivo', icon: Radio },
    { id: 'mixer', label: 'Mixer de Stems', icon: Sliders },
    { id: 'editor', label: 'Editor de Cifras & LRC', icon: FileText },
    { id: 'setlists', label: 'Repertório & Setlists', icon: ListMusic },
    { id: 'shows', label: 'Agenda & Ensaios', icon: Calendar },
  ];

  return (
    <header className="h-14 bg-stage-panel border-b border-stage-border px-4 flex items-center justify-between select-none">
      {/* Brand & Live Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <img
              src={logoImg}
              alt="StageDeck Logo"
              className="w-9 h-9 rounded-lg object-cover border border-stage-border shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-cyan-500/20"
            />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-stage-amber border-2 border-stage-panel shadow-[0_0_8px_#F59E0B] animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold tracking-wider text-base leading-none text-white font-mono">
              STAGE<span className="text-stage-amber">DECK</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-cyan-400 font-bold uppercase mt-0.5">
              LIVE SYSTEM
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-stage-card text-stage-muted px-2 py-0.5 rounded border border-stage-border">
          PRO CONSOLE
        </span>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-stage-surface text-white border border-stage-borderLight shadow-sm'
                  : 'text-stage-muted hover:text-white hover:bg-stage-card'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-stage-amber' : 'text-stage-muted'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Controls: QR Code, Stage Devices, Master Fader */}
      <div className="flex items-center gap-4">
        {/* Stage Phone Connect Button */}
        <button
          onClick={onOpenQrModal}
          className="flex items-center gap-2 bg-stage-card hover:bg-stage-surface border border-stage-border hover:border-stage-borderLight text-xs font-semibold px-3 py-1.5 rounded-md transition-all text-white"
          title="Conectar celular de palco via QR Code"
        >
          <QrCode size={15} className="text-stage-amber" />
          <span>Palco</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
            stageConnectedCount > 0
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-zinc-800 text-zinc-400'
          }`}>
            {stageConnectedCount} {stageConnectedCount === 1 ? 'celular' : 'celulares'}
          </span>
        </button>

        {/* Master Output Section */}
        <div className="flex items-center gap-2 pl-2 border-l border-stage-border">
          <button
            onClick={onToggleMasterMute}
            className={`p-1.5 rounded text-xs font-bold transition-all ${
              isMasterMuted
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-stage-card text-stage-muted hover:text-white hover:bg-stage-surface'
            }`}
            title={isMasterMuted ? 'Desmutar Saída Master' : 'Corte Rápido Master (Pânico)'}
          >
            {isMasterMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-stage-muted">MASTER</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMasterMuted ? 0 : masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-20 fader-slider"
              title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
            />
            <span className="text-[10px] font-mono font-bold text-stage-amber w-7 text-right">
              {isMasterMuted ? 'MUTE' : `${Math.round(masterVolume * 100)}%`}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
