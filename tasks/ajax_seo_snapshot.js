/*
 * ajax-seo-snapshot
 * https://github.com/ashier/ajax-seo-snapshot
 *
 * Copyright (c) 2013 Ashier de Leon
 * Licensed under the MIT license.
 *
 * Resource:
 * http://www.yearofmoo.com/2012/11/angularjs-and-seo.html
 */

module.exports = function(grunt) {
  'use strict';

  var cp = require('child_process');
  var util = require('util');
  var path = require('path');
  var chalk = require('chalk');
  var parser = require('xml2json');
  var phantomjs = require('phantomjs');
  var url = require('url');
  var binPath = phantomjs.path;
  var snap = path.join(__dirname, './bin/snap.sh');
  var phantom = require('node-phantom');

  var error = chalk.bold.red;
  var info = chalk.bold.blue;
  var success = chalk.bold.green;
  var warning = chalk.bold.yellow;
  var gray = chalk.bold.gray;

  grunt.registerTask('ajax-seo-snapshot', 'Generates snapshots of an ajax based project based on its sitemap.xml', function() {
    var done = this.async();

    var options = this.options({
      sitemap: '',
      outputDir: 'snapshots',
      evaluationInterval: 5000,
      host: '',

      element: {
        name: 'body',
        attribute: 'data-status',
        value: 'ready'
      }
    });

    grunt.verbose.writeflags(options, 'ajax-seo-snapshots options');

    var xml = grunt.file.read(options.sitemap);
    var data = JSON.parse(parser.toJson(xml));
    var currentPage = 0;
    var processPageInterval;
    var createPhantomInterval;
    var evaluationInterval;
    var writeFileInterval;
    var isEvaluationRunning = false;
    var createPhantomRetries = 0;
    var processPageRetries = 0;
    var writeFileRetries = 0;
    var maxRetries = 3;
    var statusFlag = false;
    var timeInterval = 5000;

    var writeFile = function(path, contents, cb) {
      grunt.file.write(path, contents);
      if (grunt.file.read(path)) {
        cb();
      } else {
        writeFileInterval = setInterval(function() {
          clearInterval(writeFileInterval);
          writeFileRetries += 1;
          if (writeFileRetries <= maxRetries) {
            writeFile(path, contents, cb)
          } else {
            cb(true);
          }
        }, evaluationInterval);
      }
    }

    // create page & evaluate
    var createPage = function(ph, host, filename, cb) {
      return ph.createPage(function(err, page) {
        return page.open(host, function(err, status) {
          if (status === 'success') {
            statusFlag = true;
            isEvaluationRunning = true;
            evaluationInterval = setInterval(function() {
              isEvaluationRunning = false;
              clearInterval(evaluationInterval);
              page.evaluate(function() {
                return document.documentElement.outerHTML;
              }, function(err, result) {

                createPhantomRetries = 0;
                processPageRetries = 0;

                if (!err) {
                  var path = options.outputDir + '/' + filename;
                  writeFile(path, result, function(err) {
                    if (!err) {
                      grunt.log.write(chalk.green(' ✔ \n'));
                      cb(null);
                    } else {
                      cb('Failed to write page');
                    }
                  });
                } else {
                  cb('Failed to Evaluate page');
                }
              });
            }, options.evaluationInterval);
          } else {
            cb('Failed to open');
          }
        });
      });
    }

    // create
    var processPage = function(ph, host, filename) {
      if (filename === '/') {
        filename = 'home.html';
      } else {
        filename += '.html';
      }
      grunt.log.write('\n' + warning(currentPage) + ' ' + info(host) + success(' → ') + gray(filename));
      return createPage(ph, host, filename, function(err) {
        if (err) {
          // retry if error is encountered...
          grunt.log.error(error('\nError encountered ') + error(err));
          processPageInterval = setInterval(function() {
            clearInterval(processPageInterval);
            if (!statusFlag) {
              processPageRetries += 1;
              if (processPageRetries <= maxRetries) {
                var loc = data.urlset.url[currentPage].loc;
                processPage(ph, loc, url.parse(loc).path);
              } else {
                ph.exit();
                createPhantom();
              }
            }
          }, timeInterval);
        } else {
          // process next page
          currentPage += 1;
          if (currentPage < data.urlset.url.length) {
            var loc = data.urlset.url[currentPage].loc;
            processPage(ph, loc, url.parse(loc).path);
          } else {
            // done
            ph.exit();
            cp.exec('pkill phantomjs');
            grunt.log.writeln(success('✔ ') + success('Completed.'));
          }
        }
      });
    }

    var createPhantom = function() {
      phantom.create(function(err, ph) {
        var loc = data.urlset.url[currentPage].loc;
        return processPage(ph, loc, url.parse(loc).path);
      });
    }

    // create phantom
    grunt.log.writeln(info('Ajax SEO Initialized'));
    createPhantom();

  });
};