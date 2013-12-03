/*
 * grunt-angular-seo-snapshot
 * https://github.com/ashier/angular-seo-snapshot
 *
 * Copyright (c) 2013 Ashier de Leon
 * Licensed under the MIT license.
 *
 * Resource:
 * http://www.yearofmoo.com/2012/11/angularjs-and-seo.html
 */

var exec = require('child_process').exec,
    child;

child = exec('phantomjs --version',
  function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
});

