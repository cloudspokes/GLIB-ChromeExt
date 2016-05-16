/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * Represents the configuration file
 * @version 1.0
 * @author TCSASSEMBLER
 */


var OAUTH_API_KEY = '8XdfQwEhyOpybXm-usraorw483U';

var TC_ENDPOINT_DEV = 'https://glib-mock.herokuapp.com/';
var TC_ENDPOINT_PROD = 'https://glib-prod.herokuapp.com/';
var EXTENSION_ID = 'kbdpmophclfhglceikdgbcoambjjgkgb';

var OAUTH_APPS = {
  gitlab: {
    clientId: '2e7ddb0f2135d5f81407d49941a6cb1a83767b200a584e97f9fb92684ce71c89',
    clientSecret: '79d574243aa4a133db7ac16b37a994c8698ee22708d24a1bf2a0a5c16486b293',
    redirectUri: `https://${EXTENSION_ID}.chromiumapp.org/oauth2`,
    scope: 'api',
    authorizeUrl: 'https://gitlab.com/oauth/authorize',
    tokenUrl: 'https://gitlab.com/oauth/token'
  }
};

// Shared constants, do not change
var DEFAULT_GITHUB_DOMAIN = 'github.com';
var DEFAULT_GITLAB_DOMAIN = 'gitlab.com';
var DEFAULT_JIRA_DOMAIN = 'appirio.atlassian.net';
var DOMAIN_KEY_GITHUB = 'glib::github_domain';
var DOMAIN_KEY_GITLAB = 'glib::gitlab_domain';
var DOMAIN_KEY_JIRA = 'glib::jira_domain';

var TC_OAUTH_URL_KEY = "glib::tc_oauth_url";
var TC_OAUTH_EXPIRE_KEY = "glib::tc_oauth_expire";
var TC_OAUTH_TOKEN_KEY = "glib::tc_oauth_token";
var TC_OAUTH_CLIENT_ID_KEY = "glib::tc_oauth_client_id";
var TC_OAUTH_REDIRECT_URI_KEY = "glib::tc_oauth_redirect_uri";

var DEFAULT_TC_OAUTH_CLIENT_ID = "99831715-8dff-4473-a794-dfc8e9755ce1";
var DEFAULT_TC_OAUTH_REDIRECT_URI = "https://kbdpmophclfhglceikdgbcoambjjgkgb.chromiumapp.org/oauth2";
// var DEFAULT_TC_OAUTH_URL = "https://private-6f5541-tcgliboauth.apiary-mock.com/authorize";

var DEFAULT_TC_OAUTH_URL = "https://192.168.0.103:30001/authorize";

var ENVIRONMENT = 'glib::environment';

if (typeof module !== 'undefined') {
    module.exports =  {
      TC_OAUTH_TOKEN_KEY,
      TC_OAUTH_URL_KEY,
      TC_OAUTH_REDIRECT_URI_KEY,
      TC_OAUTH_CLIENT_ID_KEY,
      DEFAULT_TC_OAUTH_URL,
      DEFAULT_TC_OAUTH_REDIRECT_URI,
      DEFAULT_TC_OAUTH_CLIENT_ID,
      ENVIRONMENT
    };
}