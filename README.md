# GLIB-ChromeExt


## Configuration

`src/config.js` contains configuration
`OAUTH_API_KEY` the API Key from https://oauth.io/
`TC_ENDPOINT_DEV` (for development mode) or `TC_ENDPOINT_PROD` (for production mode) the topcoder endpoint where issue details are posted, add same url to `permissions` in `manifest.json` (it must end with `*`)
`EXTENSION_ID` - the id of your chrome extension in development mode extension should be always `kbdpmophclfhglceikdgbcoambjjgkgb`, because it depends on `key` field from `manifest.json`  
When built to `.crx` package, this extension id will change (for current key.pem it will be `phfneeihkekjcfoepileggaaghickefj`). This is needed for callback urls in oauth2 clients.

`OAUTH_APPS` contains `map<String, Object>` for available oauth2 providers (only `gitlab` for now)
Each object should contain properties
- `clientId` the client id
- `clientSecret` the client secret
- `redirectUri` the redirect url, path in Uri can be any
- `scope` the oauth2 scope
- `authorizeUrl` the url for authorization
- `tokenUrl` the url for token exchange
Only `clientID`, `clientSecret` and `redirectUri` should be updated.


### Setup github app
- open https://github.com/settings/developers
- click `Register new application`
- pick any `Application name` and `Homepage URL`
- set `Authorization callback URL` to `https://oauth.io/auth`
- copy `Client ID` and `Client Secret` it will be needed in oauth.io setup

### Setup gitlab app
- open https://gitlab.com/profile/applications
- enter any name and redirect URI (e.g. `https://kbdpmophclfhglceikdgbcoambjjgkgb.chromiumapp.org/oauth2`)
- Click Save application
- Copy `Application Id` to `clientId` and `Secret` to `clientSecret`
- Note in `Authorized applications (5)` there is a bug and permissions can't be revoked. If you click on `Destroy` your application will be destroyed.

### Setup jira app
No setup needed. Authentication is based on cookies.

### Setup oauth.io
- open https://oauth.io/ and go to dashboard
- select from left menu `Default app` -> `New app`
- pick any `Application name`, add `github.com` to `Domain available`
- click `Create`
- `Public key` is your `OAUTH_API_KEY` setting
- Make sure `Domains & URLs whitelist` contains `github.com` (it's buggy)
- Go to `Integrated APIs` from left menu
- Click `Add APIs` and search for `github`
- set `client_id` and `client_secret` from **Setup github app**
- set `scope` to `repo`
- click `Save changes`

### Npm scripts
node v5 is required https://nodejs.org/en/  
Before your run any script install dependencies by `npm install`
`npm test` - run unit tests  
`npm run lint` or `npm run lint:fix` - run eslint check (NOTE: rules should be more strict, existing code doesn't pass validation)  
`npm run build` - build extension to `crx` package. It will be built to `dist/GLIB-ChromeExt.crx`, Copy your private key to `certs/key.pem`  
See https://rietta.com/blog/2012/01/27/openssl-generating-rsa-key-from-command/ how to generate it (you can use existing key)

### Load extension
- Open chrome
- go to chrome://extensions/
- check `Developer mode` checkbox
- click `Load unpacked extension...` and select `GLIB-ChromeExt/src` directory
- If you want to add a `crx` package, you must drag&drop it to the chrome extension page


### Verification
Video https://youtu.be/rYRLGfEOGzg
It's recommended to create a new repository https://github.com/new
then go to `Issues` tab and create a new issue

## Prompt

Prompts the user for their TopCoder credentials, requests and saves token in
localStorage.  If token is already stored locally, doesn't prompt for login.

### Modifications
- Added promptTopCoder(): Populates username and password from prompt
- Changed credentials checked within authenticateTopCoder() to new variables
- Modified checkTopCoderAuthentication() to call promptTopCoder() if user is not authenticated

### Third Party Libraries

* [Vex](http://github.hubspot.com/vex/): Used for the TopCoder Prompt
    - MIT License
* [jQuery](https://jquery.org/): Dependency for Vex
    - MIT License



### Option Screen


#### Changes made to existing code for TC challenge 30053157

* The local storage has been replaced with chrome storage because local storage for GitHub domain can not be accessed from extension options page. Browser does not allow this for security reasons.


#### New features added in the option screen

* `Github Token:`The GitHub token will now appear on settings page. There is a `Delete` button present, which on click will remove the github token from the  chrome storage.
* `TopCoder Token:`The TopCoder token will now appear on settings page.There is another `delete` button present which on click will remove the TopCoder token from chrome storage.
* `Github-TopCoder Mappings:` There is an option for mapping Git repo URLs with TopCoder project Id . The lists are in the `editable format`. There is a `delete` option for each mapping pair.This mapping is going to be used in future.


#### Additional feature added

`2 additionals features`  have been added.
* `Delete All:` It will delete all the mappings`(repo URLs and IDs)`
* `Add Mass:`Using this features one can add multiple mappings`(repo URLs and IDs)` simultaneously.This becomes handy when there are too many of mappings to be done.
##### Settings
While adding multiple mappings simultaneously there is a `delimiter` which separates repo URLS from IDs.Its default value is `###` and can be configured in `options.js`.
