import http from 'http';
import { WebSocket } from 'ws';
import { StageLocalServer } from '../dist-electron/main/stageServer.js';
import {
  parseLyricsChordsLrc,
  serializeLyricsToLrc,
  exportToTTML
} from '../src/renderer/utils/lyricsParser.ts';
import { formatDurationInput, parseDurationInput } from '../src/renderer/utils/time.ts';
import { INITIAL_DEMO_SONG } from '../src/renderer/mockData.ts';

async function runTests() {
  console.log('--- [STAGE DECK SYSTEM VERIFICATION] ---\n');

  // Test 1: LRC Parser & Serializer
  console.log('1. Testando Parser e Serializador LRC:');
  const sampleLrc = `[00:15.50] G    D/F# | Linha de teste de letra
[00:25.00] Em   C    | Segunda estrofe sincronizada`;
  const parsed = parseLyricsChordsLrc(sampleLrc);
  console.log(`   Linhas parseadas: ${parsed.length}`);
  console.log(`   Linha 0: ${parsed[0].time}s | Cifras: "${parsed[0].chords}" | Texto: "${parsed[0].text}"`);
  console.log(`   Linha 1: ${parsed[1].time}s | Cifras: "${parsed[1].chords}" | Texto: "${parsed[1].text}"`);

  if (parsed.length !== 2 || parsed[0].time !== 15.5 || parsed[1].time !== 25) {
    throw new Error('Falha no parser de LRC!');
  }

  const serialized = serializeLyricsToLrc(parsed);
  console.log(`   Serializado de volta: \n${serialized}`);

  const ttml = exportToTTML('Minha Música', parsed);
  if (!ttml.includes('<tt') || !ttml.includes('00:00:15.500')) {
    throw new Error('Falha na geração de TTML!');
  }
  console.log('   [SUCESSO] Parser LRC e gerador TTML validados.\n');

  // Test 1b: LRC enhanced (karaokê palavra a palavra)
  console.log('1b. Testando LRC enhanced (karaokê palavra a palavra):');
  const enhancedLrc = `[00:12.82] G | <00:12.82>What's <00:13.42>the <00:13.72>matter`;
  const enhancedParsed = parseLyricsChordsLrc(enhancedLrc);
  if (!enhancedParsed[0].words || enhancedParsed[0].words.length !== 3) {
    throw new Error('Falha no parse de LRC enhanced (words)!');
  }
  const enhancedSerialized = serializeLyricsToLrc(enhancedParsed);
  if (enhancedSerialized !== enhancedLrc) {
    throw new Error(`Falha no round-trip de LRC enhanced! Recebido: ${enhancedSerialized}`);
  }
  console.log('   Words: ' + enhancedParsed[0].words.map((w) => `${w.text}@${w.time}s`).join(', '));
  console.log('   [SUCESSO] LRC enhanced round-trip validado.\n');

  // Test 2: Editar Música — utilitários de duração e modelo
  console.log('2. Testando Utilitários de Duração e Modelo da Música (Edição):');

  if (formatDurationInput(180) !== '03:00' || formatDurationInput(95) !== '01:35' || formatDurationInput(0) !== '00:00') {
    throw new Error('Falha na formatação de duração (mm:ss)!');
  }
  console.log('   formatDurationInput: 180s → "03:00", 95s → "01:35", 0s → "00:00"');

  if (parseDurationInput('03:00') !== 180 || parseDurationInput('01:35') !== 95 || parseDurationInput('200') !== 200 || parseDurationInput('') !== 180) {
    throw new Error('Falha no parsing de duração (mm:ss)!');
  }
  console.log('   parseDurationInput: "03:00" → 180s, "01:35" → 95s, "200" → 200s, "" → 180s (fallback)');

  if (INITIAL_DEMO_SONG.notes !== undefined) {
    throw new Error('Falha: campo "notes" deveria ter sido removido do modelo de música!');
  }
  console.log('   Modelo da música sem campo "notes" validado.');
  console.log('   [SUCESSO] Utilitários de duração e modelo de música validados.\n');

  // Test 3: Local Stage Server (HTTP + WebSocket)
  console.log('3. Testando Servidor de Palco Local (HTTP + WebSocket na porta 5052):');
  const server = new StageLocalServer(5052);
  await server.start();
  console.log('   Servidor de palco iniciado com sucesso na porta 5052.');

  // Test HTTP GET /stage
  const httpRes = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:5052/stage', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });

  console.log(`   HTTP GET /stage status: ${httpRes.statusCode}`);
  if (httpRes.statusCode !== 200 || !httpRes.body.includes('Visor de Palco')) {
    throw new Error('Falha ao servir HTML do visor de palco!');
  }
  // UI nova (identidade do app) + karaokê palavra a palavra
  const jsRes = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:5052/stage/stage.js', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
  const cssRes = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:5052/stage/stage.css', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
  if (!jsRes.body.includes('updateActiveWord') || !jsRes.body.includes('class="word"')) {
    throw new Error('Falha: stage.js sem karaokê palavra a palavra!');
  }
  if (!cssRes.body.includes('.word.active') || !cssRes.body.includes('#155BD0')) {
    throw new Error('Falha: stage.css sem a identidade/karaokê novos!');
  }
  console.log('   [SUCESSO] HTML de palco servido com UI nova e karaokê palavra a palavra.');

  // Test QR Code Generation
  const qrResults = await server.getStageUrlAndQr();
  console.log(`   URLs de rede detectadas: ${qrResults.length}`);
  console.log(`   URL Primária: ${qrResults[0].url}`);
  if (!qrResults[0].qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Falha na geração do QR Code!');
  }
  console.log('   [SUCESSO] QR Code para conexão de celular gerado com sucesso.');

  // Test 4: WebSocket Client Connection & Live Sync Broadcast
  console.log('4. Testando Conexão WebSocket em Tempo Real:');
  const wsClient = new WebSocket('ws://127.0.0.1:5052');

  const receivedMessages = [];
  await new Promise((resolve, reject) => {
    wsClient.on('open', () => {
      console.log('   Cliente móvel de teste conectado via WebSocket.');
      // Broadcast state
      server.broadcast({
        type: 'SYNC',
        isPlaying: true,
        currentTime: 15.5,
        duration: 180,
        currentSong: {
          id: 'test-1',
          title: 'Música de Teste Ao Vivo',
          artist: 'Banda StageDeck',
          bpm: 128,
          parsedLyrics: enhancedParsed
        },
        alert: {
          id: 'alert-1',
          message: 'REPETIR REFRÃO!',
          type: 'urgent',
          timestamp: Date.now()
        }
      });
    });

    wsClient.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      receivedMessages.push(msg);
      console.log(`   Mensagem recebida no celular do palco: tipo=${msg.type}, música="${msg.currentSong?.title}", alerta="${msg.alert?.message}"`);
      resolve();
    });

    wsClient.on('error', reject);
    setTimeout(() => reject(new Error('Timeout aguardando mensagem WebSocket')), 3000);
  });

  if (receivedMessages.length === 0 || receivedMessages[0].alert?.message !== 'REPETIR REFRÃO!') {
    throw new Error('Falha na recepção do alerta via WebSocket!');
  }
  const receivedWords = receivedMessages[0].currentSong?.parsedLyrics?.[0]?.words;
  if (!receivedWords || receivedWords.length !== 3) {
    throw new Error('Falha: timing por palavra não trafegou no sync do palco!');
  }
  console.log('   [SUCESSO] WebSocket com karaokê palavra a palavra e alertas em tempo real validado.\n');

  wsClient.close();
  server.stop();
  console.log('--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
