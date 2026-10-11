<div align="center">

# StageDeck

**Estação de controle para shows ao vivo, ensaios, mixer multitrack e sincronizador de palco.**

[![CI](https://github.com/xxyurirangelxx/stagedeck/actions/workflows/ci.yml/badge.svg)](https://github.com/xxyurirangelxx/stagedeck/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-blue.svg)](LICENSE)

</div>

StageDeck é um aplicativo desktop (Electron) que funciona como o console da banda: carrega as **stems** de cada música, controla a reprodução ao vivo, monta **setlists**, exibe **cifras e letras sincronizadas** e projeta tudo em tempo real no celular de cada músico pela rede local — com QR Code, sem internet.

## Recursos

- **Console ao vivo** — play/pause/stop, faixa anterior/próxima, scrubber, auto-stop no fim da música e troca rápida de música por busca ou setlist.
- **Mixer de palco multitrack** — até 8 stems de backing + 2 de in-ear por música, com volume, mute, solo, medidores VU e roteamento **L (PA) / R (in-ear)** por canal.
- **Cifras & letras sincronizadas** — editor LRC com *Tap to Sync*, ajuste fino de tempos (±0.1s), importação/exportação de `.LRC` e exportação broadcast `.TTML`, com teleprompter de auto-scroll.
- **Setlists e repertório** — catálogo de músicas com cadastro e edição (título, artista, BPM, duração), montagem da ordem do show e duração estimada do set.
- **Shows e ensaios** — agenda com tipo (show/ensaio), local, notas e setlist vinculada.
- **Visor de palco mobile** — o app serve uma página local e gera um QR Code; cada músico acompanha música atual, BPM, tempo, letra/cifra rolando e alertas em tempo real via WebSocket.
- **Alertas de palco** — mensagens instantâneas (informativo/atenção/urgente) com auto-limpeza para avisar "repete o refrão", mudanças de arranjo etc.
- **Persistência local** — catálogo e setlists em disco/localStorage; áudio das stems em IndexedDB, restaurado automaticamente.

## Stack

| Camada | Tecnologia |
|---|---|
| Shell | Electron 35 |
| UI | React 19 + TypeScript + Tailwind CSS |
| Build | Vite 7 |
| Áudio | Web Audio API (grafo de ganho, roteamento L/R, análise VU) |
| Sync | WebSocket (`ws`) + servidor HTTP/QR local |
| Testes | Vitest + Testing Library (jsdom) e smoke test end-to-end |

## Pré-requisitos

- **Node.js 20+** (recomendado 22)
- npm

## Como rodar

```bash
npm install
npm run dev        # Vite (localhost:5173) + Electron em paralelo
```

## Testes

```bash
npm test           # suíte Vitest (store, editor de músicas, parser)
npm run test:watch # modo watch

npx tsx test/verify_stagedeck.js   # smoke test: parser LRC/TTML, servidor de palco, QR e WebSocket
```

## Build e distribuição

```bash
npm run build      # build do renderer (Vite) + compilação do Electron (tsc)
npm run dist       # instalador Windows (NSIS) via electron-builder
npm run dist:dir   # build empacotado sem instalador
```

Os instaladores são gerados em `release/` (fora do controle de versão). Para distribuir binários, use as **GitHub Releases**.

## Estrutura do projeto

```
src/
├── main/        Processo principal do Electron + servidor de palco (HTTP/WS/QR)
├── renderer/    Interface (React): componentes, store, engine de áudio, parser LRC/TTML
│   └── audio/   Web Audio API + armazenamento IndexedDB das stems
├── shared/      Tipos compartilhados (Song, Setlist, Show, StageSyncPayload...)
└── test/        Setup do Vitest
test/            Smoke test end-to-end
```

## Licença

Distribuído sob a [Licença MIT](LICENSE).
