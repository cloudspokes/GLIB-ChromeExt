/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Represents the main content script executed in github domain
 *
 * Changes in 1.1 (GLIB-AUTHORIZATION AND ENDPOINT CHANGE)
 * - Added authentication for topcoder
 *
 * @author TCSASSEMBLER
 * @version 1.1
 */

var CHECK_INTERVAL = 50;
var TOKEN_KEY_TOPCODER = 'glib::topcoder_token';
var ENVIRONMENT = 'glib::environment';

OAuth.initialize(OAUTH_API_KEY);

// current view information
// parsed from URL
var isDevEnvironment = false;

/**
 * setChromeStorage  set value in chrome storage
 * @param {string} key   key to set in chrmoe stoarge
 * @param {object} value value to set
 */
function setChromeStorage(key, val) {
  var obj = {};
  obj[key] = val;
  chrome.storage.local.set(obj);
}

function removeChromeStorage(key) {
  chrome.storage.local.remove(key);
}

function setEnv() {
  chrome.storage.local.get(ENVIRONMENT, function (result) {
    isDevEnvironment = result[ENVIRONMENT] || false;
  });
}

function getTCEndpoint() {
  return (isDevEnvironment ? TC_ENDPOINT_DEV : TC_ENDPOINT_PROD);
}


/**
 * Initiialize vendor if domain matches current window location
 * @param  {Class} Costructor the vendor constructor
 * @param  {String} key the key storage for domain setting
 * @param  {String} defaultDomain the default domain
 * @return {Object} the vendor object or null
 */
function getVendor(Costructor, key, defaultDomain) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, function (result) {
      const domain = result[key] || defaultDomain;
      if (location.host.toLowerCase() === domain.toLowerCase()) {
        resolve(new Costructor(domain));
      } else {
        resolve();
      }
    });
  });
}


function injectButton(vendor) {
  if (vendor) {
    // thkang91: removed setInterval

    if (document.getElementById('LAUNCH_ON_TC') || document.getElementById('LAUNCH_MULTIPLE_ON_TC')) {
      // button already exists
      return;
    }

    if (!vendor.isEnabled()) {
      return;
    }

    var btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-default btn-topcoder';
    btn.innerHTML = 'Topcoder';
    btn.setAttribute('id', 'LAUNCH_ON_TC');
    btn.addEventListener('click', function () {
      btn.setAttribute('disabled', 'disabled');
      btn.innerText = 'Processing...';
      launchOnTC(function () {
        btn.removeAttribute('disabled');
        btn.innerText = 'Topcoder';
      }, vendor);
    });
    vendor.addButton(btn);

  }
}

/**
 * checkTopCoderAuthentication calls background.js to setup OAuth token
 * @param  {Function} cb callback to execute after token retrieval, called with an error object if auth fails
 */
function checkTopCoderAuthentication(cb) {
  chrome.runtime.sendMessage({oAuthIG: true}, function (result) {
    if (!result.oAuthIGResult.error) {
      cb();
    } else {
      cb({error: true, message: 'failed to authenticate to Topcoder'});
    }
  });
}

function injectMultipleLaunchButton(vendor) {
  if (vendor) {
    // thkang91: removed setInterval

    if (document.getElementById('LAUNCH_MULTIPLE_ON_TC') || document.getElementById('LAUNCH_ON_TC')) {
      // button already exists
      return;
    }

    if (!vendor.isMultiEnabled()) {
      return;
    }

    var div = document.createElement('div');
    div.className = 'right';
    var btn = document.createElement('button');
    btn.className = 'btn btn-default btn-topcoder';
    btn.innerHTML = 'Topcoder';
    btn.setAttribute('id', 'LAUNCH_MULTIPLE_ON_TC');
    btn.addEventListener('click', function () {
      btn.setAttribute('disabled', 'disabled');
      btn.innerText = 'Processing...';
      launchMultipleOnTC(function () {
        btn.removeAttribute('disabled');
        btn.innerText = 'Topcoder';
      }, vendor);
    });
    div.appendChild(btn);

    vendor.addMultiDom(div);

  }
}

/**
 * Get suffix for url that will prevent caching
 * @returns {string} the suffix
 */
function noCacheSuffix() {
  return '?_t=' + (new Date().getTime());
}

/**
 * Prompt user for topcoder credentials
 * @param callback the callback function
 */
function promptTopCoder(callback) {
  vex.dialog.open({
    message: 'Enter your topcoder username and password:',
    className: 'vex-theme-os',
    input: '<input name=\"username\" type=\"text\" placeholder=\"Username\" required />\n<input name=\"password\" type=\"password\" placeholder=\"Password\" required />',
    buttons: [
      $.extend({}, vex.dialog.buttons.YES, {
        text: 'Login'
      }),
      $.extend({}, vex.dialog.buttons.NO, {
        text: 'Cancel'
      })
    ],
    callback: function (data) {
      if (data === false) {
        callback(new Error('topcoder login window closed'));
        return;
      }
      callback(null, data.username, data.password);
      return;
    }
  });
}
/**
 * Authenticate with topcoder
 * @param callback the callback function
 */
