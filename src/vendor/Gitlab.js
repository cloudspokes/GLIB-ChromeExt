'use strict';

/**
 * The class for handling creating contests from Gitlab.
 * @class
 */
class GitlabVendor extends BaseVendor {
  /** @inheritdoc */
  get tokenKey() {
    return 'glib::gitlab_token';
  }

  /** @inheritdoc */
  get baseUrl() {
    return `https://${this.domain}/api/v3`;
  }

  /** @inheritdoc */
  get commentNewLine() {
    return '  \n';
  }

  /** @inheritdoc */
  isEnabled() {
    var exec = this.runRegExpOnPathname(/([\d\w\.\-]+)\/([\d\w\.\-]+)\/issues\/(\d+)/);
    if (!exec) {
      return false;
    }
    this.owner = exec[1];
    this.repo = exec[2];
    this.issueId = exec[3];
    this.projectId = `${this.owner}%2F${this.repo}`;
    this.uniqueIssueId = null; // will be fetched later, unique id for issues in whole app

    return document.getElementsByClassName('issue-btn-group').length > 0;
  }

  /** @inheritdoc */
  addButton(btn) {
    btn.className = btn.className.replace('btn-sm', '') + ' btn-grouped';
    const wrapper = document.getElementsByClassName('issue-btn-group')[0];
    wrapper.insertBefore(btn, wrapper.firstChild);
  }

  /** @inheritdoc */
  isMultiEnabled() {
    return false;
  }

  /** @inheritdoc */
  authenticate(callback) {
    chrome.runtime.sendMessage({auth: 'gitlab'}, (response) => {
      const err = response.err;
      const result = response.result;
      if (err) {
        return callback(err);
      }
      setChromeStorage(this.tokenKey, result.access_token);
      callback();
    });
  }

  /** @inheritdoc */
  checkAuthentication(callback) {
    this._checkAuthentication('/user', callback);
  }

  /** @inheritdoc */
  getIssue(issueId, callback) {
    this._makeRequest({
      method: 'get',
      baseURL: this.baseUrl,
      url: `/projects/${this.projectId}/issues?iid=${this.issueId}`
    }, {addToken: true}, (err, data) => {
      if (err) {
        return callback(err);
      }
      const issue = data[0];
      if (!issue) {
        return callback(new Error('Issue not found'));
      }
      issue.repository_url = `http://${this.domain}/${this.owner}/${this.repo}`;
      callback(err, issue);
    });
  }

  /** @inheritdoc */
  getCurrentIssue(callback) {
    this.getIssue(this.issueId, (err, issue) => {
      this.uniqueIssueId = issue && issue.id;
      callback(err, issue);
    });
  }

  /** @inheritdoc */
  addComment(issueId, text, callback) {
    this._makeRequest({
      baseURL: this.baseUrl,
      data: {
        body: text
      },
      method: 'post',
      url: `/projects/${this.projectId}/issues/${issueId}/notes`
    }, {addToken: true}, (err, data) => {
      callback(err, data);
    });
  }

  /** @inheritdoc */
  addCommentToCurrentIssue(text, callback) {
    this.addComment(this.uniqueIssueId, text, (err, data) => {
      if (err) {
        return callback(err);
      }
      // show loading status until comment is loaded by ajax/socket
      const divId = 'note_' + data.id;
      this._waitForElement(divId, callback);
    });
  }
}

// Used for testing
var module = module || undefined;
if (module) {
  module.exports = GitlabVendor;
} else {
  window.GitlabVendor = GitlabVendor;
}
