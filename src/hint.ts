import * as vscode from 'vscode';

class HintTextDocument {
    filename: string;
    content: string;
    constructor(filename: string, content: string) {
        this.filename = filename;
        this.content = content;
    }
}

let demoDocument = {
    filename: "/demo.py",
    content: `def fibonacci(n):
    if n == 0:
        return 0
    if n == 1:
        return 1
    if n == 2:
        return 2
    return fibonacci(n - 1) + fibonacci(n - 2)
`};


export class StepByStepCompletionItemProvider implements vscode.CompletionItemProvider {
    hintLength: number = 20;
    expectedDocument: { filename: string, content: string } = demoDocument;

    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position,
        token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
        let hintStartPos = document.offsetAt(position);
        let hintEndPos = Math.min(hintStartPos + this.hintLength, this.expectedDocument.content.length);
        let hintSnippet = this.expectedDocument.content.substring(hintStartPos, hintEndPos);

        let item = new vscode.CompletionItem(hintSnippet);
        item.kind = vscode.CompletionItemKind.Snippet;
        item.insertText = '';
        item.range = new vscode.Range(position, position);

        return [item];
    }
}

export class StepByStepDiagnosticProvider {
    collection: vscode.DiagnosticCollection;
    expectedDocument: { filename: string, content: string } = demoDocument;

    constructor(collection: vscode.DiagnosticCollection) {
        this.collection = collection;
    }

    updateDiagnostics(document: vscode.TextDocument) {
        let actualText = document.getText();
        let expectedText = this.expectedDocument.content;

        let unmatchedPieces = this.findUnmatchedPieces(actualText, expectedText);

        this.collection.set(document.uri, unmatchedPieces.map(range => {
            let startPosition = document.positionAt(range.startPos);
            let endPosition = document.positionAt(range.endPos);
            let actualContent = document.getText(new vscode.Range(startPosition, endPosition));
            let expectedContent = expectedText.substring(range.startPos, Math.min(range.endPos, expectedText.length));

            return {
                code: '',
                message: `Expected: \n${expectedContent}\nbut given: \n${actualContent}`,
                range: new vscode.Range(startPosition, endPosition),
                severity: vscode.DiagnosticSeverity.Error,
                source: 'StepByStep'
            };
        }));
    }

    /*
    * zero-based left-close-right-open range
    */
    private findUnmatchedPieces(actualText: string, expectedText: string): { startPos: number, endPos: number }[] {
        // start at MATCHED
        // MATCHED, match -> MATCHED
        // MATCHED, unmatch -> UNMATCHED
        // UNMATCHED, match -> MATCHED, output range
        // UNMATCHED, unmatch -> unmatched
        // UNMATCHED, eof -> MATCHED, output range

        const MATCHED: number = 0;
        const UNMATCHED: number = 1;

        let unmatches: { startPos: number, endPos: number }[] = [];
        let state: number = MATCHED;
        let startPos = 0;
        let currentPos = 0;

        while (currentPos < actualText.length) {
            if (MATCHED === state && this.isMatch(actualText, expectedText, currentPos)) {
                // stay at MATCHED
            } else if (MATCHED === state && !this.isMatch(actualText, expectedText, currentPos)) {
                startPos = currentPos;
                state = UNMATCHED;
            } else if (UNMATCHED === state && this.isMatch(actualText, expectedText, currentPos)) {
                unmatches.push({
                    startPos: startPos,
                    endPos: currentPos
                });
                state = MATCHED;
            } else if (UNMATCHED === state && !this.isMatch(actualText, expectedText, currentPos)) {
                // stay at UNMATCHED
            }

            currentPos++;
        }
        if (UNMATCHED === state) {
            unmatches.push({
                startPos: startPos,
                endPos: currentPos
            });
            state = MATCHED;
        }

        return unmatches;
    }

    private isMatch(actualText: string, expectedText: string, pos: number): boolean {
        if (pos >= actualText.length) {
            return false;
        }
        if (pos >= expectedText.length) {
            return false;
        }
        return actualText.charCodeAt(pos) === expectedText.charCodeAt(pos);
    }
}