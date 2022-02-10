/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import fs from 'fs';
import { URI, Utils } from 'vscode-uri';

export interface FileSystemNode {
    readonly isFile: boolean;
    readonly isDirectory: boolean;
    readonly name: string;
    readonly container: URI;
}

export type FileSystemFilter = (node: FileSystemNode) => boolean;

export interface FileSystemProvider {
    /**
     * Reads a document asynchronously from a given URI.
     * @returns The string content of the file with the specified URI.
     */
    readFile(uri: URI): Promise<string>;
    /**
     * Reads a document synchronously from a given URI.
     * @returns The string content of the file with the specified URI.
     */
    readFileSync(uri: URI): string;
    /**
     * Traverses a directory structure and returns all paths within.
     * @param root The root path where the traversal starts.
     * @param filter An optional filter that determines whether a directory or file should be included while traversing.
     * @returns All URIs which match the specified filter in the directory structure.
     */
    traverse(root: URI, filter?: FileSystemFilter): Promise<URI[]>;
}

export class NodeFileSystemProvider implements FileSystemProvider {

    protected readonly encoding: BufferEncoding = 'utf-8';

    readFile(uri: URI): Promise<string> {
        return fs.promises.readFile(uri.fsPath, this.encoding);
    }

    readFileSync(uri: URI): string {
        return fs.readFileSync(uri.fsPath, this.encoding);
    }

    async traverse(root: URI, filter?: FileSystemFilter): Promise<URI[]> {
        const uris: URI[] = [];
        await this.traverseFolder(root, filter, uri => uris.push(uri));
        return uris;
    }

    protected async traverseFolder(folderPath: URI, filter: FileSystemFilter | undefined, collector: (uri: URI) => void): Promise<void> {
        const content = await this.getFolderNodes(folderPath);
        for (const entry of content) {
            if (!filter || filter(entry)) {
                const uri = Utils.resolvePath(folderPath, entry.name);
                if (entry.isDirectory) {
                    await this.traverseFolder(uri, filter, collector);
                } else if (entry.isFile) {
                    collector(uri);
                }
            }
        }
    }

    protected async getFolderNodes(folderPath: URI): Promise<FileSystemNode[]> {
        const dirents = await fs.promises.readdir(folderPath.fsPath, { withFileTypes: true });
        return dirents.map(dirent => ({
            dirent, // Include the raw entry, it may be useful...
            isFile: dirent.isFile(),
            isDirectory: dirent.isDirectory(),
            name: dirent.name,
            container: folderPath
        }));
    }
}

