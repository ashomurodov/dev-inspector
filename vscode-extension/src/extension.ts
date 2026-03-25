import * as vscode from 'vscode';
import { WsServer } from './ws-server';
import { SessionManager } from './session-manager';
import { execSync } from 'child_process';

let wsServer: WsServer | null = null;
let sessionManager: SessionManager | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const config = vscode.workspace.getConfiguration('devInspector');
  const wsPort = config.get<number>('wsPort', 19854);
  const claudePath = config.get<string>('claudePath', 'claude');

  // Verify claude CLI is available
  try {
    execSync(`${claudePath} --version`, { stdio: 'pipe' });
  } catch {
    vscode.window.showWarningMessage(
      'Dev Inspector Bridge: Claude CLI not found. Install it from https://claude.ai/code or set devInspector.claudePath in settings.',
    );
  }

  // Initialize session manager
  sessionManager = new SessionManager(claudePath);

  // Start WebSocket server
  wsServer = new WsServer(wsPort, sessionManager);
  wsServer.start().then(
    (port) => {
      console.log(`Dev Inspector Bridge: WebSocket server running on port ${port}`);
    },
    (err) => {
      console.error('Dev Inspector Bridge: Failed to start WebSocket server', err);
      vscode.window.showErrorMessage(
        `Dev Inspector Bridge: Failed to start WebSocket server — ${err.message}`,
      );
    },
  );

  // Register URI handler: vscode://dev-inspector.bridge/claude?sessionId=...&wsPort=...
  const uriHandler = vscode.window.registerUriHandler({
    handleUri(uri: vscode.Uri): void {
      const params = new URLSearchParams(uri.query);
      const sessionId = params.get('sessionId');

      if (!sessionId) return;

      // Show notification that a session was triggered
      vscode.window.showInformationMessage(
        `Dev Inspector: AI agent session started (${sessionId.slice(0, 8)}...)`,
      );

      // If the session hasn't been started via WebSocket yet, it will be
      // started when the browser connects. The URI is just a wake-up call
      // to ensure VS Code is in the foreground.
      vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    },
  });
  context.subscriptions.push(uriHandler);

  // Listen for config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('devInspector.claudePath')) {
        const newPath = vscode.workspace.getConfiguration('devInspector').get<string>('claudePath', 'claude');
        sessionManager?.setClaudePath(newPath);
      }
    }),
  );

  // Cleanup on deactivation
  context.subscriptions.push({
    dispose() {
      wsServer?.dispose();
      sessionManager?.dispose();
    },
  });
}

export function deactivate(): void {
  wsServer?.dispose();
  sessionManager?.dispose();
  wsServer = null;
  sessionManager = null;
}
