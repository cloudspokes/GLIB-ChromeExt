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
var TOKEN_KEY_GITHUB = 'glib::github_token';
var TOKEN_KEY_TOPCODER = 'glib::topcoder_token';
var GITHUB_URL = 'https://api.github.com/';

OAuth.initialize(OAUTH_API_KEY);

//current view information
//parsed from URL
var owner, repo, issueId;

/**
 * Try to inject a button.
 * This is infinite interval, because page content can be updated dynamically
 * (when new comment is added or because of html5 navigation).
 */
function injectButton() {
    setInterval(function () {
        if (document.getElementById('LAUNCH_ON_TC')) {
            //button already exists
            return;
        }
        var exec = /([\d\w\.\-]+)\/([\d\w\.\-]+)\/issues\/(\d+)/.exec(location.pathname);
        if (!exec) {
            //not issue details
            return;
        }
        owner = exec[1];
        repo = exec[2];
        issueId = exec[3];
        var showIssue = document.getElementById('show_issue');
        if (!showIssue) {
            return;
        }
        var wrapper = showIssue.getElementsByClassName('gh-header-actions')[0];
        if (!wrapper) {
            return;
        }
        var btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-default';
        btn.innerText = 'Launch on TC';
        btn.setAttribute('id', 'LAUNCH_ON_TC');
        btn.addEventListener('click', function () {
            btn.setAttribute('disabled', 'disabled');
            btn.innerText = 'Processing...';
            launchOnTC(function () {
                btn.removeAttribute('disabled');
                btn.innerText = 'Launch on TC';
            });
        });
        wrapper.insertBefore(btn, wrapper.firstChild);
    }, CHECK_INTERVAL);
}

/**
 * Show github oauth popup
 * @param callback the callback function
 */
function authenticateGithub(callback) {
    OAuth.popup('github')
        .done(function (result) {
            localStorage[TOKEN_KEY_GITHUB] = result.access_token;
            callback();
        })
        .fail(function (err) {
            callback(err);
        });
}

/**
 * Get suffix for url that will prevent caching
 * @returns {string} the suffix
 */
function noCacheSuffix() {
    return '?_t=' + (new Date().getTime());
}

/**
 * Ensure user is authenticated
 * @param callback the callback function
 */
function checkGithubAuthentication(callback) {
    if (!localStorage[TOKEN_KEY_GITHUB]) {
        authenticateGithub(callback);
        return;
    }
    //check if token is valid
    axios({
        baseURL: GITHUB_URL,
        headers: {
            'authorization': 'bearer ' + localStorage[TOKEN_KEY_GITHUB]
        },
        method: 'get',
        url: '/user' + noCacheSuffix()
    }).then(function () {
        callback();
    }, function (response) {
        console.log(response);
        if (response.status === 401) {
            //token expired or revoked
            delete localStorage[TOKEN_KEY_GITHUB];
            checkGithubAuthentication(callback);
        } else {
            console.error(response);
            callback(new Error('Github GET /user: ' + response.status + ' status code'));
        }
    });
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
            $.extend({}, vex.dialog.buttons.YES, { text: 'Login' }),
            $.extend({}, vex.dialog.buttons.NO, { text: 'Cancel' })
        ],
        callback: function(data) {
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
    axios.post(TC_ENDPOINT + 'oauth/access_token',  {
        'x_auth_username': username,
        'x_auth_password': password
    }).then(function (result) {
        if(result.data.errorMessage) {
            callback({message: result.data.errorMessage});
        } else {
            localStorage[TOKEN_KEY_TOPCODER] = result.data.x_auth_access_token;
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
    if (!localStorage[TOKEN_KEY_TOPCODER]) {
        async.waterfall([
            promptTopCoder,
            authenticateTopCoder
        ], function(err) {
            if (err) {
                callback(err);
                return;
            }
            callback();
            return;
        });
    } else {
        callback();
        return;
    }
}

/**
 * Get current issue details
 * @param callback the callback function
 */
function getIssue(callback) {
    var url = '/repos/' + owner + '/' + repo + '/issues/' + issueId;
    axios({
        baseURL: GITHUB_URL,
        headers: {
            'authorization': 'bearer ' + localStorage[TOKEN_KEY_GITHUB]
        },
        method: 'get',
        url: url + noCacheSuffix()
    }).then(function (response) {
        callback(null, response.data);
    }, function (response) {
        console.error(response);
        callback(new Error('Github GET ' + url + ': ' + response.status + ' status code'));
    });
}

/**
 * Post issue to TC endpoint and format response
 * @param {Object} issue the github issue to post
 * @param callback the callback function
 */
function postIssue(issue, callback) {
    axios.post(TC_ENDPOINT, issue, {
        headers: {
            'x-auth-access-token': localStorage[TOKEN_KEY_TOPCODER]
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
            delete localStorage[TOKEN_KEY_TOPCODER];
            checkTopCoderAuthentication(function () {
                postIssue(issue, callback);
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
}

/**
 * Add comment to current issue
 * @param {String} text the comment text
 * @param callback the callback function
 */
function addComment(text, callback) {
    var url = '/repos/' + owner + '/' + repo + '/issues/' + issueId + '/comments';
    axios({
        baseURL: GITHUB_URL,
        headers: {
            'authorization': 'bearer ' + localStorage[TOKEN_KEY_GITHUB]
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
}

/**
 * Handle button click
 */
function launchOnTC(callback) {
    async.waterfall([
        checkGithubAuthentication,
        checkTopCoderAuthentication,
        getIssue,
        postIssue,
        addComment
    ], function (err) {
        if (err) {
            if (err.message === 'topcoder login window closed') {
                callback();
                return;
            }
            console.error(err);
            if (err.message !== 'The popup was closed') {
                alert('An error occurred: ' + err.message);
            }
        } else {
            //scroll to bottom so created issue will be visible
            window.scrollTo(0, document.body.scrollHeight);
        }
        callback();
    });
}

//initial load
injectButton();