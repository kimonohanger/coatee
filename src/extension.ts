import * as vscode from 'vscode';

const CONTEXT_KEY_EXTENSION_ENABLED = 'coatee.enabled';
const CONTEXT_KEY_EXTENSION_MODE = 'coatee.mode';

enum Mode {
    code, // VSCode mode
    extension, // extension's main mode
    jumpForward, // search forward and go to the character
    jumpBackward, // search  backward and go to the character
    replace, // fake overtype mode
    replaceChar, // replace single character
}

interface ICommand {
    name: string;
    args: {};
}

export async function activate(context: vscode.ExtensionContext) {
    const ext = new Controller();

    const registerCommand = (command: string, handler: (...args: any[]) => any) => {
        const disposable = vscode.commands.registerCommand(command, handler);
        context.subscriptions.push(disposable);
    };

    registerCommand('coatee.codeMode', ext.codeMode);
    registerCommand('coatee.extensionMode', ext.extensionMode);
    registerCommand('coatee.jumpBackwardMode', ext.jumpBackwardMode);
    registerCommand('coatee.jumpForwardMode', ext.jumpForwardMode);
    registerCommand('coatee.replaceCharMode', ext.replaceCharMode);
    registerCommand('coatee.replaceMode', ext.replaceMode);
    registerCommand('coatee.exec', ext.exec);
    registerCommand('coatee.nop', () => { });
    registerCommand('coatee.addCursorRight', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            ext.addCursorRight(editor);
        }
    });
    registerCommand('coatee.moveLastCursorLeft', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            ext.moveLastCursorLeft(editor);
        }
    });
    registerCommand('coatee.moveLastCursorRight', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            ext.moveLastCursorRight(editor);
        }
    });
    registerCommand('coatee.alignText', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            ext.alignText(editor);
        };
    });
    registerCommand('type', (args) => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            ext.type(editor, args.text);
        }
    });

    vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor) {
            ext.extensionMode();
        }
    }, null, context.subscriptions);

    await vscode.commands.executeCommand('setContext', CONTEXT_KEY_EXTENSION_ENABLED, true);
}

export async function deactivate() {
    await vscode.commands.executeCommand('setContext', CONTEXT_KEY_EXTENSION_ENABLED, undefined);
    await vscode.commands.executeCommand('setContext', CONTEXT_KEY_EXTENSION_MODE, undefined);
}

class Controller {
    // Mode of this extension.
    #mode = Mode.code;

    constructor() {
        this.extensionMode();
    }

    private generateModeHandler(mode: Mode, style: vscode.TextEditorCursorStyle) {
        return async () => {
            if (!vscode.window.activeTextEditor) {
                return;
            }
            if (this.#mode === mode) {
                return;
            }
            this.#mode = mode;
            await vscode.commands.executeCommand('setContext', CONTEXT_KEY_EXTENSION_MODE, Mode[mode]);
            vscode.window.activeTextEditor.options = {
                cursorStyle: style
            };
        };
    }

    // Change extension's mode.
    public codeMode = this.generateModeHandler(Mode.code, vscode.TextEditorCursorStyle.Line);
    public extensionMode = this.generateModeHandler(Mode.extension, vscode.TextEditorCursorStyle.Block);
    public jumpForwardMode = this.generateModeHandler(Mode.jumpForward, vscode.TextEditorCursorStyle.BlockOutline);
    public jumpBackwardMode = this.generateModeHandler(Mode.jumpBackward, vscode.TextEditorCursorStyle.BlockOutline);
    public replaceMode = this.generateModeHandler(Mode.replace, vscode.TextEditorCursorStyle.Underline);
    public replaceCharMode = this.generateModeHandler(Mode.replaceChar, vscode.TextEditorCursorStyle.Underline);

    // Add a new cursor right next to the last cursor.
    public addCursorRight(editor: vscode.TextEditor) {
        const last = editor.selections.slice(-1)[0];
        const sels = editor.selections.slice();
        sels.push(createCursor(editor.document, last.active.line, last.active.character + 1));
        editor.selections = sels;
    }

