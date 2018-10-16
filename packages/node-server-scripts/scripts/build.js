'use strict';

const glob = require('glob');
const babel = require('@babel/core');
const fs = require('fs-extra');
const path = require('path');
const mkdirp = require('mkdirp');

const ENV = process.env.NODE_ENV;

/**
 * Builds the project with babel and outputs it to dist/
 */
const SOURCE_DIR = 'src';
const OUTPUT_DIR = 'dist';

function getFilePattern(testing) {
  if (testing) {
    return '/**/*.@(j|t)s';
  }

  // Exclude `.spec` files if we are not in testing mode
  return '/**/!(*.spec).@(j|t)s';
}

function writeFile(sourcePath, transform, replace, outputDir) {
  return new Promise((resolve, reject) => {
    try {
      const target = path.relative(__dirname, sourcePath).replace(replace, `$1${outputDir}$2`);
      let targetFile = path.resolve(__dirname, target);

      // Check if we have a ts file and convert the ending to js
      targetFile = targetFile.replace(/\.ts$/i, '.js');

      mkdirp(path.dirname(targetFile), function(err) {
        if (err) {
          throw err;
        }

        if (transform) {
          // Convert with babel
          babel.transformFile(sourcePath, function(err, result) {
            if (err) {
              throw err;
            }

            // Write file
            fs.writeFile(targetFile, result.code, err => {
              if (err) {
                throw err;
              }
              resolve({ target: target, source: sourcePath });
            });
          });
        } else {
          fs.createReadStream(sourcePath)
            .pipe(fs.createWriteStream(targetFile))
            .end(() => resolve({ target: target, source: sourcePath }));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

function transform(dir, outputDir) {
  const path = [dir, getFilePattern(ENV === 'test')].join('');
  const replacePattern = new RegExp(`([\\/\\\\])${dir}([\\/\\\\])`);

  glob(path, function(err, files) {
    if (err) {
      throw err;
    }

    const promises = [];
    files.forEach(file => {
      promises.push(writeFile(file, true, replacePattern, outputDir));
    });

    Promise.all(promises)
      .then(results => {
        results.forEach(result => console.log(result.source, ' -> ', result.target));
      })
      .catch(err => {
        console.err(err);
      });
  });
}

module.exports = function() {
  transform(SOURCE_DIR, OUTPUT_DIR);
};
