import http from 'http';
import { WebSocket } from 'ws';
import { StageLocalServer } from '../dist-electron/main/stageServer.js';
import {
  parseLyricsChordsLrc,
  transposeChord,
  transposeChordLine,
  serializeLyricsToLrc,
  exportToTTML
} from '../src/renderer/utils/lyricsParser.ts';

async function runTests() {
  console.log('--- [STAGE DECK SYSTEM VERIFICATION] ---\n');

  // Test 1: Chord Transposition & Parser
  console.log('1. Testando Motor Musical (Transposição de Cifras e Parser LRC):');
  const chordTest1 = transposeChord('C', 2);
  const chordTest2 = transposeChord('Am7', 2);
  const chordTest3 = transposeChord('D/F#', 2);
  const chordTest4 = transposeChord('Bb', -1);
  console.log(`   Transposição C + 2 semitons = ${chordTest1} (Esperado: D)`);
  console.log(`   Transposição Am7 + 2 semitons = ${chordTest2} (Esperado: Bm7)`);
  console.log(`   Transposição D/F# + 2 semitons = ${chordTest3} (Esperado: E/G#)`);
  console.log(`   Transposição Bb - 1 semitom = ${chordTest4} (Esperado: A)`);

  if (chordTest1 !== 'D' || chordTest2 !== 'Bm7' || chordTest3 !== 'E/G#' || chordTest4 !== 'A') {
    throw new Error('Falha no teste de transposição de acordes!');
  }
  console.log('   [SUCESSO] Transposição de cifras validada.\n');

  // Test 2: LRC Parser & Serializer
  console.log('2. Testando Parser e Serializador LRC:');
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
  if (httpRes.statusCode !== 200 || !httpRes.body.includes('StageDeck - Visor de Palco')) {
    throw new Error('Falha ao servir HTML do visor de palco!');
  }
  console.log('   [SUCESSO] HTML de palco servido com sucesso.');

  // Test QR Code Generation
  const qrResults = await server.getStageUrlAndQr();
  console.log(`   URLs de rede detectadas: ${qrResults.length}`);
  console.log(`   URL Primária: ${qrResults[0].url}`);
  if (!qrResults[0].qrDataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Falha na geração do QR Code!');
  }
  console.log('   [SUCESSO] QR Code para conexão de celular gerado com sucesso.');

  // Test WebSocket Client Connection & Live Sync Broadcast
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
          currentKey: 'G',
          bpm: 128,
          parsedLyrics: parsed
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
  console.log('   [SUCESSO] WebSocket de palco com teleprompter e alertas em tempo real validado.\n');

  wsClient.close();
  server.stop();
  console.log('--- TODOS OS TESTES PASSARAM COM SUCESSO! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
