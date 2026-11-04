import { registerPlugin } from '@capacitor/core';

export interface FileTreeEntry {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  mimeType?: string;
  lastModified?: number;
}

export interface FileTreeMoveOptions {
  sourceUri: string;
  destTreeUri: string;
  destRelativePath: string;
}

export interface FileTreePluginShape {
  list: (options: { treeUri: string; parentUri?: string }) => Promise<{ files: FileTreeEntry[] }>;
  check: (options: { treeUri: string }) => Promise<{ ok: boolean }>;
  pickTree: (options: { startDocumentUri?: string }) => Promise<{ treeUri: string }>;
  move: (options: FileTreeMoveOptions) => Promise<void>;
  thumbnail: (options: { uri: string; max?: number }) => Promise<{ data: string }>;
  readText: (options: { uri: string }) => Promise<{ text: string }>;
  hash: (options: { uri: string }) => Promise<{ sha256: string }>;
  delete: (options: { uri: string }) => Promise<void>;
  rename: (options: { uri: string; name: string }) => Promise<{ uri: string }>;
  copy: (options: { sourceUri: string; destTreeUri: string; destRelativePath: string }) => Promise<void>;
  pdfInfo: (options: { uri: string }) => Promise<{ count: number }>;
  pdfPage: (options: { uri: string; page: number; max?: number }) => Promise<{ data: string }>;
  prepareMedia: (options: { uri: string }) => Promise<{ url: string }>;
}

export const FileTree = registerPlugin<FileTreePluginShape>('FileTree');
