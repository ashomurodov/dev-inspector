import * as vscode from 'vscode';
import { WsServer } from './ws-server';
import { SessionManager } from './session-manager';
import { execSync } from 'child_process';

let wsServer: WsServer | null = null;
let sessionManager: SessionManager | null = null;
let outputChannel: vscode.OutputChannel | null = null;

function log(msg: string): void {
  const timestamp = new Date().toLocaleTimeString();
  outputChannel?.appendLine(`[${timestamp}] ${msg}`);
}

export function activate(context: vscode.ExtensionContext): void {
  // Create output channel so users can see what's happening
  outputChannel = vscode.window.createOutputChannel('Dev Inspector Bridge');
  context.subscriptions.push(outputChannel);
  outputChannel.show(true); // show but don't steal focus

  log('Extension activating...');

  const config = vscode.workspace.getConfiguration('devInspector');
  const wsPort = config.get<number>('wsPort', 19854);
  const claudePath = config.get<string>('claudePath', 'claude');

  // Verify claude CLI is available
  try {
    const version = execSync(`${claudePath} --version`, { stdio: 'pipe' }).toString().trim();
    log(`Claude CLI found: ${version}`);
  } catch {
    log('WARNING: Claude CLI not found on PATH');
    vscode.window.showWarningMessage(
      'Dev Inspector Bridge: Claude CLI not found. Install it from https://claude.ai/code or set devInspector.claudePath in settings.',
    );
  }

  // Initialize session manager
  sessionManager = new SessionManager(claudePath, log);
  log('Session manager initialized');

  // Start WebSocket server
  const getWorkspaceCwd = () => {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }
    return process.cwd();
  };

  log(`Workspace folder: ${getWorkspaceCwd()}`);

  wsServer = new WsServer(wsPort, sessionManager, log, getWorkspaceCwd);
  wsServer.start().then(
    (port) => {
      log(`WebSocket server running on localhost:${port}`);
      vscode.window.showInformationMessage(
        `Dev Inspector Bridge: Ready on port ${port}`,
      );
    },
    (err) => {
      log(`ERROR: Failed to start WebSocket server — ${err.message}`);
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

      log(`URI handler triggered — session ${sessionId.slice(0, 8)}...`);

      vscode.window.showInformationMessage(
        `Dev Inspector: AI agent session started (${sessionId.slice(0, 8)}...)`,
      );

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
        log(`Claude path updated to: ${newPath}`);
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

  log('Extension activated successfully');
}

export function deactivate(): void {
  outputChannel?.appendLine('Extension deactivating...');
  wsServer?.dispose();
  sessionManager?.dispose();
  wsServer = null;
  sessionManager = null;
}
