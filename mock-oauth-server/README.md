# mock-oauth-server

A mock OAuth 2.0 implicit grant authorization endpoint

### deployment

- Running `npm install` on the `Glib-ChromeExt/` folder would've already installed the dependencies for `mock-oauth-server`
- Set environment variable `MOCK_OAUTH_SERVER_PORT` to configure endpoint port. default: `30001`
- OAuth requires https; it already has `cert.pem` and `key.pem` files, but you can generate your own. Make sure that chrome trusts those cert files.


### Running

- To actually run `mock-oauth-server`:  `# npm run mock-oauth`

- above command will provide two endpoints. sample output:

        mock oauth server runnning authorization endpoint on:
            https://0.0.0.0:30001/authorize-success
            https://0.0.0.0:30001/authorize-failure


- First endpoint will always result in success, whatever client_id or redirect_uri you provided. The chrome extension will parse the respone and save json web token, but it will be meaningless to topcoder API.
- Second endpoint will always result in failure.
- Configure the extension's endpoint to one of them to test implicit grant authorizaiton. Change this value in `GLIB-ChromeExt/src/config.js`: 

        var DEFAULT_TC_OAUTH_URL = '<change-me>';
