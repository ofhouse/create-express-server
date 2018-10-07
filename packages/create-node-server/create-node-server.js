'use strict';

const chalk = require('chalk');
const commander = require('commander');
const fs = require('fs-extra');
const path = require('path');
const spawn = require('cross-spawn');

const packageJson = require('./package.json');

let projectName;
let projectTemplate;

const program = new commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments('<project-directory> [template]')
  .action((name, template) => {
    projectName = name;
    // projectTemplate = template;
    projectTemplate = 'ts-koa-apollo';
  })
  .option(
    '--scripts-version <alternative-package>',
    'use a non-standard version of node-server-scripts'
  )
  .parse(process.argv);

createServer(projectName, projectTemplate, program.scriptsVersion);

/**
 * Creates the project directory and intializes it with a package.json
 */
function createServer(name, template, version) {
  const root = path.resolve(name);
  const appName = path.basename(root);

  fs.ensureDirSync(name);

  console.log(`Creating a new node server in ${chalk.blue(root)}.`);
  console.log();

  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
  };

  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(packageJson, null, 2));

  setup(root, appName, version, template);
}

/**
 * Does the setup in the project folder (installs dependencies and adds initial project files)
 */
function setup(root, appName, version, template) {
  const originalDirectory = process.cwd();
  const { packageToInstall, packageName } = getInstallPackage(version, originalDirectory);

  console.log({ originalDirectory });

  console.log('Installing packages.');
  console.log(`Installing ${chalk.cyan(packageToInstall)}...`);
  console.log();

  install(root, [packageToInstall], 'dev')
    .then(async () => {
      // Get the package.json for the template from the newly installed package
      // and install additional dependencies
      const templatePackages = await executeNodeScript(
        {
          cwd: path.join(process.cwd(), appName),
          args: [],
        },
        [template],
        `
        var init = require('${packageName}/scripts/dependencies.js');
        init.apply(null, JSON.parse(process.argv[1]));
        `
      );

      // The node-server-scripts package sends the required dependencies over the
      // stdout as stringified JSON
      const templatePackage = JSON.parse(templatePackages);
      return templatePackage;
    })
    .then(async templatePackage => {
      const templateDependencies = Object.keys(templatePackage.dependencies);

      const message = templateDependencies.reduce((result, dependency, index) => {
        if (index === 1) {
          return `${chalk.cyan(result)}, ${chalk.cyan(dependency)}`;
        }
        return `${result}, ${chalk.cyan(dependency)}`;
      });

      console.log(`Installing additional dependencies ${message}...`);
      console.log();

      await install(root, templateDependencies);
      return templatePackage;
    })
    .then(templatePackage => {
      const templateDevDependencies = Object.keys(templatePackage.devDependencies);

      const message = templateDevDependencies.reduce((result, dependency, index) => {
        if (index === 1) {
          return `${chalk.cyan(result)}, ${chalk.cyan(dependency)}`;
        }
        return `${result}, ${chalk.cyan(dependency)}`;
      });

      console.log(`Installing additional devDependencies ${message}...`);
      console.log();

      return install(root, templateDevDependencies, 'dev');
    })
    .then(() => {
      return packageName;
    })
    .then(async packageName => {
      await executeNodeScript(
        {
          cwd: path.join(process.cwd(), appName),
          args: [],
        },
        [root, appName, originalDirectory, template],
        `
        var init = require('${packageName}/scripts/init.js');
        init.apply(null, JSON.parse(process.argv[1]));
        `,
        true
      );
    })
    .catch(err => {
      console.error('Could not install', err);
    });
}

/**
 * Installs the packages in the project folder
 */
function install(root, dependencies, type) {
  return new Promise((resolve, reject) => {
    let command = 'yarnpkg';
    let args = ['add', '--exact'];

    if (type === 'dev') {
      args.push('--dev');
    }

    // Merge array
    [].push.apply(args, dependencies);

    args.push('--cwd');
    args.push(root);

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

function getInstallPackage(version, originalDirectory) {
  const packageName = 'node-server-scripts';
  let packageToInstall = packageName;

  // Check if a local version should installed
  if (version && version.match(/^file:/)) {
    // TODO: Check if the package.json exists and fetch the package-name from it
    packageToInstall = `file:${path.resolve(originalDirectory, version.match(/^file:(.*)?$/)[1])}`;
  }

  return { packageToInstall, packageName };
}

function executeNodeScript({ cwd, args }, data, source, showOutput = false) {
  return new Promise((resolve, reject) => {
    let processData = '';

    const child = spawn(process.execPath, [...args, '-e', source, '--', JSON.stringify(data)], {
      cwd,
      stdio: showOutput ? 'inherit' : undefined,
    });

    // Store the output from process when not directly shown on terminal
    if (!showOutput) {
      child.stdout.on('data', data => {
        processData += data;
      });
    }

    child.on('close', code => {
      if (code !== 0) {
        reject({
          command: `node ${args.join(' ')}`,
        });
        return;
      }
      resolve(processData);
    });
  });
}
