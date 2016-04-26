'use strict';

/**
 * The class for handling creating contests from Github.
 * @class
 */
class GithubVendor extends BaseVendor {

  /** @inheritdoc */
  get tokenKey() {
    return 'glib::github_token';
  }

  /** @inheritdoc */
  get baseUrl() {
    return `https://api.${this.domain}/`;
  }

  /** @inheritdoc */
  isEnabled() {
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
  }

  /** @inheritdoc */
  addButton(btn) {
    var showIssue = document.getElementById('show_issue'),
      wrapper = showIssue.getElementsByClassName('gh-header-actions')[0];

    wrapper.insertBefore(btn, wrapper.firstChild);
  }

  /** @inheritdoc */
  isMultiEnabled() {
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
      // not issues list page
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
  }

  /** @inheritdoc */
  addMultiDom(div) {
    var issuesListing = document.getElementsByClassName('issues-listing')[0],
      wrapper = issuesListing.getElementsByClassName('subnav')[0],
      newIssueBtn = wrapper.childNodes[1];

    div.appendChild(newIssueBtn);
    wrapper.removeChild(wrapper.childNodes[1]);
    wrapper.insertBefore(div, wrapper.firstChild);
  }

  /** @inheritdoc */
  checkAuthentication(callback) {
    this._checkAuthentication('/user', callback);
  }

  /** @inheritdoc */
  authenticate(callback) {
    OAuth.popup('github')
      .done((result) => {
        setChromeStorage(this.tokenKey, result.access_token);
        callback();
      })
      .fail((err) => {
        callback(err);
      });
  }

  /** @inheritdoc */
  getIssue(issueId, callback) {
    this._makeRequest({
      method: 'get',
      baseURL: this.baseUrl,
      url: `/repos/${this.owner}/${this.repo}/issues/${issueId}`
    }, {addToken: true}, (err, issue) => {
      callback(err, issue);
    });
  }

  /** @inheritdoc */
  getCurrentIssue(callback) {
    this.getIssue(this.issueId, callback);
  }


  /** @inheritdoc */
  addComment(issueId, text, callback) {
    this._makeRequest({
      baseURL: this.baseUrl,
      data: {
        body: text
      },
      method: 'post',
      url: `/repos/${this.owner}/${this.repo}/issues/${issueId}/comments`
    }, {addToken: true}, (err, data) => {
      callback(err, data);
    });
  }

  /** @inheritdoc */
  addCommentToCurrentIssue(text, callback) {
    this.addComment(this.issueId, text, callback);
  }

  /** @inheritdoc */
  getSelectedIssues(callback) {
    var issueIds = $('input[type="checkbox"][name="issues\\[\\]"]:checked')
      .map(function () {
        return $(this).val();
      }).get();
    if (issueIds.length === 0) {
      callback(new Error('No issues selected'));
    } else {
      callback(null, issueIds);
    }
  }

  /** @inheritdoc */
  postIssues(issueIds, callback) {
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
}

// Used for testing
var module = module || undefined;
if (module) {
  module.exports = GithubVendor;
} else {
  window.GithubVendor = GithubVendor;
}
