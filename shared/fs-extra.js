const shell = require('shelljs');

/** Changable constants for script */
const CONSTANTS = {
  FILE_MODE: '33188',
  FOLDER_MODE: '16877',
};

/** Casts an iteratable into an array */
const toArray = (response) => [...response];

/**
 * Maps the files into a map of the mode property of the file
 * @param {fsObject} files
 * @returns
 * @example {'33188': fsObject[], '16877': fsObject[] }
 */
function seperateFilesByMode(files) {
  return files.reduce((prev, cur) => {
    if (prev[cur.mode]) {
      prev[cur.mode].push(cur);
    } else {
      prev[cur.mode] = [cur];
    }
    return {
      ...prev,
    };
  }, {});
}

/**
 * Gets all files and folders within 1 level of the directory file structure
 * @param {string} path unix path to look at
 * @returns {{files: { lastChange: string; lastChangeUnixT: number; name: string; path: string; fullPath: string }[], folders: { lastChange: string; lastChangeUnixT: number; name: string; path: string; fullPath: string }[]}} an object containing the files and folders as arrays in the respective properties
 */
function getFilesAndFolders(path = '') {
  // Removes magic # property and add a full path variable with file name
  function reformat(item) {
    delete item.mode;
    return {
      ...item,
      path,
      fullPath: `${path}/${item.name}`,
    };
  }

  // Grab data from file system
  const filesAndFolders = toArray(shell.ls('-l', path)).map((file) => ({
    lastChange: file.mtime,
    lastChangeUnixT: new Date(file.mtime).valueOf(),
    mode: file.mode,
    name: file.name,
  }));

  // Seperate files from folders by file mode property
  const seperated = seperateFilesByMode(filesAndFolders);

  // Filter all files that don't pass regex, and format data
  const files = (seperated[CONSTANTS.FILE_MODE] || []).map(reformat);
  const folders = (seperated[CONSTANTS.FOLDER_MODE] || []).map(reformat);

  // Cache all the individual files in an array so recursion isn't necessary at the end
  // cachedFiles.push(...files);
  return { files, folders };
}

module.exports = {
  seperateFilesByMode,
  getFilesAndFolders,
};
