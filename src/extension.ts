// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { StepByStepCompletionItemProvider, StepByStepDiagnosticProvider } from './hint';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "step-by-step" is now active!');

	enableCompletionItemProvider();
	enableDiagnosticsProvider(context);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function enableCompletionItemProvider() {
	vscode.languages.registerCompletionItemProvider({ scheme: 'file' },
		new StepByStepCompletionItemProvider());

}

function enableDiagnosticsProvider(context: vscode.ExtensionContext) {
	const collection = vscode.languages.createDiagnosticCollection('test');
	let diagnosticsProvider = new StepByStepDiagnosticProvider(collection);

	if (vscode.window.activeTextEditor) {
		diagnosticsProvider.updateDiagnostics(vscode.window.activeTextEditor.document);
	}
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) {
			diagnosticsProvider.updateDiagnostics(editor.document);
		}
	}));
	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
		if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
			diagnosticsProvider.updateDiagnostics(event.document);
		}
	}));
}