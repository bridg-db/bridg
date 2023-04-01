// https://gist.github.com/drodsou/de2ba6291aea67ffc5bc4b52d8c32abd
import fs from 'fs';

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
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      return folderPath;
    },
    root, // first 'acc', important
  );

  // -- write file
  fs.writeFileSync(root + filepath, content);
};

export const readFileAsString = (filepath: string) => fs.readFileSync(filepath, { encoding: 'utf8', flag: 'r' });
