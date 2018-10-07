/**
 * Gets the packageJson from a given template and writes them to stdout.
 * This is used by create-node-server package to determine which dependencies
 * should be installed
 */

'use strict';

module.exports = function(template) {
  const packageJson = require(`../templates/${template}/package.json`);
  process.stdout.write(JSON.stringify(packageJson));
};
