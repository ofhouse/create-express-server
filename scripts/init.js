'use strict';

/**
 * create-express-server
 *
 * Based on create-react-app: https://github.com/facebookincubator/create-react-app
 * Copyright (c) 2015-2017, Facebook, Inc.
 *
 * This source code is licensed under the MIT license.
 */

const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');

module.exports = function(appPath, appName) {
  const ownPackageName = require(path.join(__dirname, '..', 'package.json')).name;
  const ownPath = path.join(appPath, 'node_modules', ownPackageName);
  const appPackage = require(path.join(appPath, 'package.json'));

  appPackage.dependencies = appPackage.dependencies || {};

  // Setup the script rules
  appPackage.scripts = {
    start: 'create-express-server start',
    build: 'create-express-server build',
  };

  fs.writeFileSync(path.join(appPath, 'package.json'), JSON.stringify(appPackage, null, 2));

  const templatePath = path.join(ownPath, 'template');

  console.log('templatePath', templatePath);

  if (fs.existsSync(templatePath)) {
    fs.copySync(templatePath, appPath);
  } else {
    console.error(`Could not locate supplied template: ${chalk.green(templatePath)}`);
    return;
  }
};
