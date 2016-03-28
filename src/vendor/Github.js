'use strict';

/**
 * The service object for handling creating contests from Github.
 * @type {object} The Github object.
 */
var TC_CLIB_GITHUB = (function getGithub() {

  var GITHUB_URL = 'https://api.github.com/',
    TOKEN_KEY_GITHUB = 'glib::github_token';

  return {
    owner: undefined,
    repo: undefined,
    issueId: undefined,

    /**
     * Utilty function for executing a regular expression on location.pathname.
     *
     * @param regEx A regular expression.
     * @returns {Array|{index: number, input: string}} The exec response.
     */
    runRegExpOnPathname: function(regEx) {
      return regEx.exec(location.pathname);
    },

    /**
     * Verify that the github page is the correct one for button injection, and all expected elements are found.
     *
     * @returns {boolean} True is the page is ready for button injection.
     */
    isEnabled: function() {
      var exec = this.runRegExpOnPathname(/([\d\w\.\-]+)\/([\d\w\.\-]+)\/issues\/(\d+)/),
        showIssue, wrapper;

      if (!exec) {
        return false;
      }

      this.owner = exec[1];
      this.repo = exec[2];
      this.issueId = exec[3];

      showIssue = document.getElementById('show_issue');
      if (!showIssue) {
        return false;
      }

      wrapper = showIssue.getElementsByClassName('gh-header-actions')[0];

      return !!exec && !!wrapper;
    },

    /**
     * Add the topcode button to the dom.
     * @param btn - Button element to be inserted.
     */
    addButton: function(btn) {
      var showIssue = document.getElementById('show_issue'),
        wrapper = showIssue.getElementsByClassName('gh-header-actions')[0];

        wrapper.insertBefore(btn, wrapper.firstChild);
    },

    /**
     * Verify that the github page is the correct one for button injection on the issues page,
     * and all expected elements are found.
     *
     * @returns {boolean} True is the page is ready for button injection.
     */
    isMultiEnabled: function() {
      var issuesListing, wrapper, exec;

      /* issue page url is of the form
       * https://github.com/cloudspokes/GLIB-ChromeExt/issues
       * or https://github.com/cloudspokes/GLIB-ChromeExt/issues/created_by/tc_assembler
       * Following regex matches that after 'issues/', there shouldn't be a number in URL
       * as that will be a issue detail page. Anything other than a number after 'issues/'
       * is still a issues list page, which is supported by following regex
       */
      exec = /([\d\w\.\-]+)\/([\d\w\.\-]+)\/issues(?!\/\d+)/.exec(location.pathname);
      if (!exec) {
        //not issues list page
        return false;
      }

      this.owner = exec[1];
      this.repo = exec[2];

      issuesListing = document.getElementsByClassName('issues-listing')[0];
      if (!issuesListing) {
        return false;
      }
      wrapper = issuesListing.getElementsByClassName('subnav')[0];

      return !!wrapper;
    },

    /**
     * Add the dom on the issues page.
     * @param div The dom to be added.
     */
    addMultiDom: function(div) {
      var issuesListing = document.getElementsByClassName('issues-listing')[0],
        wrapper = issuesListing.getElementsByClassName('subnav')[0],
        newIssueBtn = wrapper.childNodes[1];

      div.appendChild(newIssueBtn);
      wrapper.removeChild(wrapper.childNodes[1]);
      wrapper.insertBefore(div, wrapper.firstChild);
    },

    /**
     * Ensure user is authenticated with github.
     * @param callback the callback function
     */
    checkAuthentication: function (callback) {
      var self = this;
      chrome.storage.local.get(TOKEN_KEY_GITHUB, function (result) {
        if (!result[TOKEN_KEY_GITHUB]) {
          self.authenticate(callback);
          return;
        } else {
          //check if token is valid
          axios({
            baseURL: GITHUB_URL,
            headers: {
              'authorization': 'bearer ' + result[TOKEN_KEY_GITHUB]
            },
            method: 'get',
            url: '/user' + noCacheSuffix()
          }).then(function () {
            callback();
          }, function (response) {
            console.log(response);
            if (response.status === 401) {
              //token expired or revoked
              removeChromeStorage(TOKEN_KEY_GITHUB);
              self.checkAuthentication(callback);
            } else {
              console.error(response);
              callback(new Error('Github GET /user: ' + response.status + ' status code'));
            }
          });
        }
      });
    },

    /**
     * Show github oauth popup
     * @param callback the callback function
     */
    authenticate: function authenticateGithub(callback) {
      OAuth.popup('github')
        .done(function (result) {
          setChromeStorage(TOKEN_KEY_GITHUB, result.access_token);
          callback();
        })
        .fail(function (err) {
          callback(err);
        });
    },

    /**
     * Get given issue details
     * @param issueId - id of the issue
     * @param callback the callback function
     */
    getIssue: function (issueId, callback) {
      var self = this;
      chrome.storage.local.get(TOKEN_KEY_GITHUB, function (result) {
        var url = '/repos/' + self.owner + '/' + self.repo + '/issues/' + issueId;
        axios({
          baseURL: GITHUB_URL,
          headers: {
            'authorization': 'bearer ' + result[TOKEN_KEY_GITHUB]
          },
          method: 'get',
          url: url + noCacheSuffix()
        }).then(function (response) {
          callback(null, response.data);
        }, function (response) {
          console.error(response);
          callback(new Error('Github GET ' + url + ': ' + response.status + ' status code'));
        });
      });
    },

    /**
     * Get current issue
     * @param callback - the callback function
     */
    getCurrentIssue: function (callback) {
      this.getIssue(this.issueId, callback);
    },

    /**
     * Add comment to given issue
     * @param {number} id of the issue
     * @param {String} text the comment text
     * @param callback the callback function
     */

    addComment: function (issueId, text, callback) {
      var self = this;
      chrome.storage.local.get(TOKEN_KEY_GITHUB, function (result) {
        var url = '/repos/' + self.owner + '/' + self.repo + '/issues/' + issueId + '/comments';
        axios({
          baseURL: GITHUB_URL,
          headers: {
            'authorization': 'bearer ' + result[TOKEN_KEY_GITHUB]
          },
          data: {
            body: text
          },
          method: 'post',
          url: url
        }).then(function () {
          callback();
        }, function (response) {
          console.error(response);
          callback(new Error('Github GET ' + url + ': ' + response.status + ' status code'));
        });
      });
    },

    /**
     * Add comment to current issue
     * @param {String} text the comment text
     * @param callback the callback function
     */
    addCommentToCurrentIssue: function (text, callback) {
      this.addComment(this.issueId, text, callback);
    },

    /**
     * Post issue to TC endpoint and format response
     * @param {Object} issue the github issue to post
     * @param callback the callback function
     */
    postIssue: function (issue, callback) {
      chrome.storage.local.get(TOKEN_KEY_TOPCODER, function (result) {
        axios.post(getTCEndpoint() + 'challenges', issue, {
          headers: {
            'x-auth-access-token': result[TOKEN_KEY_TOPCODER]
          }
        }).then(function (response) {
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
              '```',
              JSON.stringify(data, null, 4),
              '```'
            ];
          }
          callback(null, msg.join('\n'));
        }, function (response) {
          console.error(response);
          if (response.status === 401) {
            //token expired or revoked
            removeChromeStorage(TOKEN_KEY_TOPCODER);
            checkTopCoderAuthentication(function () {
              this.postIssue(issue, callback);
            });
            return;
          }
          var msg = [
            'Failed to create challenge',
            'Status code: ' + response.status,
            'Response body:',
            '```',
            JSON.stringify(response.data || 'empty response', null, 4),
            '```'
          ];

          callback(null, msg.join('\n'));
        });
      });
    },

    /**
     * Get an array of ids of selected issues
     * @param callback - the callback function
     */
    getSelectedIssues: function (callback) {
      var issueIds = $('input[type="checkbox"][name="issues\\[\\]"]:checked')
        .map(function () {
          return $(this).val();
        }).get();
      if (issueIds.length === 0) {
        callback(new Error('No issues selected'));
      } else {
        callback(null, issueIds);
      }
    },

    /**
     * Create TC challenge for all the issues passed
     * @param issueIds - array of issue ids for which TC challenges are to be created
     * @param callback - the callback function
     */
    postIssues: function (issueIds, callback) {
      var self = this;
      async.eachSeries(issueIds, function (iiD, postIssueCallback) {
        async.waterfall([
          function (cb) {
            cb(null, iiD);
          },
          self.getIssue.bind(self),
          getProjectId,
          self.postIssue.bind(self),
          function (text, cb) {
            self.addComment(iiD, text, cb);
          }
        ], function () {
          postIssueCallback();
        });
      }, function (err) {
        callback(err);
      });
    }
  };
})();

// Used for testing
var module = module || undefined;
if (module) {
  module.exports = TC_CLIB_GITHUB;
}
