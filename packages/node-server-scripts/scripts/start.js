'use strict';
// Starts a local development environment

const nodemon = require('nodemon');
const babel = require('@babel/core');
const gaze = require('gaze');
const fs = require('fs-extra');
const path = require('path');

const build = require('./build');

const BUILD_DIR = 'dist';

function start() {
  // Build before start
  build();

  // Watch the src and transpile when changed
  gaze('src/**/*', function(err, watcher) {
    if (err) throw err;
    watcher.on('changed', function(sourceFile) {
      console.log(sourceFile + ' has changed');
      try {
        // Make sure it works with `/` (Unix) and `\` (Windows)
        var targetFile = path
          .relative(__dirname, sourceFile)
          .replace(/([\/\\])src([\/\\])/, '$1dist$2');
        targetFile = path.resolve(__dirname, targetFile);

        if (sourceFile.match(/\.(js|ts|json)$/i)) {
          // Check if we have a ts file and convert the ending to js
          targetFile = targetFile.replace(/\.ts$/i, '.js');

          // Check if we have javascript files we have to compile
          fs.writeFileSync(targetFile, babel.transformFileSync(sourceFile).code);
        } else {
          // Static file simply copy paste
          fs.createReadStream(sourceFile).pipe(fs.createWriteStream(targetFile));
        }
      } catch (e) {
        console.error(e.message, e.stack);
      }
    });
  });

  try {
    // Run and watch dist
    nodemon({
      script: 'dist/app.js',
      ext: 'js ts json',
      watch: BUILD_DIR,
      execMap: {
        js: 'node --trace-warnings',
      },
    });
  } catch (e) {
    console.error(e.message, e.stack);
  }

  process.once('SIGINT', function() {
    process.exit(0);
  });
}

start();
