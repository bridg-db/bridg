import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdir,
  rename,
  rmSync,
  writeFileSync,
} from 'fs';
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
    root // first 'acc', important
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

export const moveDirContentsToDirectory = (
  sourceDirectory: string,
  destinationDirectory: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    readdir(sourceDirectory, (err, files) => {
      if (err) {
        console.error('Error reading source directory:', err);
        return reject(err);
      }

      files.forEach((file) => {
        const sourceFilePath = path.join(sourceDirectory, file);
        const destinationFilePath = path.join(destinationDirectory, file);

        rename(sourceFilePath, destinationFilePath, (err) => {
          if (err) {
            console.error(`Error moving ${file}:`, err);
          } else {
            console.log(`Moved ${file} to destination.`);
          }
        });
      });
      resolve('done');
    });
  });
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
    })
  );
};
