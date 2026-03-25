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
}

/**
 * Spawns `claude -p "prompt" --output-format stream-json` and emits
 * parsed events as they arrive from stdout.
 */
export class ClaudeRunner extends EventEmitter {
  private process: ChildProcess | null = null;
  private killed = false;

  constructor(
    private claudePath: string,
    private prompt: string,
    private cwd: string,
  ) {
    super();
  }

  start(): void {
    const args = ['-p', this.prompt, '--output-format', 'stream-json'];

    this.process = spawn(this.claudePath, args, {
      cwd: this.cwd || undefined,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let buffer = '';

    this.process.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const event: ClaudeEvent = JSON.parse(trimmed);
          this.emit('event', event);
        } catch {
          // Not JSON — might be plain text output
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
      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}
