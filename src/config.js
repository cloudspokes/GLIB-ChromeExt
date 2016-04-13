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
