const shell = require("shelljs");
const { getFilesAndFolders } = require("./shared/fs-extra");

shell.config.silent = true;

const pattern = new RegExp(/\[37m\[41m ERR \[49m\[39m(.*)/g);

/** Casts an iteratable into an array */
function toArray(response) {
  return [...response];
}

/**
 *
 * @param {string} output
 * @returns {Array<string>}
 */
function grabErrors(output) {
  return (
    toArray(output.matchAll(pattern)).map(
      ([_fullMatch, captureGroup]) => captureGroup
    ) || []
  );
}

/**
 *
 * @param {string} folder
 */
function createCommand(folder) {
  return `npx cjs-to-es6 ./${folder} --verbose`;
}

module.exports = (path = "") =>
  new Promise((resolve) => {
    const command = createCommand(path);
    console.log(`[upgrading ${path}]`);
    const result = grabErrors(shell.exec(command).stdout);
    const resultEmoji = result.length === 0 ? "✅" : "🆇 ";
    console.log(resultEmoji);
    console.log(
      `[${result.length} errors]`.concat(result.map((_) => "\n".concat(_)))
    );
    resolve();
  });
