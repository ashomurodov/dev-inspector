import { ClaudeRunner, ClaudeEvent } from './claude-runner';
import WebSocket from 'ws';

interface Session {
  id: string;
  runner: ClaudeRunner;
  ws: WebSocket | null;
  status: 'starting' | 'running' | 'done' | 'error' | 'cancelled';
  elementSelector: string;
  claudeSessionId: string | null;
}

type LogFn = (msg: string) => void;

export class SessionManager {
  private sessions = new Map<string, Session>();
  private claudePath: string;
  private maxSessions = 5;
  private log: LogFn;
  // Store completed Claude session IDs so follow-ups can resume them
  private completedClaudeSessions = new Map<string, string>(); // browserSessionId -> claudeSessionId

  constructor(claudePath: string, log?: LogFn) {
    this.claudePath = claudePath;
    this.log = log || (() => {});
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
    resumeClaudeSessionId?: string,
  ): boolean {
    if (this.sessions.size >= this.maxSessions) {
      this.sendToWs(ws, {
        type: 'session:error',
        sessionId,
        error: `Max ${this.maxSessions} concurrent sessions reached`,
      });
      return false;
    }

    const isResume = !!resumeClaudeSessionId;
    this.log(`${isResume ? 'Resuming' : 'Starting'} Claude session for ${sessionId.slice(0, 8)}`);
    this.log(`Working directory: ${cwd}`);
    this.log(`Prompt length: ${prompt.length} chars`);
    if (isResume) this.log(`Resuming Claude session: ${resumeClaudeSessionId}`);

    const runner = new ClaudeRunner(this.claudePath, prompt, cwd, resumeClaudeSessionId);

    const session: Session = {
      id: sessionId,
      runner,
      ws,
      status: 'starting',
      elementSelector,
      claudeSessionId: resumeClaudeSessionId || null,
    };

    this.sessions.set(sessionId, session);

    let eventCount = 0;
    runner.on('event', (event: ClaudeEvent) => {
      eventCount++;
      this.log(`Session ${sessionId.slice(0, 8)} event #${eventCount}: ${JSON.stringify(event).slice(0, 200)}`);

      // Capture Claude session ID
      if (runner.claudeSessionId && !session.claudeSessionId) {
        session.claudeSessionId = runner.claudeSessionId;
        this.log(`Claude session ID captured: ${session.claudeSessionId}`);
      }

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
        // Store the Claude session ID for future follow-ups
        if (session.claudeSessionId) {
          this.completedClaudeSessions.set(sessionId, session.claudeSessionId);
        }
        const duration = event.duration_ms ? `${(event.duration_ms / 1000).toFixed(1)}s` : '';
        const turns = event.num_turns ? `${event.num_turns} turns` : '';
        const parts = [turns, duration].filter(Boolean).join(' · ');
        this.sendToWs(session.ws, {
          type: 'session:complete',
          sessionId,
          success: !event.is_error,
          summary: parts ? `Done (${parts})` : 'Done',
          claudeSessionId: session.claudeSessionId,
        });
        this.cleanupSession(sessionId);
      }
    });

    runner.on('error', (err: Error) => {
      this.log(`Session ${sessionId.slice(0, 8)} error: ${err.message}`);
      session.status = 'error';
      this.sendToWs(session.ws, {
        type: 'session:error',
        sessionId,
        error: err.message,
      });
      this.cleanupSession(sessionId);
    });

    runner.on('stderr', (text: string) => {
      this.log(`Session ${sessionId.slice(0, 8)} stderr: ${text}`);
    });

    runner.on('done', (code: number | null) => {
      this.log(`Session ${sessionId.slice(0, 8)} exited with code ${code} (received ${eventCount} events)`);
      if (session.status !== 'done' && session.status !== 'cancelled') {
        if (session.claudeSessionId) {
          this.completedClaudeSessions.set(sessionId, session.claudeSessionId);
        }
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
            summary: 'Done',
            claudeSessionId: session.claudeSessionId,
          });
        }
        this.cleanupSession(sessionId);
      }
    });

    runner.start();
    return true;
  }

  getClaudeSessionId(browserSessionId: string): string | null {
    return this.completedClaudeSessions.get(browserSessionId) || null;
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
    this.completedClaudeSessions.clear();
  }
}
