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