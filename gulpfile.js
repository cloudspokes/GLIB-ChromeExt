/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */
/**
 * Gulp file to build the chrome extension
 */
'use strict';

const gulp = require('gulp');
const fs = require('fs');
const crx = require('gulp-crx-pack');
const del = require('del');
const manifest = require('./src/manifest.json');
var paths = {
  dist: './dist/'
};

gulp.task('clean', function (cb) {
  del([paths.dist], cb);
});

gulp.task('crx', function () {
  return gulp.src(['src'])
    .pipe(crx({
      privateKey: fs.readFileSync('./certs/key.pem', 'utf8'),
      filename: manifest.name + '.crx'
    }))
    .pipe(gulp.dest(paths.dist));
});

gulp.task('default', ['clean', 'crx']);
