# GLIB-ChromeExt


## Configuration

`config.js` contains configuration
`OAUTH_API_KEY` the API Key from https://oauth.io/
`TC_ENDPOINT` the topcoder endpoint where issue details are posted, add same url to `permissions` in `manifest.json` (it must end with `*`)

### Setup github app
- open https://github.com/settings/developers
- click `Register new application`
- pick any `Application name` and `Homepage URL`
- set `Authorization callback URL` to `https://oauth.io/auth`
- copy `Client ID` and `Client Secret` it will be needed in oauth.io setup


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


### Load extension
- Open chrome
- go to chrome://extensions/
- check `Developer mode` checkbox
- click `Load unpacked extension...` and select GLIB-ChromeExt directory


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
