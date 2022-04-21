#!/usr/bin/env node
/**
 * This is a simple CLI to rebuild TS files without a full typescript setup. This is a stop-gap until we have enough TS to use a proper ts.config
 */
const yargs = require('yargs/yargs'); // CLI Framework
const { hideBin } = require('yargs/helpers'); // CLI Framework
const shell = require('shelljs');
const { flatten } = require('rambda');
// Platform agnostic access to shell
shell.config.silent = true; // Do not output to stdout, pipe to JS only instead
const fg = require('fast-glob'); // Fast FS regex searching for filenames
const fs = require('fs-extra'); // Sync filesystem functions
const migrateToTS = require('./migrateFromEsToTs');
const toEsModule = require('./migrateToESModules');

/**
 *******************************************************************************************
 * Helper Functions                                                                        *
 *******************************************************************************************
 */

/** JSON Pretty Print */
const pretty = (obj = {}) => console.log(JSON.stringify(obj, undefined, 2));

/** Removes generated files from path */
const cleanFiles = (path) => {
  shell.exec(`find ${path} -name "*.d.ts" -delete`);
  shell.exec(`find ${path} -name "*.js" -delete`);
  shell.exec(`find ${path} -name "*.js.map" -delete`);
};

/** Builds generated TS/JS interlop files */
const buildFiles = (path) => {
  if (!shell.which('tsc')) {
    console.log(
      'Typescript Compiler is not installed! please run "npm install -g typescript" or "npm install typescript --save-dev"'
    );
  } else {
    shell.exec(
      `tsc ${path}/index.ts --declaration --esModuleInterop --target ES5 --module commonjs`
    );
  }
};

/** Search FS for .typescript files */
const getTypesciptFlagFiles = () =>
  fg
    .sync(['.typescript', '**/.typescript'], {
      dot: true,
      ignore: ['node_modules', 'dist'],
      onlyFiles: true,
    })
    .map((path) => './'.concat(path.replace('/.typescript', '')));

/** Higher order function, that only logs if first function receives a truthy value, then return logger function */
const logOnly = (when) => (log) => {
  if (when) {
    console.log(log);
  }
};

/** ****************************************************************************************
 * TS-CLI                                                                                 *
 ******************************************************************************************
 */
