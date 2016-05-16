
'use strict';

/**
 * @typedef token
 * @property {string} access_token value of access_token
 * @property {string} token_type   type of token. "bearer"
 * @property {string} expires_in   an integer in string which means a token's lifetime
 * @property {int}    _expires_at   an integer, token's expire time in unix time in seconds.
 *                                 used internally to expire a saved token.
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
 * @callback requestFunc - OAuthIGService will call this function with OAuth implicit grant authorization uri.
 *                         the user of the service is expected to make actually GET request by this funcion.
 * @param {string} authUri - OAuth
 */

/**
 * @callback setupTokenResolver - setupTokenResolver will be called with a single argument, 
 *                                which resolves the recieved uri (which contains access_token) from 
 *                                oauth authorization endpoint. the user of OAuthIGService is expected to 
 *                                resolve the recived uri himself, to allow OAuthIGService to parse and save
 *                                the access token.
 * @param {function} resolve - resolve the access_token containing uri by this function.
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
   * @param  {object} config   - configuration object. see background.js to see which values are supplied
   * @param  {function=} logger  - 
   * @return {object} instance of OAuthIGService
   */
  constructor(getStorage, setStorage, setupTokenResolver, requestFunc, config, logger) {
    var self = this;
    this.getStorage = getStorage;
    this.setStorage = setStorage;
    this.setupTokenResolver = setupTokenResolver;
    this.requestFunc = requestFunc;
    this.config = config;
    this.logger = logger || function () {
      var argz = Array.prototype.slice.call(arguments);
      this.getStorage(config.ENVIRONMENT, false)
        .then((isDev) => {
          console.log.apply(console, argz);

        });     
    };

    this.logger("init oauthigservice");
  }

  /**
   * getToken - returns token to the user. may utilize the previous token in storage
   *          or order user to make get request to authorization server and resolve
   *          redirect uri which contians access token back to OAuthIGService.
   * @return {Promise<token>} promise for token
   */
  getToken() {
    this.logger("getting token");
    return new Promise((resolve, reject) => {
      const cfg = this.config;
      const log = this.logger;
      // check if storage token exists
      this.getStorage(cfg.TC_OAUTH_TOKEN_KEY, null)
        .then((result) => {
          log("lookup TC Token in storage");
          if (result) {
            log(["found TC token in storage", result]);
            // renew token if required.
            this.renew(result).then(resolve);            
          } else {
            log("no TC token in storage");
            // token does not exist, initiate authorize routine
            this.authorize().then((result) => {
              log(["got TC token from request", result]);
              this.setStorage(cfg.TC_OAUTH_TOKEN_KEY, result);
              resolve(result);
            });
          }
        });
    });
  }

  /**
   * authorize - order user to send request to authorization endpoint using implicit grant to obtain access_toekn
   * @return {Promise<token>} 
   */
  authorize() {
    return new Promise((resolve) => {
      const resolver = (tokenUri) => {
        const token = extractParamsFromURIFragment(tokenUri.split("#", 2)[1]);
        if (token.expires_in) {
          const d = Math.floor(new Date().getTime() / 1000);        
          token._expires_at = d + parseInt(token.expires_in, 10);
        }
        resolve(token);
      }

      const cfg = this.config;
      const log = this.logger;
      this.setupTokenResolver(resolver);

      const getParams = [
        this.getStorage(cfg.TC_OAUTH_URL_KEY,          cfg.DEFAULT_TC_OAUTH_URL),
        this.getStorage(cfg.TC_OAUTH_CLIENT_ID_KEY,    cfg.DEFAULT_TC_OAUTH_CLIENT_ID),
        this.getStorage(cfg.TC_OAUTH_REDIRECT_URI_KEY, cfg.DEFAULT_TC_OAUTH_REDIRECT_URI)
      ];

      Promise.all(getParams).then((params) => {
        const authUri = params[0] + '?response_type=token&' +
                        'client_id=' + params[1] + '&redirect_uri=' +
                        encodeURIComponent(params[2]);
        log(["requesting TC Token", authUri]);

        this.requestFunc(authUri);
      });
    });
  }

  /**
   * renew - renew a token if required using _expires_at
   * @param  {token} token - see token
   * @return {Promise<token>} - resolved reusing current token or requesting new token by authorize()
   */
  renew(token) {
    const log = this.logger;
    return new Promise((resolve) => {
      const now = Math.floor(new Date().getTime() / 1000);
      // if (now < token.expires_at) {        

      if (token.expires_in && now < token._expires_at) {        
        resolve(token);
      } else {
        // log(['now', now, 'expire', token.expires_at]);
        log("renewal of token");
        this.authorize().then((result) => {
          this.setStorage(this.config.TC_OAUTH_TOKEN_KEY, result);
          resolve(result);
        });
      }
    });
  }
}

/**
 * extractParamsFromURIFragment - extract the URI fragment from the user agent's location object
 *                              reference https://dev.clever.com/instant-login/implicit-grant-flow
 * @param  {string} q - URI fragment to parse
 * @return {token}   
 */
function extractParamsFromURIFragment(q) {
  const fragmentParams = {};
  var e,
      a = /\+/g,  // Regex for replacing addition symbol with a space
      r = /([^&;=]+)=?([^&;]*)/g,
      d = function (s) { return decodeURIComponent(s.replace(a, " ")); };

  while (e = r.exec(q)) {
    fragmentParams[d(e[1])] = d(e[2]);
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