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
  }
  return true;
});
