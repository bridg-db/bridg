import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { mkdir, readdir, rename } from 'fs/promises';
import path from 'path';
import prettier from 'prettier';

// https://gist.github.com/drodsou/de2ba6291aea67ffc5bc4b52d8c32abd
export const writeFileSafely = (filename: string, content: string) => {
  // -- normalize path separator to '/' instead of path.sep,
  // -- as / works in node for Windows as well, and mixed \\ and / can appear in the path
  let filepath = filename.replace(/\\/g, '/');

  // -- preparation to allow absolute paths as well
  let root = '';
  if (filepath[0] === '/') {
    root = '/';
    filepath = filepath.slice(1);
  } else if (filepath[1] === ':') {
    root = filepath.slice(0, 3); // c:\
    filepath = filepath.slice(3);
  }

  // -- create folders all the way down
  const folders = filepath.split('/').slice(0, -1); // remove last item, file
  folders.reduce(
    (acc, folder) => {
      const folderPath = acc + folder + '/';
      if (!existsSync(folderPath)) {
        mkdirSync(folderPath);
      }
      return folderPath;
    },
    root, // first 'acc', important
  );

  // -- write file
  writeFileSync(root + filepath, content);
};

export const readFileAsString = (filepath: string) =>
  readFileSync(filepath, { encoding: 'utf8', flag: 'r' });

export const deleteFileSafely = (filePath: string) => {
  const exists = existsSync(filePath);
  exists && rmSync(filePath);
};

export const deleteDirSafely = (dirPath: string) => {
  const exists = existsSync(dirPath);
  exists && rmSync(dirPath, { recursive: true, force: true });
};

export const moveDirContentsToDirectory = async (
  source: string,
  destination: string,
): Promise<void[]> => {
  if (!existsSync(destination)) await mkdir(destination, { recursive: true });
  const files = await readdir(source);

  return Promise.all(
    files.map((file) => rename(path.join(source, file), path.join(destination, file))),
  );
};

export const formatFile = (content: string): Promise<string> => {
  return new Promise((res, rej) =>
    prettier.resolveConfig(process.cwd()).then((options) => {
      if (!options) {
        res(content); // no prettier config was found, no need to format
      }

      try {
        const formatted = prettier.format(content, {
          ...options,
          parser: 'typescript',
        });

        res(formatted);
      } catch (error) {
        console.log('ERROR', error);

        rej(error);
      }
    }),
  );
};

export const getRelativePathWithLeadingDot = (sourceFile: string, targetFile: string) => {
  const sourceDir = path.dirname(sourceFile);
  const loc = path.relative(sourceDir, targetFile);
  // x/y/z => ./x/y/z
  return loc.startsWith('.') ? loc : `./${loc}`;
};

export const getRelativeImportPath = (sourceFile: string, importedFile: string) => {
  const location = getRelativePathWithLeadingDot(sourceFile, importedFile);
  const [beforeNM, afterNM] = location.split('node_modules/');
  // ./x/y/node_modules/z => z || ./x/y/z => ./x/y/z
  return afterNM || beforeNM;
};
