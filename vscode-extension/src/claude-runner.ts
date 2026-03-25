import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface ClaudeEvent {
  type: string;
  subtype?: string;
  tool?: string;
  name?: string;
  content?: string;
  input?: Record<string, unknown>;
  cost?: number;
  duration?: number;
  duration_ms?: number;
  num_turns?: number;
  is_error?: boolean;
  session_id?: string;
  message?: Record<string, unknown>;
}

export class ClaudeRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private killed = false;
  public claudeSessionId: string | null = null;

  constructor(
    private claudePath: string,
    private prompt: string,
    private cwd: string,
    private resumeSessionId?: string,
  ) {
    super();
  }

  start(): void {
    const args: string[] = [];

    if (this.resumeSessionId) {
      // Resume a previous conversation
      args.push('--resume', this.resumeSessionId);
      args.push('-p', this.prompt);
    } else {
      args.push('-p', this.prompt);
    }

    args.push(
      '--output-format', 'stream-json',
      '--verbose',
      '--allowedTools', 'Read,Edit,Write,Glob,Grep,Bash',
    );

    this.process = spawn(this.claudePath, args, {
      cwd: this.cwd || undefined,
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let buffer = '';

    this.process.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event: ClaudeEvent = JSON.parse(trimmed);
          // Capture Claude's internal session ID from init event
          if (event.type === 'system' && event.subtype === 'init' && event.session_id) {
            this.claudeSessionId = event.session_id;
          }
          this.emit('event', event);
        } catch {
          this.emit('event', { type: 'assistant', subtype: 'text', content: trimmed });
        }
      }
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (text) {
        this.emit('stderr', text);
      }
    });

    this.process.on('close', (code) => {
      if (!this.killed) {
        this.emit('done', code);
      }
    });

    this.process.on('error', (err) => {
      this.emit('error', err);
    });
  }

  cancel(): void {
    this.killed = true;
    if (this.process) {
      this.process.kill('SIGTERM');
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}
