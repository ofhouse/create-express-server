/**
 * Populates the newly created package with the bootstrap files from
 * the corresponding template
 */
'use strict';

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

function noPackageFile(src) {
  if (src.endsWith('package.json')) {
    return false;
  }

  return true;
}

module.exports = function(appPath, appName, originalDirectory, template) {
  const appPackage = require(path.join(appPath, 'package.json'));
  const ownPath = path.dirname(require.resolve(path.join(__dirname, '..', 'package.json')));
  const templatePath = path.join(ownPath, 'templates', template);

  const templatePackage = require(path.join(templatePath, 'package.json'));

  appPackage.scripts = {
    start: 'node-server-scripts start --config="./env.json"',
    build: 'node-server-scripts build',
  };

  appPackage.main = templatePackage.main || './src/app.js';

  fs.writeFileSync(
    path.join(appPath, 'package.json'),
    JSON.stringify(appPackage, null, 2) + os.EOL
  );

  // Copy the files for the user
  if (fs.existsSync(templatePath)) {
    fs.copySync(templatePath, appPath, {
      filter: noPackageFile,
    });
  } else {
    console.error(`Could not locate supplied template: ${chalk.green(templatePath)}`);
    return;
  }

  // Rename gitignore after the fact to prevent npm from renaming it to .npmignore
  // See: https://github.com/npm/npm/issues/1862
  try {
    fs.moveSync(path.join(appPath, 'gitignore'), path.join(appPath, '.gitignore'), []);
  } catch (err) {
    // Append if there's already a `.gitignore` file there
    if (err.code === 'EEXIST') {
      const data = fs.readFileSync(path.join(appPath, 'gitignore'));
      fs.appendFileSync(path.join(appPath, '.gitignore'), data);
      fs.unlinkSync(path.join(appPath, 'gitignore'));
    } else {
      throw err;
    }
  }
};
