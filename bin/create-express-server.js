#!/usr/bin/env node

/**
 * create-express-server
 *
 * Based on create-react-app: https://github.com/facebookincubator/create-react-app
 * Copyright (c) 2015-2017, Facebook, Inc.
 *
 * This source code is licensed under the MIT license.
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const program = require('commander');
const spawn = require('cross-spawn');

const packageJson = require('../package.json');
const init = require('../scripts/init');
const start = require('../scripts/start');
const build = require('../scripts/build');

let arg;

program
  .version(packageJson.version)
  .action(argument => {
    arg = argument;
  })
  .parse(process.argv);

runApp(arg);

function runApp(argument) {
  switch (argument) {
    // Run dev server
    case 'start': {
      return start();
    }

    // Build the app
    case 'build': {
      return build();
    }
  }

  // On default create new app
  createApp(argument);
}

function createApp(name) {
  const root = path.resolve(name);
  const appName = path.basename(root);

  fs.ensureDirSync(name);

  console.log(`Creating a new express.js app in ${chalk.green(root)}.`);
  console.log();

  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
  };

  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2));

  const originalDirectory = process.cwd();
  process.chdir(root);

  run(root, name);
}

function run(root, appName) {
  const useYarn = true;
  const packageName = 'create-express-server';
  // TODO:
  // const allDependencies = ['express', packageName];
  const allDependencies = ['express', 'babel-preset-env'];

  console.log('Installing packages. This might take a couple of minutes.');
  console.log(`Installing ${chalk.cyan('express')} and ${chalk.cyan(packageName)}...`);
  console.log();

  install(useYarn, allDependencies, false, true).then(() => packageName);

  init(root, appName);
}

/**
 *
 */
function install(useYarn, dependencies, verbose, isOnline) {
  return new Promise((resolve, reject) => {
    let command;
    let args;
    if (useYarn) {
      command = 'yarnpkg';
      args = ['add', '--exact'];
      if (!isOnline) {
        args.push('--offline');
      }
      [].push.apply(args, dependencies);

      if (!isOnline) {
        console.log(chalk.yellow('You appear to be offline.'));
        console.log(chalk.yellow('Falling back to the local Yarn cache.'));
        console.log();
      }
    } else {
      command = 'npm';
      args = ['install', '--save', '--save-exact', '--loglevel', 'error'].concat(dependencies);
    }

    if (verbose) {
      args.push('--verbose');
    }

    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', code => {
      if (code !== 0) {
        reject({
          command: `${command} ${args.join(' ')}`,
        });
        return;
      }
      resolve();
    });
  });
}
