import { registerPlugin } from '@capacitor/core';

export interface FileTreeEntry {
  name: string;
  uri: string;
  isDirectory: boolean;
  size: number;
  mimeType?: string;
}

export interface FileTreeMoveOptions {
  sourceUri: string;
  destTreeUri: string;
  destRelativePath: string;
}

export interface FileTreePluginShape {
  list: (options: { treeUri: string }) => Promise<{ files: FileTreeEntry[] }>;
  check: (options: { treeUri: string }) => Promise<{ ok: boolean }>;
  pickTree: (options: { startDocumentUri?: string }) => Promise<{ treeUri: string }>;
  move: (options: FileTreeMoveOptions) => Promise<void>;
  thumbnail: (options: { uri: string }) => Promise<{ data: string }>;
}

export const FileTree = registerPlugin<FileTreePluginShape>('FileTree');