const shell = require("shelljs");

shell.config.silent = true;

/** Casts an iteratable into an array */
function toArray(response) {
  return [...response];
}

function commandAtPath(path) {
  return `find ${path} -type f -regex '^.*\.js$'`;
}

function commandRenameFile(path) {
  return `mv -n ${path} ${path.replace(".j", ".t")}`;
}

module.exports = async function (path = "") {
  return new Promise((resolve) => {
    const [_, ...files] = toArray(
      shell.exec(commandAtPath(path)).stdout.split("\n")
    ).reverse();
    files
      .map((file) => ({ file, fileCommand: commandRenameFile(file) }))
      .forEach((command, i, arr) => {
        // console.log(command)
        const result = shell.exec(command.fileCommand).code === 0;
        console.log(`[${result ? "✅" : "🅧"}] ${command.file}`);
        if (arr.length === i + 1) {
          resolve();
        }
      });
  });
};
