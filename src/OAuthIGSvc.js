
'use strict';

/**
 * @typedef token
 *          - a jwt token
 * @param {string} bearer - jwt itself in packed form(converted to base64 and signed) with prepended "bearer " string.
 *                          separate field is given for convenience, can be used for bearer authorization later.
 */

/**
 * @callback getStorage - lookup a key from storage. separated to make OAuthIGService not rely internally on
 *                        chrome.storage.local
 * @param {string} key - key to lookup [description]
 * @param {object} defaultValue - default value returned if lookup returns falsy value
 * @return {Promise<object>} a promise to the value.
 *
 */

/**
 * @callback setStorage - set a value by key in stoarge. separated to make OAuthIGService not rely internally on
 *                        chrome.storage.local
 * @param {string} key - key to set
 * @param {object} value - value to set
 */

/**
 * @callback requestFunc - OAuthIGService will call this function with authUri.
 *                         authUri is the authorization server's uri with querystrings built using client_id and redirect_uri.
 *                         the user of the service is expected to do GET request to authUri and resolve the redirect location
 *                         which contains the access token (or failure).
 * @param {string} authUri - OAuth
 */

/**
 * @callback setupTokenResolver - setupTokenResolver will be called with a single argument, a resolving function resolve.
 *                                the function should be called with the redirect location from GET requesting authUri.
 * @param {function} resolve - resolve the access_token containing redirect location by this function.
 */

class OAuthIGService {
  /**
   * @constructor
   *
   * constructor create an OAuth implicit grant service. following arguments should be supplyed.
   * @param  {getStorage} getStorage  - see getStorage
   * @param  {setStorage} setStorage  - see setStorage
   * @param  {setupTokenResolver} setupTokenResolver  - see setupTokenResolver
   * @param  {requestFunc} requestFunc  - see requestFunc
   * @param  {object} config   - configuration object. see background.js to see what should be supplied
   * @param  {function=} logger  - default: console.log if dev environment set
   * @return {object} instance of OAuthIGService
   */
  constructor(getStorage, setStorage, setupTokenResolver, requestFunc, config, logger) {
    var self = this;
    this.getStorage = getStorage;
    this.setStorage = setStorage;
    this.setupTokenResolver = function (cb) { setupTokenResolver(cb); };
    this.requestFunc = function (uri) { requestFunc(uri); };
    this.config = config;
    this.logger = logger || function () {
      var argz = Array.prototype.slice.call(arguments);
      self.getStorage(config.ENVIRONMENT, false)
        .then((isDev) => {
          console.log.apply(console, argz);

        });
    };

    this.logger('init oauthigservice');
  }

  /**
   * getToken - returns token to the user. may utilize the previous token in storage
   *          or order user to make get request to authorization server and resolve
   *          redirect uri which contains access token back to OAuthIGService.
   * @return {Promise<token>} promise for token
   */
  getToken() {
    this.logger('getting token');
    var self = this;
    return new Promise((resolve, reject) => {
      const cfg = this.config;
      const log = this.logger;
      // check if storage token exists
      this.getStorage(cfg.TC_OAUTH_TOKEN_KEY, null)
        .then((result) => {
          log('lookup TC Token in storage');
          if (result) {
            log('found TC token in storage', result);
            // renew token if required.
            this.renew(result).then((result) => {
              this.setStorage(cfg.TC_OAUTH_TOKEN_KEY, result);
              resolve(result);
            }).catch(reject);

          } else {
            log('no TC token in storage');
            // token does not exist, initiate authorize routine
            this.authorize().then((result) => {
              log('got TC token from redirect', result);
              this.setStorage(cfg.TC_OAUTH_TOKEN_KEY, result);
              resolve(result);
            }).catch(reject);

          }
        });
    });
  }

  /**
   * authorize - after authorize() is called,
   *             user is expected to actually do GET request using requestFunc
   *             and resolve the redirect location using setupTokenResolver
   * @return {Promise<token>}
   */
  authorize() {
    var self = this;
    return new Promise((resolve, reject) => {
      const resolver = (tokenUri) => {
        if (tokenUri) {
          const resp = extractParamsFromURIFragment(tokenUri.split('#', 2)[1]);
          self.logger('response from authorization endpoint: ', resp);
          if (resp.error) {
            self.logger('error in response, rejecting:', resp);
            reject(resp);
          } else {
            const parsedJwt = jwt_decode(resp.access_token);
            self.logger('successfully parsed a JWT: ', parsedJwt);
            parsedJwt.bearer = 'Bearer "' + resp.access_token + '"';
            resolve(parsedJwt);
          }
        } else {
          self.logger('did not recieve any redirect location response');
          reject({error: 'Error'});
        }
      };

      const cfg = this.config;
      const log = this.logger;
      this.setupTokenResolver(resolver);

      const getParams = [
        this.getStorage(cfg.TC_OAUTH_URL_KEY, cfg.DEFAULT_TC_OAUTH_URL),
        this.getStorage(cfg.TC_OAUTH_CLIENT_ID_KEY, cfg.DEFAULT_TC_OAUTH_CLIENT_ID),
        this.getStorage(cfg.TC_OAUTH_REDIRECT_URI_KEY, cfg.DEFAULT_TC_OAUTH_REDIRECT_URI)
      ];

      Promise.all(getParams).then((params) => {
        const authUri = params[0] + '?response_type=token&' +
                        'client_id=' + params[1] + '&redirect_uri=' +
                        encodeURIComponent(params[2]);
        log('requesting TC Token', authUri);

        this.requestFunc(authUri);
      });
    });
  }

  /**
   * renew - renew a jwt by checking jwt.exp
   * @param  {token} token - see token
   * @return {Promise<token>} - resolved reusing current token or requesting new token by authorize()
   */
  renew(token) {
    const log = this.logger;
    return new Promise((resolve, reject) => {
      let now = Math.floor(new Date().getTime() / 1000);

      log('comparing now and exp: ', now, token.exp);
      if (token.exp > now) {
        log('resolving token without renewal');
        resolve(token);
      } else {
        log('renewal of current jwt needed');
        this.authorize().then((result) => {
          resolve(result);
        }).catch(reject);
      }
    });
  }
}

/**
 * extractParamsFromURIFragment - extract the URI fragment from the user agent's location object
 *                              reference https://dev.clever.com/instant-login/implicit-grant-flow
 * @param  {string} q - URI fragment to parse
 * @return {object}   - dictionary containing parsed keyvalue pairs from URI fragment
 */
function extractParamsFromURIFragment(q) {
  const fragmentParams = {};
  var e,
    a = /\+/g,  // Regex for replacing addition symbol with a space
    r = /([^&;=]+)=?([^&;]*)/g, // Regex to extract {key}={value} pairs from URI frangment
    d = function (s) { return decodeURIComponent(s.replace(a, ' ')); }; // decode extracted keyvalue pairs

  e = r.exec(q);
  while (e) { // run extraction untill nothing more can be extracted
    fragmentParams[d(e[1])] = d(e[2]);
    e = r.exec(q);
  }
  return fragmentParams;
}


if (typeof module !== 'undefined') {
  module.exports.OAuthIGService = OAuthIGService;
  module.exports.extractParamsFromURIFragment = extractParamsFromURIFragment;
} else {
  window.OAuthIGService = OAuthIGService;
  window.extractParamsFromURIFragment = extractParamsFromURIFragment;
}
