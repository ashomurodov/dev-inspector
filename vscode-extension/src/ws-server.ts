import { WebSocketServer, WebSocket } from 'ws';
import { SessionManager } from './session-manager';

interface IncomingMessage {
  type: string;
  sessionId?: string;
  prompt?: string;
  cwd?: string;
  elementSelector?: string;
  claudeSessionId?: string;
  previousSessionId?: string;
}

type LogFn = (msg: string) => void;

export class WsServer {
  private wss: WebSocketServer | null = null;
  private port: number;
  private sessions: SessionManager;
  private clients = new Set<WebSocket>();
  private log: LogFn;
  private getWorkspaceCwd: () => string;

  constructor(port: number, sessions: SessionManager, log: LogFn, getWorkspaceCwd: () => string) {
    this.port = port;
    this.sessions = sessions;
    this.log = log;
    this.getWorkspaceCwd = getWorkspaceCwd;
  }

  start(): Promise<number> {
    return this.tryListen(this.port);
  }

  private tryListen(port: number, attempt = 0): Promise<number> {
    const maxAttempts = 6;

    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port, host: 'localhost' });

      wss.on('listening', () => {
        this.wss = wss;
        this.port = port;
        this.setupHandlers();
        resolve(port);
      });

      wss.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attempt < maxAttempts - 1) {
          wss.close();
          this.tryListen(port + 1, attempt + 1).then(resolve, reject);
        } else {
          reject(err);
        }
      });
    });
  }

  private setupHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      ws.on('message', (data) => {
        try {
          const msg: IncomingMessage = JSON.parse(data.toString());
          this.handleMessage(ws, msg);
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.send(JSON.stringify({ type: 'pong' }));
    });
  }

  private handleMessage(ws: WebSocket, msg: IncomingMessage): void {
    switch (msg.type) {
      case 'session:start':
        if (msg.sessionId && msg.prompt) {
          const cwd = msg.cwd || this.getWorkspaceCwd();
          this.log(`Session ${msg.sessionId.slice(0, 8)}... starting in cwd: ${cwd}`);
          this.log(`Element: ${msg.elementSelector || '(unknown)'}`);
          this.sessions.startSession(
            msg.sessionId,
            msg.prompt,
            cwd,
            msg.elementSelector || '',
            ws,
          );
        }
        break;

      case 'session:followup':
        if (msg.sessionId && msg.prompt) {
          const cwd = msg.cwd || this.getWorkspaceCwd();
          // Look up the Claude session ID to resume
          const claudeSessionId = msg.claudeSessionId ||
            (msg.previousSessionId ? this.sessions.getClaudeSessionId(msg.previousSessionId) : null);

          this.log(`Follow-up for ${msg.sessionId.slice(0, 8)}... (resume: ${claudeSessionId || 'none'})`);
          this.sessions.startSession(
            msg.sessionId,
            msg.prompt,
            cwd,
            msg.elementSelector || '',
            ws,
            claudeSessionId || undefined,
          );
        }
        break;

      case 'session:cancel':
        if (msg.sessionId) {
          this.sessions.cancelSession(msg.sessionId);
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  getPort(): number {
    return this.port;
  }

  dispose(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.wss?.close();
    this.wss = null;
  }
}