function authenticateTopCoder(username, password, callback) {
  axios.post(getTCEndpoint() + 'oauth/access_token', {
    'x_auth_username': username,
    'x_auth_password': password
  }).then(function (result) {
    if (result.data.errorMessage) {
      callback({
        message: result.data.errorMessage
      });
    } else {
      setChromeStorage(TOKEN_KEY_TOPCODER, result.data.x_auth_access_token);
      callback();
    }
  }, function (err) {
    callback(err);
  });
}

/**
 * Ensure user is authenticated to topcoder
 * @param callback the callback function
 */
function checkTopCoderAuthentication(callback) {
  chrome.storage.local.get(TOKEN_KEY_TOPCODER, function (result) {
    if (!result[TOKEN_KEY_TOPCODER]) {
      async.waterfall([
        promptTopCoder,
        authenticateTopCoder
      ], function (err) {
        callback(err);
      });
    } else {
      callback();
    }
  });
}

/**
 * Retrieves project id related to the issue repository.
 * If no project id found prompt will be given to add project id
 *
 * @param issue The issue to get related repo url
 * @param callback The callback function
 */
function getProjectId(issue, callback) {
  chrome.storage.local.get('repoMap', function (result) {
    var pId = result && result.repoMap ? result.repoMap.reduce(function (curr, next) {
      if (curr) {
        return curr;
      }
      if (next.repoURL === issue.repository_url) {
        curr = next.projectId;
      }
      return curr;
    }, undefined) : undefined;

    if (!pId) {
      vex.dialog.open({
        message: 'Enter Project Id for this repository',
        className: 'vex-theme-os',
        input: '<input name=\"pId\" type=\"text\" placeholder=\"Project Id\" required />',
        buttons: [
          $.extend({}, vex.dialog.buttons.YES, {
            text: 'Enter'
          }),
          $.extend({}, vex.dialog.buttons.NO, {
            text: 'Cancel'
          })
        ],
        callback: function (data) {
          if (data === false) {
            callback(new Error('The popup was closed'));
            return;
          }
          var mapObj = {
            projectId: data.pId,
            repoURL: issue.repository_url
          };

          if (result.repoMap === undefined || result.repoMap.length === 0) {
            setChromeStorage('repoMap', [mapObj]);
          } else {
            /* Push to existing data */
            result.repoMap.push(mapObj);
            setChromeStorage('repoMap', result.repoMap);
          }
          issue.tc_project_id = data.pId;
          callback(null, issue);
        }
      });
    } else {
      issue.tc_project_id = pId;
      callback(null, issue);
    }
  });
}

/**
 * Handle button click
 */
function launchOnTC(callback, vendor) {
  async.waterfall([
    vendor.checkAuthentication.bind(vendor),
    checkTopCoderAuthentication,
    vendor.getCurrentIssue.bind(vendor),
    getProjectId,
    vendor.postIssue.bind(vendor),
    vendor.addCommentToCurrentIssue.bind(vendor)
  ], function (err) {
    if (err) {
      if (err.message === 'topcoder login window closed') {
        callback();
        return;
      }
      if (err.message !== 'The popup was closed') {
        console.error(err);
        alert('An error occurred: ' + err.message);
      }
    } else {
      // scroll to bottom so created issue will be visible
      window.scrollTo(0, document.body.scrollHeight);
    }
    callback();
  });
}

/**
 * Handle multiple launch button click
 */
function launchMultipleOnTC(callback, vendor) {
  async.waterfall([
    vendor.checkAuthentication.bind(vendor),
    checkTopCoderAuthentication,
    vendor.getSelectedIssues.bind(vendor),
    vendor.postIssues.bind(vendor)
  ], function (err) {
    if (err) {
      if (err.message === 'topcoder login window closed') {
        callback();
        return;
      }
      if (err.message !== 'The popup was closed') {
        alert('An error occurred: ' + err.message);
      }
    }
    callback();
  });
}

setEnv();

chrome.runtime.onMessage.addListener(
  /**
   * inject event handler. called by message-passing from background.js
   * @param  {Object} request      request from background.js which should have 'injectButton' key
   * @param  {Object} sender
   * @param  {Object} sendResponse
   */
  function (request, sender, sendResponse) {
    if (request.injectButton) { // injectButton fired from background.js

      // current code needs global `vendor` variable setup.
      // vendor is detected by url from background.js
      // prepare needed variables for initializing a vendor object
      var vendorClass, key, domain;

      if (request.vendorClass === 'GithubVendor') {
        // console.log(["detected github"])
        vendorClass = GithubVendor;
        key = DOMAIN_KEY_GITHUB;
        domain = DEFAULT_GITHUB_DOMAIN;

      } else if (request.vendorClass === 'GitlabVendor') {
        // console.log(["detected gitlab"])
        vendorClass = GitlabVendor;
        key = DOMAIN_KEY_GITLAB;
        domain = DEFAULT_GITLAB_DOMAIN;

      } else if (request.vendorClass === 'JiraVendor') {
        // console.log(["detected jira"])
        vendorClass = JiraVendor;
        key = DOMAIN_KEY_JIRA;
        domain = DEFAULT_JIRA_DOMAIN;

      }
      if (vendorClass) {
        getVendor(vendorClass, key, domain).then((result) => {
          if (result) {
            injectButton(result);
            injectMultipleLaunchButton(result);
          }
        });
      }
    }
  });