yargs(hideBin(process.argv))
  .version('1.0.2')
  .epilogue('Created by "Adam Manuel"')
  .recommendCommands()
  .command(
    'list-any',
    'Lists all the TS files that have file scoped ES-lint ignore on "any" type declaration',
    (_yargs) => _yargs,
    (_argv) => {
      if (shell.which('ack')) {
        const fileLines = shell
          .exec(
            "ack 'eslint-disable @typescript-eslint/explicit-module-boundary-types' --ignore-dir=node_modules --type=ts"
          )
          .split('\n')
          .map((line) => {
            const vals = line.split(':');
            return {
              path: vals[0],
              lineNumber: vals[1],
              pathWithLine: `${vals[0]}:${vals[1]}`,
              line: vals[2],
            };
          })
          .filter(({ line }) => !!line);
        pretty(fileLines);
      }
    }
  )
  .command(
    'list-with [pattern]',
    'Lists all the TS files that have file scoped ES-lint ignore on "any" type declaration',
    (_yargs) =>
      _yargs.positional('pattern', {
        describe: 'Pattern to find in TS files',
      }),
    (_argv) => {
      if (shell.which('ack')) {
        const fileLines = shell
          .exec(`ack '${_argv.pattern}' --ignore-dir=node_modules --type=ts`)
          .split('\n')
          .map((line) => {
            const vals = line.split(':');
            return {
              path: vals[0],
              lineNumber: vals[1],
              pathWithLine: `${vals[0]}:${vals[1]}`,
              line: vals[2],
            };
          })
          .filter(({ line }) => !!line);
        pretty(fileLines);
      }
    }
  )
  .command(
    'list',
    'Lists all the .typescript flag files',
    (_yargs) => _yargs,
    (_argv) => {
      pretty(getTypesciptFlagFiles());
    }
  )
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .command(
    'build',
    'Builds the JS files',
    (_yargs) => _yargs,
    ({ verbose }) => {
      const logger = logOnly(verbose);
      logger('[1/3] Finding Flag Files (.typescript)');
      const paths = getTypesciptFlagFiles();
      logger(`[2/3] Found ${paths.length} flag files`);
      paths.forEach((path, i) => {
        console.log(` - [${i + 1}/${paths.length}] ${path}`);
        buildFiles(path);
      });
      logger(`[3/3] Building ${paths.length} flag files`);
    }
  )
  .command(
    'rebuild',
    'Cleans and builds the JS files',
    (_yargs) => _yargs,
    ({ verbose }) => {
      const logger = logOnly(verbose);
      logger('[1/3] Finding Flag Files (.typescript)');
      const paths = getTypesciptFlagFiles();
      logger(`[2/3] Found ${paths.length} flag files`);
      paths.forEach((path, i) => {
        console.log(` - [${i + 1}/${paths.length}] ${path}`);
        cleanFiles(path);
        buildFiles(path);
      });
      logger(`[3/3] Rebuilding ${paths.length} flag files`);
    }
  )
  .command(
    'clean',
    'Cleans the generated JS files',
    (_) => _,
    ({ verbose }) => {
      const logger = logOnly(verbose);
      logger('[1/3] Finding Flag Files (.typescript)');
      const paths = getTypesciptFlagFiles();
      logger(`[2/3] Found ${paths.length} flag files`);
      paths.forEach((path, i) => {
        logger(` - [${i + 1}/${paths.length}] ${path}`);
        cleanFiles(path);
      });
      if (verbose) {
        logger(`[3/3] Cleaned ${paths.length} flag files`);
      }
    }
  )
  .command(
    'flag [path]',
    'Cleans the generated JS files',
    (_) =>
      _.positional('path', {
        describe: 'path to flag with ".typescript"',
      }),
    ({ verbose, path }) => {
      const logger = logOnly(verbose);
      if (path) {
        logger('Creating new flag files');
        fs.writeFileSync(
          path.concat('/.typescript'),
          '// This is basically a FS flag for the Typescript Compiler'
        );
      } else {
        logger('Must include a path');
      }
    }
  )
  .command(
    'update-config [config]',
    'Updates the given tsconfig json by appending all .typescript flag files paths to the "includes"',
    (_yargs) =>
      _yargs.positional('config', {
        describe: 'path to tsconfig',
        default: './tsconfig.api.json',
      }),
    (_argv) => {
      const logger = logOnly(_argv.verbose);
      const tsconfig = fs.readJSONSync(_argv.config);
      logger('Found tsconfig');
      const includeFiles = tsconfig.include ? tsconfig.include : [];
      const newPathsArr = getTypesciptFlagFiles()
        .map((path) => path.replace('./', ''))
        .map((path) => [`${path}/**/*.ts`, `${path}/*.ts`]);
      /** @type {string[]} */
      const newPaths = flatten(newPathsArr);
      const include = Object.keys(
        [...includeFiles, ...newPaths].reduce(
          (prev, cur) => ({
            ...prev,
            [cur]: '',
          }),
          {}
        )
      );
      logger('New "include" value');
      logger(include);
      const newTsConfig = {
        ...tsconfig,
        include,
      };
      fs.writeFileSync(_argv.config, JSON.stringify(newTsConfig, undefined, 2));
      console.log('✅ Updated tsconfig');
    }
  )
  .command(
    'migrate [path]',
    'Migrates to TS',
    (_) =>
      _.positional('path', {
        describe: 'path to flag with ".typescript"',
      }),
    async ({ verbose, path }) => {
      const logger = logOnly(verbose);
      if (path) {
        logger('pt1');
        await toEsModule(path);
        logger('pt2');
        await migrateToTS.run(path);
        logger('done');
      } else {
        logger('Must include a path');
      }
    }
  )
  .parse();
