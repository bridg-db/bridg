// https://github.com/microsoft/TypeScript-wiki/blob/main/Using-the-Compiler-API.md
import { readdirSync, statSync } from 'fs';
import path from 'path';
import * as ts from 'typescript';

export function compileTsDir(
  dirPath: string,
  options: ts.CompilerOptions,
): void {
  const fileNames = getAllFilesInDirectory(dirPath);
  let program = ts.createProgram(fileNames, options);
  let emitResult = program.emit();

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!,
      );
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        '\n',
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${
          character + 1
        }): ${message}`,
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      );
    }
  });
}

// function that takes a filepath and returns an array of files, recursively looking through dirs
function getAllFilesInDirectory(filepath: string): string[] {
  const result: string[] = [];

  function traverseDirectory(currentPath: string) {
    const files = readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        traverseDirectory(filePath);
      } else if (stat.isFile()) {
        result.push(filePath);
      }
    }
  }

  traverseDirectory(filepath);

  return result;
}
