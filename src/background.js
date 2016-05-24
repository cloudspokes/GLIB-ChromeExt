/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Process oauth2 authentication
 * @param {String} clientId the client id
 * @param {String} clientSecret the client secret
 * @param {String} redirectUri the redirect url
 * @param {String} scope the oauth2 scope
 * @param {String} authorizeUrl the url for authorization
 * @param {String} tokenUrl the url for token exchange
 * @param {function(Error, Object)} callback the callback function with parameters
 * - the error if any
 * - the response with access token
 * @private
 */
function _oauth2({clientId, clientSecret, redirectUri, scope, authorizeUrl, tokenUrl}, callback) {
  const url = `${authorizeUrl}?client_id=${clientId}&client_secret=${clientSecret}&` +
    `redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

  chrome.identity.launchWebAuthFlow({
    url,
    interactive: true
  }, (codeUrl) => {
    const exec = /code=(.+?)(&|$)/.exec(codeUrl);
    if (!exec) {
      // canceled by user
      callback(new Error('The popup was closed'));
      return;
    }
    const code = exec[1];
    axios({
      method: 'post',
      url: tokenUrl,
      data: {
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      }
    }).then(function (response) {
      callback(null, response.data);
    }, function (response) {
      console.error(response);
      callback(new Error('OAUTH2 POST ' + tokenUrl + ': ' + response.status + ' status code'));
    });
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.auth) {
    console.log('processing oauth2 for', request.auth);
    const data = OAUTH_APPS[request.auth];
    if (!data) {
      var error = new Error('not supported provider: ' + request.auth);
      console.error(error);
      sendResponse({err: error});
      return true;
    }
    _oauth2(data, (err, result) => {
      if (err) {
        console.error(err);
      } else {
        console.log('oauth2 success');
      }
      sendResponse({err, result});
    });
  } else if (request.setEnv) {
    // This is the handler for when the content_script fires th event indicating that the 
    // environment has changed and the locally stored value used by the auth layer should 
    // be updated. 
    getChromeStorage(ENVIRONMENT, false)
      .then(function(result) {
        var urlObj = {},
          idObj = {};
        // True indicates debug mode.
        if (result) {
          urlObj[TC_OAUTH_URL_KEY] = DEFAULT_TC_OAUTH_URL;
          idObj[TC_OAUTH_CLIENT_ID_KEY] = DEFAULT_TC_OAUTH_CLIENT_ID;
        } else {
          urlObj[TC_OAUTH_URL_KEY] = PROD_TC_OAUTH_URL;
          idObj[TC_OAUTH_CLIENT_ID_KEY] = PROD_TC_OAUTH_CLIENT_ID;
        }
        // Save the values in chrome storage.
        chrome.storage.local.set(urlObj);
        chrome.storage.local.set(idObj);
      });
  }
  return true;
});


/**
 * log - logs only when DEV Environment, using `console.log`
 * @param  {object} msg - messasge to log
 */
function log(msg) {
  chrome.storage.local.get(ENVIRONMENT, function (result) {
    var isDevEnvironment = result[ENVIRONMENT] || false;
    if (isDevEnvironment) {
      console.log(msg);
    }
  });
}

/**
 * injectCss - injects css within background.js with chrome.tabs.insertCSS
 * @param  {object} tabId - Id of the tab to insert css
 * @param  {string} url   - url (optional) for logging
 */
function injectCss(id, url) {
  var files = ['styles/style.css', 'lib/vex/vex.css', 'lib/vex/vex-theme-os.css'];

  files.forEach(function (file) {
    // log(['inserted', file]);
    try {
      var result = chrome.tabs.insertCSS(id, {
        file: file
      });
      // log(['css insert result', result]);
    } catch (e) {
      log(['error injecting css', file, 'into', url].join(' '));
    }
  });
}

/**
 * checkVendor - compares currentDomain and domain returened from chrome.storage using key (or defaultDomain)
                 returns matchValue if compared equal
 * @param  {string} matchValue    returned if currentDomain equals to value in chrome.storage
 * @param  {string} key           key to look for in chrome.storage
 * @param  {string} defaultDomain default domain value if chrome.storage is not set
 * @param  {string} currentDomain current domain
 * @return {Promise}               matchValue or null
 */
function checkVendor(matchValue, key, defaultDomain, currentDomain) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, function (result) {
      const domain = result[key] || defaultDomain;
      if (currentDomain.toLowerCase() === domain.toLowerCase()) {
        log(['vendor found: ', matchValue].join(' '));
        resolve(matchValue);
      } else {
        resolve();
      }
    });
  });
}

// url informations are only available upon onUpdated;
// reference: https://developer.chrome.com/extensions/tabs
// onCreated
//   Fired when a tab is created. Note that the tab's URL may not be set
//   at the time this event fired, but you can listen to onUpdated events
//   to be notified when a URL is set.
//
chrome.tabs.onUpdated.addListener(function callback(tabid, changeInfo, tab) {
  // on SPA apps, usually the order of update is (for a click)
  // loading(with url) -> loading (without url) -> complete
  // along those status transitions any DOM modification that
  // might remove TC button away can happen, so fire inject event for last two statuss
  // to ensure TC button isn't taken away by front-end frameworks.
  if (changeInfo.status === 'complete' ||
      (changeInfo.status === 'loading' && !changeInfo.url) ||
      changeInfo.title) {
      /**
       * parser to simply parse host information from url, which required for vender detection
       * @type {[type]}
       */
    var parser = document.createElement('a');
    parser.href = tab.url;

    var promises = [
      checkVendor('GithubVendor', DOMAIN_KEY_GITHUB, DEFAULT_GITHUB_DOMAIN, parser.host),
      checkVendor('GitlabVendor', DOMAIN_KEY_GITLAB, DEFAULT_GITLAB_DOMAIN, parser.host),
      checkVendor('JiraVendor', DOMAIN_KEY_JIRA, DEFAULT_JIRA_DOMAIN, parser.host)
    ];

    Promise.all(promises).then((results) => {
      results.forEach((result) => {
        if (result) {
          log('onUpdated match: ' + result);
          chrome.tabs.sendMessage(tab.id, {
            'injectButton': true,
            'vendorClass': result
          }, function (response) {
            // console.log(['response', response]);
          });
        }
      });
    });
  }
  return true;
});

/** bindNavigation - binds chrome's navigation events to inject CSS if domains match.
                     css are injected upon navigation events to prevent duplicate injection */
function bindNavigation() {
  chrome.webNavigation.onCompleted.addListener(function (details) {
    var parser = document.createElement('a');
    parser.href = details.url;

    var promises = [
      checkVendor('GithubVendor', DOMAIN_KEY_GITHUB, DEFAULT_GITHUB_DOMAIN, parser.host),
      checkVendor('GitlabVendor', DOMAIN_KEY_GITLAB, DEFAULT_GITLAB_DOMAIN, parser.host),
      checkVendor('JiraVendor', DOMAIN_KEY_JIRA, DEFAULT_JIRA_DOMAIN, parser.host)
    ];

    Promise.all(promises).then((results) => {
      results.forEach((result) => {
        if (result) {
          log(['WN match: ', details.url, result, details].join(' '));
          injectCss(details.tabId, details.url);
        }
      });
    });
  });
}

bindNavigation();

/** bindRequest - bind's chrome's request event(ajax) to inject buttons.
                  required because jira/github throws whole nodes of DOM and rebuilds them */
function bindRequest() {
  chrome.webRequest.onCompleted.addListener(function (details) {
    var parser = document.createElement('a');
    parser.href = details.url;

    var promises = [
      checkVendor('GithubVendor', DOMAIN_KEY_GITHUB, DEFAULT_GITHUB_DOMAIN, parser.host),
      // checkVendor('GitlabVendor', DOMAIN_KEY_GITLAB, DEFAULT_GITLAB_DOMAIN, parser.host),
      checkVendor('JiraVendor', DOMAIN_KEY_JIRA, DEFAULT_JIRA_DOMAIN, parser.host)
    ];

    Promise.all(promises).then((results) => {
      results.forEach((result) => {
        if (result) {
          log(['WR match: ', details.url, result, details].join(' '));
          setTimeout(function () {
            chrome.tabs.sendMessage(details.tabId, {
              'injectButton': true,
              'vendorClass': result
            }, function (response) {
              // console.log(['response', response]);
            });
          }, 50);
        }
      });
    });
  }, { urls: ['*://*.atlassian.net/*', '*://github.com/*'] });
}

bindRequest();

/**
 * getChromeStorage get value from chrome storage
 * @param  {string} key          key to lookup
 * @param  {object} defaultValue default value if key is not in chrome stoarge
 * @return {promise}              promise resolves to value looked up in chrome storage
 */
function getChromeStorage(key, defaultValue) {
  return new Promise((resolve) => {
      chrome.storage.local.get(key, (obj) => {
        const value = obj[key] || defaultValue;
        resolve(value);
      });
  });
}

/**
 * setChromeStorage  set value in chrome storage
 * @param {string} key   key to set in chrmoe stoarge
 * @param {object} value value to set
 */
function setChromeStorage(key, value) {
  const obj = {};
  obj[key] = value;
  chrome.storage.local.set(obj);
}

/**
 * OAuthIGUser actual user of OAuthIGService using chrome API
 */
class ChromeOAuthIGUser {
  /**
   * @constructor
   *   - actual user of OAuthIGService.
   *   - ChromeOAuthIGUser should send the GET request to the authorization server using requestFunc
   *   - ChromeOAuthIGUser should resolve the redirect response from above request using setupTokenResolver
   * @param  {function=} logger optional logger
   * @return {object}    an OAuthIGUser that binds to chrome events to handle access_tokens
   */
  constructor(logger) {
    const self = this;

    this.logger = logger || function (...argz) {
      getChromeStorage(ENVIRONMENT, false)
        .then((isDev) => {
        isDev && console.debug.apply(console, argz);
    });
    };

    // acutal message handler that responds to token requests from content_script.js
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
      if (request.oAuthIG) {
        self.logger('TC OAuth token request from content_script');
        oAuthIGSvc.getToken()
          .then((token) => {
          self.logger('sending token to content_script, ', token);
        sendResponse({oAuthIGResult: {
          jwt: token
        }});
      })
      .catch((resp) => {
          self.logger('service failed to provide token: ', resp);
        sendResponse({oAuthIGResult: {
          error: resp
        }});
      });
      }
    });
  }

  /**
   * setupTokenResolver keep the resolver in this._resolve
   * @param  {function} resolve - function used to resolve the redirect location to OAuthIGService
   */
  setupTokenResolver(resolve) {
    this._resolve = resolve;
  }

  /**
   * requestFunc sends actual GET request to oauth authorization endpoint.
   *             uses chrome.identity.launchWebAuthFlow with interaction if needed.
   * @param  {string} authUri authorization server uri passed from OAuthIGSerivce
   */
  requestFunc(authUri) {
    var self = this;
    chrome.identity.launchWebAuthFlow({
      url: authUri,
      interactive: true
    }, self.resolve.bind(self));
  }

  /**
   * resolve resolves redirect uri which contains access token to OAuthIGService
   * @param  {string} respUri redirect uri containing access token
   */
  resolve(respUri) {
    this._resolve(respUri);
  }

}

const oAuthCfg = {
  TC_OAUTH_TOKEN_KEY,
  TC_OAUTH_URL_KEY,
  TC_OAUTH_REDIRECT_URI_KEY,
  TC_OAUTH_CLIENT_ID_KEY,
  DEFAULT_TC_OAUTH_URL,
  DEFAULT_TC_OAUTH_REDIRECT_URI,
  DEFAULT_TC_OAUTH_CLIENT_ID,
  ENVIRONMENT
};

const oAuthIGUser = new ChromeOAuthIGUser();
const oAuthIGSvc = new OAuthIGService(getChromeStorage, setChromeStorage,
  oAuthIGUser.setupTokenResolver.bind(oAuthIGUser),
  oAuthIGUser.requestFunc.bind(oAuthIGUser),
  oAuthCfg);



