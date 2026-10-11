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
    { id: 'live', label: 'Modo Show', icon: Radio },
    { id: 'mixer', label: 'Mixer de Stems', icon: Sliders },
    { id: 'editor', label: 'Cifras & LRC', icon: FileText },
    { id: 'setlists', label: 'Repertório', icon: ListMusic },
    { id: 'shows', label: 'Agenda & Ensaios', icon: Calendar },
  ];

  return (
    <header className="h-14 bg-white border-b border-stage-border px-4 flex items-center justify-between select-none">
      {/* Brand & Live Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <img
              src={logoImg}
              alt="StageDeck Logo"
              className="w-9 h-9 rounded-lg object-cover border border-stage-border shadow-sm"
            />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-stage-green border-2 border-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[15px] leading-none text-stage-text">
              Stage<span className="text-stage-accent">Deck</span>
            </span>
            <span className="text-[10px] text-stage-muted font-medium mt-0.5">
              Sistema ao vivo
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs (segmented control) */}
      <nav className="flex items-center gap-0.5 bg-stage-panel rounded-full p-1" aria-label="Navegação principal">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-white text-stage-text shadow-sm'
                  : 'text-stage-muted hover:text-stage-text'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-stage-accent' : 'text-stage-muted'} />
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
          className="flex items-center gap-2 bg-white hover:bg-stage-accentTint border border-stage-border hover:border-stage-accent text-[13px] font-medium px-3 py-1.5 rounded-full transition-colors text-stage-text"
          title="Conectar celular de palco via QR Code"
        >
          <QrCode size={15} className="text-stage-accent" />
          <span>Palco</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            stageConnectedCount > 0
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-stage-surface text-stage-muted border border-stage-border'
          }`}>
            {stageConnectedCount} {stageConnectedCount === 1 ? 'celular' : 'celulares'}
          </span>
        </button>

        {/* Master Output Section */}
        <div className="flex items-center gap-2 pl-4 border-l border-stage-border">
          <button
            onClick={onToggleMasterMute}
            aria-label={isMasterMuted ? 'Desmutar Saída Master' : 'Corte Rápido Master (Pânico)'}
            className={`p-1.5 rounded-full text-[13px] font-semibold transition-colors ${
              isMasterMuted
                ? 'bg-stage-red text-white'
                : 'bg-white text-stage-muted border border-stage-border hover:text-stage-text hover:bg-stage-panel'
            }`}
            title={isMasterMuted ? 'Desmutar Saída Master' : 'Corte Rápido Master (Pânico)'}
          >
            {isMasterMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-stage-muted">Master</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMasterMuted ? 0 : masterVolume}
              onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
              className="w-20 fader-slider"
              aria-label="Volume master"
              title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
            />
            <span className="text-[11px] font-semibold text-stage-accent w-9 text-right tabular-nums">
              {isMasterMuted ? 'Mudo' : `${Math.round(masterVolume * 100)}%`}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
