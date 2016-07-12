'use strict';

/**
 * The class for handling creating contests from Gitlab.
 * @class
 */
class JiraVendor extends BaseVendor {

  /**
   * @constructor
   */
  constructor(domain) {
    super(domain);
    // after comment is added, comment is focused but page is not scrolled to the bottom
    // scroll to bottom if url contains `scroll-bottom` query string
    const reg = /scroll-bottom=(comment-\d+)/;
    const exec = reg.exec(window.location.href);
    if (exec) {
      const nodeId = exec[1];
      // comment are not loaded instantly
      // check if added comment is visible
      this._waitForElement(nodeId, () => {
        window.scrollTo(0, document.body.scrollHeight);
      });
    }
  }

  /** @inheritdoc */
  get baseUrl() {
    return `https://${this.domain}/rest/api/2`;
  }

  /** @inheritdoc */
  formatCodeBlock(text) {
    return [
      '{code}',
      text,
      '{code}'
    ].join(this.commentNewLine);
  }

  /** @inheritdoc */
  isEnabled() {
    var exec = this.runRegExpOnPathname(/browse\/([\d\w_]+-\d+)/);
    if (!exec) {
      return false;
    }
    this.issueId = exec[1];
    this.projectKey = this.issueId.split('-')[0];

    // check if comment button exists
    // if doesn't existing, the topcoder button won't work
    return document.getElementsByClassName('ops-menus').length > 0;
  }

  /** @inheritdoc */
  addButton(btn) {
    btn.className += ' toolbar-trigger';
    const wrapper = document.getElementsByClassName('ops-menus')[0].firstChild
    const ul = document.createElement('ul');
    ul.className = 'toolbar-group';
    const li = document.createElement('li');
    li.className = 'toolbar-item';

    wrapper.appendChild(ul);
    ul.appendChild(li);
    li.appendChild(btn);
  }

  /** @inheritdoc */
  isMultiEnabled() {
    return false;
  }

  /** @inheritdoc */
  authenticate(callback) {
    // cookie based authentication
    // user is always authenticated
    callback();
  }

  /** @inheritdoc */
  checkAuthentication(callback) {
    // always valid
    callback();
  }

  /** @inheritdoc */
  getIssue(issueId, callback) {
    this._makeRequest({
      method: 'get',
      baseURL: this.baseUrl,
      url: `/issue/${this.issueId}`
    }, {}, (err, issue) => {
      if (err) {
        return callback(err);
      }
      issue.repository_url = `https://${this.domain}/browse/${this.projectKey}`;
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
      url: `/issue/${this.issueId}/comment`
    }, {}, (err, data) => {
      callback(err, data);
    });
  }

  /** @inheritdoc */
  addCommentToCurrentIssue(text, callback) {
    this.addComment(this.issueId, text, (err, data) => {
      if (err) {
        return callback(err);
      }
      // comments are not updated by ajax/sockets
      // refresh page manually
      window.location = `/browse/${this.issueId}?focusedCommentId=${data.id}&scroll-bottom=comment-${data.id}`;
    });
  }

  /** @inheritdoc */
  getChallengesEndpoint() {
    return 'challenges/jira';
  }
}

// Used for testing
var module = module || undefined;
if (module) {
  module.exports = JiraVendor;
} else {
  window.JiraVendor = JiraVendor;
}
