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
const execSync = require('child_process').execSync;

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
  const useYarn = shouldUseYarn();
  const packageName = 'create-express-server';
  const dependencies = ['express'];
  const devDependencies = ['babel-preset-env', packageName];

  console.log('Installing packages. This might take a couple of minutes.');
  console.log(`Installing ${chalk.cyan('express')} and ${chalk.cyan(packageName)}...`);
  console.log();

  install(useYarn, dependencies, false, true)
    .then(() => install(useYarn, devDependencies, false, true, true))
    .then(() => init(root, appName));
}

/**
 * Check if yarn exists
 */
function shouldUseYarn() {
  try {
    execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 *
 */
function install(useYarn, dependencies, verbose, isOnline, dev) {
  return new Promise((resolve, reject) => {
    let command;
    let args;
    if (useYarn) {
      command = 'yarnpkg';
      args = ['add', '--exact'];
      if (!isOnline) {
        args.push('--offline');
      }
      if (dev) {
        args.push('--dev');
      }
      [].push.apply(args, dependencies);

      if (!isOnline) {
        console.log(chalk.yellow('You appear to be offline.'));
        console.log(chalk.yellow('Falling back to the local Yarn cache.'));
        console.log();
      }
    } else {
      command = 'npm';
      args = ['install', '--save-exact', '--loglevel', 'error'].concat(dependencies);
      if (dev) {
        args.push('--save-dev');
      } else {
        args.push('--save');
      }
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
