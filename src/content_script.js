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
var vendor;
var isDevEnvironment = false;

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

/**
 * Set the vendor variable.
 * @returns {Promise}
 */
function setVendor() {
  const promises = [
    getVendor(GithubVendor, DOMAIN_KEY_GITHUB, DEFAULT_GITHUB_DOMAIN),
    getVendor(GitlabVendor, DOMAIN_KEY_GITLAB, DEFAULT_GITLAB_DOMAIN),
    getVendor(JiraVendor, DOMAIN_KEY_JIRA, DEFAULT_JIRA_DOMAIN)
  ];
  return Promise.all(promises).then((results) => {
    results.forEach((result) => {
      if (result) {
        vendor = result;
      }
    });
  });
}

/**
 * Inject html style node if not exists
 * @param  {String} url the stylesheet url
 * @param  {String} id the id of element
 */
function injectStyleNode(url, id) {
  if (document.getElementById(id)) {
    return;
  }
  var node = document.createElement('link');
  node.rel = 'stylesheet';
  node.id = id;
  node.href = chrome.extension.getURL(url);
  document.body.appendChild(node);
}

/**
 * Try to inject topcoder buttons on issues list and issue detail page.
 * This is infinite interval, because page content can be updated dynamically
 * (when new comment is added or because of html5 navigation).
 */
function injectStyles() {
  injectStyleNode('styles/style.css', 'GLIB_STYLE');
  injectStyleNode('lib/vex/vex.css', 'GLIB_STYLE_VEX');
  injectStyleNode('lib/vex/vex-theme-os.css', 'GLIB_STYLE_VEX_THEME');
}

function injectButton() {
  if (vendor) {
    setInterval(function () {
      if (document.getElementById('LAUNCH_ON_TC') || document.getElementById('LAUNCH_MULTIPLE_ON_TC')) {
        // button already exists
        return;
      }

      if (!vendor.isEnabled()) {
        return;
      }

      injectStyles();

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
        });
      });
      vendor.addButton(btn);
    }, CHECK_INTERVAL);
  }
}

function injectMultipleLaunchButton() {
  if (vendor) {
    setInterval(function () {
      if (document.getElementById('LAUNCH_MULTIPLE_ON_TC') || document.getElementById('LAUNCH_ON_TC')) {
        // button already exists
        return;
      }

      if (!vendor.isMultiEnabled()) {
        return;
      }
      injectStyles();

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
        });
      });
      div.appendChild(btn);

      vendor.addMultiDom(div);
    }, CHECK_INTERVAL);
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
function launchOnTC(callback) {
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
function launchMultipleOnTC(callback) {
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
setVendor().then(() => {
  // initial load
  injectButton();
  injectMultipleLaunchButton();
});
