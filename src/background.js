/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

var ENVIRONMENT = 'glib::environment';
var TC_OAUTH_URL_KEY = 'glib::tc_oauth_url';
var TC_OAUTH_TOKEN_KEY = 'glib::tc_oauth_token';
var TC_OAUTH_CLIENT_ID_KEY = 'glib::tc_oauth_client_id';
var TC_OAUTH_REDIRECT_URI_KEY = 'glib::tc_oauth_redirect_uri';

var DEFAULT_TC_OAUTH_CLIENT_ID = '99831715-8dff-4473-a794-dfc8e9755ce1';
var DEFAULT_TC_OAUTH_REDIRECT_URI = 'https://kbdpmophclfhglceikdgbcoambjjgkgb.chromiumapp.org/oauth2';
var DEFAULT_TC_OAUTH_URL = 'https://accounts.topcoder-dev.com/oauth';

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
  }
  return true;
});

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
          isDev && console.log.apply(console, argz);
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
   *             uses chrome.identity.launchWebAuthFlow without interaction.
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