    // Move the last cursor to left.
    public moveLastCursorLeft(editor: vscode.TextEditor) {
        const last = editor.selections.slice(-1)[0];
        const sels = editor.selections.slice(0, -1);
        sels.push(createCursor(editor.document, last.active.line, last.active.character - 1));
        editor.selections = sels;
    }

    // Move the last cursor to right.
    public moveLastCursorRight(editor: vscode.TextEditor) {
        const last = editor.selections.slice(-1)[0];
        const sels = editor.selections.slice(0, -1);
        sels.push(createCursor(editor.document, last.active.line, last.active.character + 1));
        editor.selections = sels;
    }

    // Align text vertically by inserting some spaces.
    public alignText(editor: vscode.TextEditor) {
        if (editor.selections.length !== (new Set(editor.selections.map((sel) => sel.active.line))).size) {
            return; // Some cursors on the same line.
        }
        let noTextSelectionFound = true;
        let rightMost = editor.selection;
        editor.selections.forEach((sel) => {
            if (!sel.active.isEqual(sel.anchor)) {
                noTextSelectionFound = false;
                return;
            }
            if (sel.active.character > rightMost.active.character) {
                rightMost = sel;
            }
        });
        if (noTextSelectionFound) {
            editor.edit(eb => {
                editor.selections.forEach((sel) => {
                    const location = sel.active;
                    const value = " ".repeat(rightMost.active.character - location.character);
                    if (value.length > 0) {
                        eb.insert(location, value);
                    }
                });
            });
        }
    }

    // Execute commands sequentially.
    public async exec(obj: { cmds: ICommand[] }) {
        for (const cmd of obj.cmds) {
            await vscode.commands.executeCommand(cmd.name, cmd.args);
        }
    }

    // Hook the 'default:type' command.
    public type(editor: vscode.TextEditor, text: string) {
        switch (this.#mode) {
            case Mode.code:
                // In code mode, just delegate to the original command.
                vscode.commands.executeCommand('default:type', { text: text });
                break;
            case Mode.jumpForward:
                editor.selections = jumpToCharBy(editor, text, searchForward);
                this.extensionMode();
                break;
            case Mode.jumpBackward:
                editor.selections = jumpToCharBy(editor, text, searchBackward);
                this.extensionMode();
                break;
            case Mode.replace:
                vscode.commands.executeCommand('cursorRight');
                vscode.commands.executeCommand('default:replacePreviousChar', { text: text, replaceCharCnt: text.length });
                break;
            case Mode.replaceChar:
                vscode.commands.executeCommand('cursorRight');
                vscode.commands.executeCommand('default:replacePreviousChar', { text: text, replaceCharCnt: text.length });
                vscode.commands.executeCommand('cursorLeft');
                this.extensionMode();
                break;
            default:
                break;
        }
    }
}

function createCursor(document: vscode.TextDocument, line: number, char: number): vscode.Selection {
    const pos = document.validatePosition(new vscode.Position(line, char));
    return new vscode.Selection(pos, pos);
}

function jumpToCharBy(editor: vscode.TextEditor, char: string, f: (text: string, from: number, char: string) => number): vscode.Selection[] {
    return editor.selections.map((sel) => {
        const n = f(editor.document.lineAt(sel.active.line).text, sel.active.character, char);
        const pos = new vscode.Position(sel.active.line, n);
        return new vscode.Selection(pos, pos);
    });
}

function searchForward(text: string, from: number, char: string): number {
    for (let i = from + 1; i < text.length; ++i) {
        if (text[i] === char) {
            return i;
        }
    }
    return from;
}

function searchBackward(text: string, from: number, char: string): number {
    for (let i = from - 1; i >= 0; --i) {
        if (text[i] === char) {
            return i;
        }
    }
    return from;
}
