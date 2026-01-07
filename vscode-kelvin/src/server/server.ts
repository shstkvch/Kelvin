import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getCompletions } from './completion';
import { parseDocument, DocumentContext } from './context';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const documentContexts = new Map<string, DocumentContext>();

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: [':', '.', ' '],
      },
    },
  };
});

documents.onDidChangeContent((change) => {
  const context = parseDocument(change.document);
  documentContexts.set(change.document.uri, context);
});

documents.onDidClose((event) => {
  documentContexts.delete(event.document.uri);
});

connection.onCompletion((params: CompletionParams) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const context = documentContexts.get(document.uri);
  return getCompletions(document, params.position, context);
});

documents.listen(connection);
connection.listen();
