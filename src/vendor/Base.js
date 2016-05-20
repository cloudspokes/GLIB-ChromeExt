'use strict';

/**
 * Base base vendor
 * @class
 */
class BaseVendor {

  /**
   * @constructor
   */
  constructor(domain) {
    if (!domain) {
      throw new Error('domain is required');
    }
    this.domain = domain;
  }

  /**
   * Get key for local storage
   * @returns {string}
   * @abstract
   */
  get tokenKey() {
    throw new Error('tokenKey not implemented');
  }

  /**
   * Get get base url
   * @returns {string}
   * @abstract
   */
  get baseUrl() {
    throw new Error('baseUrl not implemented');
  }

  /**
   * Get line separator when creating a comment
   * Example: Some vendors use \n but some use 2 spaces
   * @returns {string}
   */
  get commentNewLine() {
    return '\n';
  }

  /**
   * Utility function for executing a regular expression on location.pathname.
   *
   * @param regEx A regular expression.
   * @returns {Array|{index: number, input: string}} The exec response.
   */
  runRegExpOnPathname(regEx) {
    return regEx.exec(location.pathname);
  }

  /**
   * Format text that should be formatted in code style
   * By default it's formatted in markdown, but some vendors use different formatting (e.g jira)
   * @param {String} text the text to render
   * @returns {String} the formatted text
     */
  formatCodeBlock(text) {
    return [
      '```',
      text,
      '```'
    ].join(this.commentNewLine);
  }

  /**
   * Verify that the github page is the correct one for button injection, and all expected elements are found.
   *
   * @returns {boolean} True is the page is ready for button injection.
   * @abstract
   */
  isEnabled() {
    throw new Error('addButton not implemented');
  }

  /**
   * Add the topcoder button to the dom.
   * @param btn - Button element to be inserted.
   * @abstract
   */
  addButton(btn) {
    throw new Error('addButton not implemented');
  }

  /**
   * Multiple issues support is disabled
   * @returns {boolean} false
   * @abstract
   */
  isMultiEnabled() {
    throw new Error('isMultiEnabled not implemented');
  }

  /**
   * Ensure user is authenticated with github.
   * @param callback the callback function
   * @abstract
   */
  checkAuthentication(callback) {
    throw new Error('checkAuthentication not implemented');
  }

  /**
   * Ensure user is authenticated with github.
   * @param callback the callback function
   * @abstract
   */
  authenticate(callback) {
    throw new Error('authenticate not implemented');
  }

  /**
   * Get given issue details
   * @param issueId - id of the issue
   * @param callback the callback function
   * @abstract
   */
  getIssue(issueId, callback) {
    throw new Error('getIssue not implemented');
  }

  /**
   * Get current issue
   * @param callback - the callback function
   * @abstract
   */
  getCurrentIssue(callback) {
    throw new Error('getCurrentIssue not implemented');
  }

  /**
   * Add comment to current issue
   * @param {String} text the comment text
   * @param callback the callback function
   * @abstract
   */
  addCommentToCurrentIssue(text, callback) {
    throw new Error('addCommentToCurrentIssue not implemented');
  }

  /**
   * Post issue to TC endpoint and format response
   * @param {Object} issue the github issue to post
   * @param callback the callback function
   */
  postIssue(issue, callback) {
    chrome.storage.local.get(TC_OAUTH_TOKEN_KEY, (result) => {
      axios.post(getTCEndpoint() + 'challenges', issue, {
        headers: {
          'Authorization': result[TC_OAUTH_TOKEN_KEY].bearer
        }
      }).then((response) => {
        var data = response.data;
        var msg;
        if (data.success) {
          msg = [
            'Challenge created successfully',
            'Challenge Url: ' + data.challengeURL
          ];
        } else {
          msg = [
            'Failed to create challenge',
            'Response body:',
            this.formatCodeBlock(JSON.stringify(data, null, 4))
          ];
        }
        callback(null, msg.join(this.commentNewLine));
      }, (response) => {
        console.error(response);
        if (response.status === 401) {
          // token expired or revoked
          removeChromeStorage(TC_OAUTH_TOKEN_KEY);
          checkTopCoderAuthentication(() => {
            this.postIssue(issue, callback);
          });
          return;
        }
        var msg = [
          'Failed to create challenge',
          'Status code: ' + response.status,
          'Response body:',
          this.formatCodeBlock(JSON.stringify(response.data || 'empty response', null, 4))
        ];

        callback(null, msg.join(this.commentNewLine));
      });
    });
  }

  /**
   * Get an array of ids of selected issues
   * @param callback - the callback function
   * @abstract
   */
  getSelectedIssues(callback) {
    throw new Error('getSelectedIssues not implemented');
  }

  /**
   * Create TC challenge for all the issues passed
   * @param issueIds - array of issue ids for which TC challenges are to be created
   * @param callback - the callback function
   * @abstract
   */
  postIssues(issueIds, callback) {
    throw new Error('postIssues not implemented');
  }

  /**
   * Ensure user is authenticated.
   * Check if given URL returns a success response
   * @param url the url to call
   * @param callback the callback function
   */
  _checkAuthentication(url, callback) {
    this._getAccessToken((err, token) => {
      if (err) {
        return callback(err);
      }
      if (!token) {
        this.authenticate(callback);
      } else {
        // check if token is valid
        axios({
          baseURL: this.baseUrl,
          headers: {
            'authorization': 'bearer ' + token
          },
          method: 'get',
          url: url + noCacheSuffix()
        }).then(() => {
          callback();
        }, (response) => {
          console.log(response);
          if (response.status === 401) {
            // token expired or revoked
            removeChromeStorage(this.tokenKey);
            this.checkAuthentication(callback);
          } else {
            console.error(response);
            callback(new Error('Check authentication: ' + response.status + ' status code'));
          }
        });
      }
    });
  }

  /**
   * Get access token from local storage
   * @param {Function} callback the callback
   */
  _getAccessToken(callback) {
    chrome.storage.local.get(this.tokenKey, (result) => {
      callback(null, result[this.tokenKey]);
    });
  }

  /**
   * Make http request, handle no caching and log errors
   * @param {Object} params the request parameters
   * @param {Object} opts the extra options
   * @param {Boolean} opts.addToken the access token to authorization request
   * @param {Function} callback the callback function
   */
  _makeRequest(params, opts, callback) {
    var url = params.url;
    if (params.method === 'get') {
      params.url += noCacheSuffix();
    }
    async.waterfall([
      (cb) => {
        if (!opts.addToken) {
          return cb();
        }
        this._getAccessToken((err, token) => {
          params.headers = {
            'authorization': 'bearer ' + token
          };
          cb(err);
        });
      },
      (cb) => {
        axios(params)
          .then((response) => {
            cb(null, response.data, response);
          }, (response) => {
            console.error(response);
            cb(new Error('Error GET ' + url + ': ' + response.status + ' status code'));
          });
      }
    ], callback);
  }

  /**
   * Wait until element with given id in visible in dome
   * @param {String} elementId the id of html element o check
   * @param {Function} callback the callback function
     */
  _waitForElement(elementId, callback) {
    const id = setInterval(() => {
      if (!document.getElementById(elementId)) {
        return;
      }
      clearInterval(id);
      callback();
    }, 100);
  }
}
if (typeof module !== 'undefined') {
  // for unit tests
  // export it globally
  global.BaseVendor = BaseVendor;
} else {
  window.BaseVendor = BaseVendor;
}
