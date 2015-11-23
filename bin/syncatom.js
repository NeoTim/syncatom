#! /usr/bin/env node

/*

*fevim init vimrc
fevim install [package]
fevim uninstall [package]
fevim list fevim config plugin
fevim config basic
fevim config gui

*/
require('shelljs/global');
var fs = require('fs');
var program = require('commander');
var userhome = require('userhome');
var archy = require('archy');
var path = require('path');
var jetpack = require('fs-jetpack');
var Promise = require('bluebird');

Promise.promisifyAll(fs);

var packagesPath = userhome('.atom', 'packages');

program
  .version('v1.0.1')
  .option('-v, --version', 'display version');

program
  .command('push [repo]')
  .description('sync atom config easy.')
  .action(function(repo, options) {

    if (options.parent.rawArgs.length !== 4) {
      throw new Error('To many arguments, you should pass one argument');
    }


    fs.readdirAsync(packagesPath)
      .then(function writeSyncatomFile(data) {
        var syncatomPath = userhome('.atom', 'syncatom.json');
        var newJsonData = [];

        if (!jetpack.exists(syncatomPath)) {
          jetpack.file(syncatomPath);
          jetpack.write(syncatomPath, []);
        }

        var oldJsonData = jetpack.read(syncatomPath, 'json');

        data
          .filter(function(item) {
            return !(item.charAt(0) === '.' || item.indexOf('.md') > -1);
          })
          .forEach(function(item1) {
            if (!oldJsonData.length) {
              return newJsonData.push({
                name: item1
              });
            }

            var result = oldJsonData.filter(function(item2) {
              return item2.name === item1;
            });

            if (!result.length) {
              newJsonData.push({
                name: item1
              });
            }

          });

        jetpack.write(syncatomPath, oldJsonData.concat(newJsonData));
      })
      .then(function writeGitIgnoreFile() {
        var gitIgnorePath = userhome('.atom', '.gitignore');
        var ignoreContent = '' +
          '.DS_Store\n' +
          '.apm/\n' +
          '.git-history/\n' +
          '.node-gyp/\n' +
          'compile-cache/\n' +
          'packages/\n' +
          'projects.cson\n' +
          'snippets.cson\n' +
          'storage/';

        fs.writeFileAsync(gitIgnorePath, ignoreContent);
      })
      .then(function checkGit() {
        if (!which('git')) {
          echo('Sorry, this script requires git!');
          exit(1);
        }
      })
      .then(function goToAtomDir() {
        cd(userhome('.atom'));
      })
      .then(function readAtomDir() {
        return fs.readdirAsync(userhome('.atom'));
      })
      .then(function commitConfig(data) {
        if (data.indexOf('.git') > -1) {
          exec('git add . --all');
          exec('git commit -am "commit at ' + new Date() + '"');
          exec('git push --set-upstream origin master -f');
        } else {
          exec('git init');
          exec('git commit -am "commit at ' + new Date() + '"');
          exec('git remote add origin git@github.com:' + repo + '.git');
          exec('git push -u origin master');
        }
      })
      .catch(function(err) {
        console.log('something wrong');
        console.log(err);
      });

  });

program
  .command('pull [repo]')
  .description('Get a atom config')
  .action(function(repo, options) {
    var atomPath = userhome('.atom');
    var dotGitPath = userhome('.atom', '.git');
    var syncatomPath = userhome('.atom', 'syncatom.json');
    var cloneCommand = 'git clone git@github.com:' + repo + '.git ' + userhome('.atom');

    if (options.parent.rawArgs.length !== 4) {
      throw new Error('To many arguments, you should pass one argument');
    }

    if (!fs.existsSync(atomPath)) {
      jetpack.dir(atomPath);
    }

    if (!fs.existsSync(syncatomPath)) {
      return console.log(syncatomPath + 'is not exists');
    }

    cd(userhome('.atom'));

    if (fs.existsSync(dotGitPath)) {
      exec('git pull', function(code, ouput) {
        var oldLists = jetpack.list(packagesPath);
        var newLists = jetpack.read(syncatomPath, 'json');

        newLists.forEach(function(newItem) {
          if (oldLists.indexOf(newItem.name) === -1) {
            try {
              exec('apm install ' + newItem.name);
            } catch (err) {
              // console.log();
            }
          }
        });

      });

    }

  });

program.parse(process.argv);
