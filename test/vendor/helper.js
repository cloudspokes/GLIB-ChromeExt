'use strict';

var jsdom = require('jsdom');

/**
 * Init dom and set globals to nodejs scope
 * @param callback the callback
 */
function initDom(callback) {
  jsdom.env({
    html: '<html><body></body></html>',
    scripts: [
      'http://code.jquery.com/jquery-1.5.min.js'
    ],
    done: function (err, window) {
      if (err) {
        return callback(err);
      }
      global.window = window;
      global.document = window.document;
      callback(null, window);
    }
  });
}

/**
 * Create topcoder button
 * @returns {HTMLElement} the button
 */
function createTCButton() {
  var btn = document.createElement('button');
  btn.className = 'btn btn-sm btn-default btn-topcoder';
  btn.innerHTML = 'Topcoder';
  return btn;
}

module.exports = {
  initDom,
  createTCButton
};
