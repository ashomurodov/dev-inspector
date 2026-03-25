import { ClaudeRunner, ClaudeEvent } from './claude-runner';
import WebSocket from 'ws';

interface Session {
  id: string;
  runner: ClaudeRunner;
  ws: WebSocket | null;
  status: 'starting' | 'running' | 'done' | 'error' | 'cancelled';
  elementSelector: string;
}

/**
 * Manages multiple concurrent Claude sessions.
 * Routes events from ClaudeRunner instances back through WebSocket to the browser.
 */
export class SessionManager {
  private sessions = new Map<string, Session>();
  private claudePath: string;
  private maxSessions = 5;

  constructor(claudePath: string) {
    this.claudePath = claudePath;
  }

  setClaudePath(path: string): void {
    this.claudePath = path;
  }

  startSession(
    sessionId: string,
    prompt: string,
    cwd: string,
    elementSelector: string,
    ws: WebSocket | null,
  ): boolean {
    if (this.sessions.size >= this.maxSessions) {
      this.sendToWs(ws, {
        type: 'session:error',
        sessionId,
        error: `Max ${this.maxSessions} concurrent sessions reached`,
      });
      return false;
    }

    const runner = new ClaudeRunner(this.claudePath, prompt, cwd);

    const session: Session = {
      id: sessionId,
      runner,
      ws,
      status: 'starting',
      elementSelector,
    };

    this.sessions.set(sessionId, session);

    // Wire up runner events
    runner.on('event', (event: ClaudeEvent) => {
      if (session.status === 'starting') {
        session.status = 'running';
        this.sendToWs(session.ws, { type: 'session:started', sessionId });
      }

      this.sendToWs(session.ws, {
        type: 'session:progress',
        sessionId,
        event,
      });

      if (event.type === 'result') {
        session.status = 'done';
        this.sendToWs(session.ws, {
          type: 'session:complete',
          sessionId,
          success: true,
          summary: 'Changes applied successfully',
        });
        this.cleanupSession(sessionId);
      }
    });

    runner.on('error', (err: Error) => {
      session.status = 'error';
      this.sendToWs(session.ws, {
        type: 'session:error',
        sessionId,
        error: err.message,
      });
      this.cleanupSession(sessionId);
    });

    runner.on('stderr', (text: string) => {
      // Forward stderr as progress text
      this.sendToWs(session.ws, {
        type: 'session:progress',
        sessionId,
        event: { type: 'assistant', subtype: 'text', content: text },
      });
    });

    runner.on('done', (code: number | null) => {
      if (session.status !== 'done' && session.status !== 'cancelled') {
        if (code !== 0) {
          session.status = 'error';
          this.sendToWs(session.ws, {
            type: 'session:error',
            sessionId,
            error: `Claude exited with code ${code}`,
          });
        } else {
          session.status = 'done';
          this.sendToWs(session.ws, {
            type: 'session:complete',
            sessionId,
            success: true,
            summary: 'Changes applied successfully',
          });
        }
        this.cleanupSession(sessionId);
      }
    });

    // Start the runner
    runner.start();
    return true;
  }

  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'cancelled';
    session.runner.cancel();
    this.sendToWs(session.ws, {
      type: 'session:cancelled',
      sessionId,
    });
    this.cleanupSession(sessionId);
  }

  updateWebSocket(sessionId: string, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (session) session.ws = ws;
  }

  getActiveCount(): number {
    return this.sessions.size;
  }

  private cleanupSession(sessionId: string): void {
    // Keep session reference for a bit so late messages can still be routed
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 30000);
  }

  private sendToWs(ws: WebSocket | null, msg: Record<string, unknown>): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  dispose(): void {
    for (const [, session] of this.sessions) {
      session.runner.cancel();
    }
    this.sessions.clear();
  }
}
