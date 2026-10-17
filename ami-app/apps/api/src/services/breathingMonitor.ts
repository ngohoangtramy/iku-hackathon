import {
  SmartSpectraSDK,
  FrameTransform,
  PixelFormat,
  breathingMetrics,
  decodeMetrics,
} from '@smartspectra/node-sdk';
import jpeg from 'jpeg-js';
import { randomUUID } from 'crypto';
import { IncomingMessage, Server } from 'http';
import { Duplex } from 'stream';
import { WebSocket, WebSocketServer, RawData } from 'ws';

const ROUTE = '/api/v1/ai-call/breathing';
const TOKEN_PROTOCOL = 'ami-breathing';
const RUN_SECONDS = 90;
const FLAG_AT_OR_ABOVE = 30;
const MIN_SAMPLES = 5;
const MAX_FRAME_BYTES = 750_000;
const MAX_FRAME_WIDTH = 1280;
const MAX_FRAME_HEIGHT = 720;
const MAX_CONCURRENT_MONITORS = 1;
const MAX_FRAMES_PER_SECOND = 20;
const TICKET_TTL_MS = 30_000;
const monitorTickets = new Map<string, { userId: string; expiresAt: number }>();

interface BreathingMetric {
  breathing?: {
    rate?: Array<{ value?: number; timestamp?: number | string | bigint }>;
  };
}

interface Monitor {
  socket: WebSocket;
  sdk?: SmartSpectraSDK;
  timer?: NodeJS.Timeout;
  consentTimer?: NodeJS.Timeout;
  finished: boolean;
  stopPromise?: Promise<void>;
  lastValidationHint?: string;
  sampleTimestamps: Set<string>;
  rates: number[];
}

function readRates(value: unknown): Array<{ value: number; timestamp: string }> {
  const metrics = value as BreathingMetric | null;
  const rates = metrics?.breathing?.rate;
  if (!Array.isArray(rates)) return [];

  return rates.flatMap((sample) => {
    if (typeof sample?.value !== 'number' || !Number.isFinite(sample.value) || sample.timestamp == null) {
      return [];
    }
    return [{ value: sample.value, timestamp: String(sample.timestamp) }];
  });
}

function rawDataToBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

function send(socket: WebSocket, message: Record<string, unknown>): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function stopMonitor(monitor: Monitor): Promise<void> {
  if (monitor.stopPromise) return monitor.stopPromise;
  monitor.finished = true;
  if (monitor.timer) clearTimeout(monitor.timer);
  if (monitor.consentTimer) clearTimeout(monitor.consentTimer);

  const sdk = monitor.sdk;
  monitor.sdk = undefined;
  monitor.stopPromise = (async () => {
    if (sdk) {
      try {
        await sdk.stopAsync();
      } catch (error) {
        console.error('[BREATHING] SmartSpectra stop failed:', error);
      }
      try {
        await sdk.destroy();
      } catch (error) {
        console.error('[BREATHING] SmartSpectra cleanup failed:', error);
      }
    }
  })();
  return monitor.stopPromise;
}

function rejectUpgrade(socket: Duplex, status: number, message: string): void {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

function getTicket(request: IncomingMessage): string | null {
  const protocols = request.headers['sec-websocket-protocol']
    ?.split(',')
    .map((protocol) => protocol.trim());
  const token = protocols?.find((protocol) => protocol !== TOKEN_PROTOCOL);
  return token && protocols?.includes(TOKEN_PROTOCOL) ? token : null;
}

export function createBreathingMonitorTicket(userId: string): string {
  const ticket = randomUUID();
  const expiresAt = Date.now() + TICKET_TTL_MS;
  monitorTickets.set(ticket, { userId, expiresAt });
  const expiryTimer = setTimeout(() => {
    if (monitorTickets.get(ticket)?.expiresAt === expiresAt) monitorTickets.delete(ticket);
  }, TICKET_TTL_MS);
  expiryTimer.unref();
  return ticket;
}

function consumeBreathingMonitorTicket(ticket: string): string | null {
  const entry = monitorTickets.get(ticket);
  monitorTickets.delete(ticket);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.userId;
}

function readFrame(data: RawData): { width: number; height: number; timestampUs: number; jpeg: Buffer } | null {
  const packet = rawDataToBuffer(data);
  if (packet.length < 14 || packet.length > MAX_FRAME_BYTES) return null;

  const width = packet.readUInt16LE(0);
  const height = packet.readUInt16LE(2);
  const timestampUs = packet.readDoubleLE(4);
  if (
    width < 1 || width > MAX_FRAME_WIDTH ||
    height < 1 || height > MAX_FRAME_HEIGHT ||
    !Number.isFinite(timestampUs) || timestampUs < 0
  ) return null;

  return { width, height, timestampUs, jpeg: packet.subarray(12) };
}

export function attachBreathingMonitor(server: Server): void {
  const webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_FRAME_BYTES,
    perMessageDeflate: false,
    handleProtocols: (protocols) => protocols.has(TOKEN_PROTOCOL) ? TOKEN_PROTOCOL : false,
  });
  const activeUsers = new Set<string>();

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname !== ROUTE) {
      rejectUpgrade(socket, 404, 'Not Found');
      return;
    }

    const ticket = getTicket(request);
    if (!ticket) {
      rejectUpgrade(socket, 401, 'Unauthorized');
      return;
    }
    if (!process.env.SMARTSPECTRA_API_KEY) {
      rejectUpgrade(socket, 503, 'SmartSpectra is not configured');
      return;
    }
    const userId = consumeBreathingMonitorTicket(ticket);
    if (!userId) {
      rejectUpgrade(socket, 401, 'Expired or invalid breathing check ticket');
      return;
    }
    if (activeUsers.has(userId)) {
      rejectUpgrade(socket, 409, 'Breathing check already active');
      return;
    }
    if (activeUsers.size >= MAX_CONCURRENT_MONITORS) {
      rejectUpgrade(socket, 503, 'Breathing check capacity reached');
      return;
    }

    activeUsers.add(userId);
    webSocketServer.handleUpgrade(request, socket, head, (client) => {
      webSocketServer.emit('connection', client, request, userId);
    });
  });

  webSocketServer.on('connection', (socket: WebSocket, _request: IncomingMessage, userId: string) => {
    const monitor: Monitor = {
      socket,
      finished: false,
      sampleTimestamps: new Set(),
      rates: [],
    };
    let consentReceived = false;
    let frameWindowStartedAt = 0;
    let framesInWindow = 0;

    monitor.consentTimer = setTimeout(() => {
      send(socket, { type: 'error', message: 'Breathing check consent was not received.' });
      socket.close(1008, 'Consent required');
    }, 10_000);

    const cleanup = async () => {
      await stopMonitor(monitor);
      activeUsers.delete(userId);
    };

    socket.on('message', (data, isBinary) => {
      if (!isBinary) {
        let control: { type?: string; accepted?: boolean };
        try {
          control = JSON.parse(data.toString()) as { type?: string; accepted?: boolean };
        } catch {
          send(socket, { type: 'error', message: 'Invalid breathing check request.' });
          socket.close(1008, 'Invalid request');
          return;
        }

        if (control.type === 'stop') {
          void cleanup().then(() => socket.close(1000, 'Stopped by user'));
          return;
        }
        if (control.type !== 'consent' || control.accepted !== true || consentReceived) {
          send(socket, { type: 'error', message: 'Explicit consent is required to start a breathing check.' });
          socket.close(1008, 'Consent required');
          return;
        }

        consentReceived = true;
        if (monitor.consentTimer) clearTimeout(monitor.consentTimer);
        try {
          const sdk = new SmartSpectraSDK({
            apiKey: process.env.SMARTSPECTRA_API_KEY!,
            requestedMetrics: [...breathingMetrics],
          });
          monitor.sdk = sdk;
          sdk.on('metrics', (buffer) => {
            const decoded = decodeMetrics(buffer);
            for (const sample of readRates(decoded)) {
              if (monitor.sampleTimestamps.has(sample.timestamp)) continue;
              monitor.sampleTimestamps.add(sample.timestamp);
              monitor.rates.push(sample.value);
            }
          });
          sdk.on('validationStatus', (_code, _timestamp, hint) => {
            if (!hint || hint === monitor.lastValidationHint) return;
            monitor.lastValidationHint = hint;
            send(socket, { type: 'validation', hint });
          });
          sdk.on('error', (code, message, retryable) => {
            console.error('[BREATHING] SmartSpectra error:', code, message, 'retryable=', retryable);
            send(socket, { type: 'error', message: 'Breathing check could not continue.' });
            void cleanup().then(() => socket.close(1011, 'SmartSpectra error'));
          });
          sdk.useCustomInput(FrameTransform.kNone);
          sdk.start();
          monitor.timer = setTimeout(async () => {
            await stopMonitor(monitor);
            if (socket.readyState !== WebSocket.OPEN) return;

            const count = monitor.rates.length;
            const mean = count ? monitor.rates.reduce((sum, rate) => sum + rate, 0) / count : null;
            const needsCheckIn = count >= MIN_SAMPLES && mean !== null && mean >= FLAG_AT_OR_ABOVE;
            send(socket, {
              type: 'completed',
              sampleCount: count,
              needsCheckIn,
              enoughSamples: count >= MIN_SAMPLES,
            });
            socket.close(1000, 'Measurement complete');
          }, RUN_SECONDS * 1000);
          send(socket, { type: 'ready', durationSeconds: RUN_SECONDS });
        } catch (error) {
          console.error('[BREATHING] Could not start SmartSpectra:', error);
          send(socket, { type: 'error', message: 'Breathing check could not start.' });
          void cleanup().then(() => socket.close(1011, 'SmartSpectra startup failed'));
        }
        return;
      }

      if (!consentReceived || !monitor.sdk || monitor.finished) return;
      const now = Date.now();
      if (now - frameWindowStartedAt >= 1000) {
        frameWindowStartedAt = now;
        framesInWindow = 0;
      }
      if (++framesInWindow > MAX_FRAMES_PER_SECOND) {
        send(socket, { type: 'error', message: 'Camera frame rate exceeded the allowed limit.' });
        void cleanup().then(() => socket.close(1008, 'Frame rate exceeded'));
        return;
      }
      const frame = readFrame(data);
      if (!frame) {
        send(socket, { type: 'error', message: 'Invalid camera frame.' });
        void cleanup().then(() => socket.close(1009, 'Invalid frame'));
        return;
      }

      try {
        const decoded = jpeg.decode(frame.jpeg, {
          useTArray: true,
          formatAsRGBA: true,
          maxResolutionInMP: 1,
          maxMemoryUsageInMB: 32,
        });
        if (decoded.width !== frame.width || decoded.height !== frame.height) {
          throw new Error('Frame dimensions do not match');
        }
        const rgb = Buffer.allocUnsafe(frame.width * frame.height * 3);
        for (let source = 0, target = 0; source < decoded.data.length; source += 4) {
          rgb[target++] = decoded.data[source];
          rgb[target++] = decoded.data[source + 1];
          rgb[target++] = decoded.data[source + 2];
        }
        monitor.sdk.sendFrame(
          rgb,
          frame.width,
          frame.height,
          frame.width * 3,
          PixelFormat.kRGB,
          frame.timestampUs,
        );
      } catch (error) {
        console.error('[BREATHING] Camera frame processing failed:', error);
        send(socket, { type: 'error', message: 'Camera frame processing failed.' });
        void cleanup().then(() => socket.close(1011, 'Frame processing failed'));
      }
    });

    socket.on('close', () => {
      void cleanup();
    });
    socket.on('error', (error) => {
      console.error('[BREATHING] WebSocket error:', error.message);
      void cleanup();
    });
  });

  server.on('close', () => {
    for (const client of webSocketServer.clients) client.close(1001, 'Server shutting down');
    webSocketServer.close();
  });
}
