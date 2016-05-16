## thkang-submission-readme

### 0. Original Challenge Requirement and submission details

>CHALLENGE OVERVIEW

>Description:
>The GLIB-Chrome-Ext challenges are a set of challenges where we will be building out a chrome extension that inserts a button onto various vendor (Github, Gitlab, Jira, etc) sites in order to launch a new Topcoder challenge(s). This challenge will be removing the replacing the current topcoder token retrieval with an updated endpoint that uses and implicit grant.

>Requirements:
>Remove the current Topcoder token retrieval code.
- Topcoder token retreival code is modified, that user can inspect the details of OAuth implicit grant authorization using chrome consoles.

>Add functionality for retrieving a Topcoder token using the implicit grant Topcoder service. The client_id etc will be added to the forum. Note that it uses a callback url so you will need to add a listener in the background script for handling the callback and storing the information related to the returned JWT token.

- implemented an OAuth implicit grant service for client that is used in the chrome extension (OAuthIGService). the OAuthIGService provides OAuthIGService.getToken() method which returns a promise for the jwt access token. the jwt will be updated by checking .exp value and update will be transparent for the service user.

>Parse the returned JWT token and save the details into chrome storage.
- JWT token is parsed using jwt-decode and saved to chrome storage, which can be accessed by options.html
>Update the extension to check the expiration date on the token prior to using it and refresh it if necessary.
- the OAuthIGService.getToken() method will be transparently utilize a chrome storaged jwt and update a chrome storage jwt if necessary.

>Setup & Reference:
>Use dev mode when working on the extension locally. This is configured in the options of the extension.
>See the README for details around running the extension locally.
>For dev mode you are able to enter any value for the project id when prompted.
>Fork this repo and work off this branch.
>The calls to topcoder endpoints will fail with the new token. This is expected. We will update the extension to use new endpoints in future challenges. For this challenge you only need to demonstrate that you have stored the token and that it is refreshed when the expiration time is passed.

>Feel free to add JWT processing module to the project.


### 1. Configuration & Deployment

  - please go to `src/config.js` and check line 44, `DEFAULT_TC_OAUTH_URL` to an OAuth implicit grant authorization endpoint.

        // src/config.js line 44: default is topcoder oauth implicit grant endpoint
        var DEFAULT_TC_OAUTH_URL = "https://accounts.topcoder-dev.com/oauth";

  - you can run mock OAuth implicit grant endpoints. this is only for testing purposes as the extension works well with default `TC_OAUTH_URL`.
  
          # npm install 
          # node mock-oauth-server/server.js 


  - ![http://i.imgur.com/STnHgvj.png](http://i.imgur.com/STnHgvj.png)

  - load the extension in chrome by going to `chrome://extensions`, turn on `Developer mode`, click `Load unpacked extension..`, and select `src/` folder.

  - ![http://i.imgur.com/PihzELN.png](http://i.imgur.com/PihzELN.png)
  - go to `Options` of loaded `GLIB-ChromeExt`.


  - ![http://i.imgur.com/fZTw1GB.png](http://i.imgur.com/fZTw1GB.png)
  - turn `Development Environment` on. notice that 3 values are added to the options page, which are `TC OAuth Implicit Grant - client_id`, `TC OAuth Implicit Grant - redirect_uri`, `TC OAuth Implicit Grant - Authorization Server URL`.

  - ![http://i.imgur.com/T53pcd9.png](http://i.imgur.com/T53pcd9.png)
  - for proper verification please turn on background page's console by clicking `Inspect Views: background page` in `chrome://extensions` page.

  - please remove all chrome storage for GLIB-ChromeExt before verfication, as verification will require actuall jwt retrieval from chrome storage demonstration.

  - **reload the extension and close any github/gitlab tabs between testing. especially if you did reset/delete in the options page.(you can re-open them.)**

  - **if you are on the options page, please refresh(F5) once before actually inspecting the values**

  - ![http://i.imgur.com/SVprjkn.png](http://i.imgur.com/SVprjkn.png)
  - **please go to option page and reset the current topcoder token in storage between verification runs.**

### 2. Verification

  - currently all GLIB-ChromeExt's functions are disabled on single issue page except OAuth implicit grant token retrival.

  - therefore, please go to any *single issue page* for testing. for github here is my sample single issue page: [https://github.com/thkang2/new-test-repo/issues/5](https://github.com/thkang2/new-test-repo/issues/5)

  - click on the TC button. it will not prompt the user for username/password. instead, it will pass message to `background.js`, and message handler on `background.js` will use OAuthIGService to retrieve a token (directly from an endpoint or from chrome storage). if you inspect on background page's chrome console.

  - the page's `content_script.js` will `alert()` you back with messages with a json web token or error.

  - inspect the internals of oauth token retrieval by `background.js`'s console. you can access it from `chrome://extensions`

  - ![http://i.imgur.com/9mJMB7S.png](http://i.imgur.com/9mJMB7S.png)
  - the actual topcoder endpoint could require user interaction for username/password prompts

  - (I tried to capture the prompt but after I entered credentials once it seems they are saved on chrome)

  - please use mess / appirio123 as credential.

  - ![http://i.imgur.com/Kpoq8S1.png](http://i.imgur.com/Kpoq8S1.png)

  - after a successful login, no more interaction is required until token is expired. (and it seems credential you entered above is saved to chrome itself and authorization is done automatically)

  - ![http://i.imgur.com/pRJjY0m.png](http://i.imgur.com/pRJjY0m.png)

  - notice the background console utilizing chrome storage + checking expiration time
  
  - ![http://i.imgur.com/UeZU6vo.png](http://i.imgur.com/UeZU6vo.png)

  - see the actual token in chrome storage (bearer is only added for convenience)

### 2-2. Detailed Console Messages

  - here's a paste from background page's chrome console after successful token retrieval: 

        getting token
        lookup TC Token in storage
        no TC token in storage
        requesting TC Token https://192.168.0.103:30001/authorize-success?response_type=token&client_id…ri=https%3A%2F%2Fkbdpmophclfhglceikdgbcoambjjgkgb.chromiumapp.org%2Foauth2
        response from authorization endpoint:  Object {access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6I…4ODV9.MeTs5yHHKEZ9b45EDN7tR-MgO26n17UlvmFBkwktv2Q", token_type: "bearer", state: ""}
        successfully parsed a JWT:  Object {email: "test@topcoder.com", handle: "test-user", iss: "https://api.topcoder-dev.com", jti: "7b8ff3c6-54ef-496b-9a2d-4b937fd02e85", roles: Array[0]…}
        got TC token from redirect Object {email: "test@topcoder.com", handle: "test-user", iss: "https://api.topcoder-dev.com", jti: "7b8ff3c6-54ef-496b-9a2d-4b937fd02e85", roles: Array[0]…}

  - (notice the valid [Authorization Request](https://tools.ietf.org/html/rfc6749#section-4.2.1) from the extension. though state is not set it provided valid response_type, client_id, and redirect_uri in query string)

  - and the `content_script.js`'s chrome console (inspected by F12 on the github issue page):

        requesting an access token using OAuth implicit grant from service
        received jwt from OAuth implicit grant:  
          Object
            bearer: "Bearer "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRlc3RAdG9wY29kZXIuY29tIiwiaGFuZGxlIjoidGVzdC11c2VyIiwiaXNzIjoiaHR0cHM6Ly9hcGkudG9wY29kZXItZGV2LmNvbSIsImp0aSI6IjdiOGZmM2M2LTU0ZWYtNDk2Yi05YTJkLTRiOTM3ZmQwMmU4NSIsInJvbGVzIjpbXSwidXNlcklkIjoiOTk5OTk5IiwiaWF0IjoxNDYzNDE1ODg1LCJleHAiOjE0NjM3NzU4ODV9.MeTs5yHHKEZ9b45EDN7tR-MgO26n17UlvmFBkwktv2Q""
            email: "test@topcoder.com"
            exp: 1463775885
            handle: "test-user"
            iat: 1463415885
            iss: "https://api.topcoder-dev.com"
            jti: "7b8ff3c6-54ef-496b-9a2d-4b937fd02e85"
            roles: Array[0]
            userId: "999999"
            __proto__: Object 

  - (notice that bearer attribute is only added for convenience, this is not part of a json web token, it's only added that `content_script.js` can add `Authorization: Bearer ".."` header easily when sending requests)

  - if you click on the TC button again, background page's chrome console will be a bit different.

        getting token
        lookup TC Token in storage
        found TC token in storage Object {bearer: "Bearer "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlb…ODV9.MeTs5yHHKEZ9b45EDN7tR-MgO26n17UlvmFBkwktv2Q"", email: "test@topcoder.com", exp: 1463775885, handle: "test-user", iat: 1463415885…}
        comparing now and exp:  1463416236 1463775885
        resolving token without renewal

        (notice that the token is retrieved from chrome storage, and expiration timestamp is checked.

  - token retrieval is transparent from `content_script.js`'s view, it does not know whether the token is fetched from an authorization enpoint, or picked up from chrome storage.

  - if token is expired, you may see following messages from the background page's chrome console:

        getting token
        lookup TC Token in storage
        found TC token in storage Object {bearer: "Bearer "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlb…NjV9.w7kx96IMfnVXdma6iUUof4sL9kUq6TPBpOcAx7Mp8JI"", email: "test@topcoder.com", exp: 1463416465, handle: "test-user", iat: 1463416464…}
        comparing now and exp:  1463416476 1463416465
        renewal of current jwt needed
        requesting TC Token https://192.168.0.103:30001/authorize-success?response_type=token&client_id…ri=https%3A%2F%2Fkbdpmophclfhglceikdgbcoambjjgkgb.chromiumapp.org%2Foauth2
        response from authorization endpoint:  Object {access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6I…0Nzh9.KHJu0dTNkJwjTVHUkLDtGupq8RDh8XcrSwzA1JNnvrA", token_type: "bearer", state: ""}
        successfully parsed a JWT:  Object {email: "test@topcoder.com", handle: "test-user", iss: "https://api.topcoder-dev.com", jti: "7b8ff3c6-54ef-496b-9a2d-4b937fd02e85", roles: Array[0]…}

  - this time, the token is picked up from chrome storage but expired. the `OAuthIGService` transparently requested the authorization backend to retrieve a new token.

  - `OAuthIGService` is also capable of handling Error Response or bad server response (like disconnects).

        getting token
        lookup TC Token in storage
        no TC token in storage
        requesting TC Token https://192.168.0.103:30001/authorize-failure?response_type=token&client_id…ri=https%3A%2F%2Fkbdpmophclfhglceikdgbcoambjjgkgb.chromiumapp.org%2Foauth2
        response from authorization endpoint:  Object {error: "access_denied", error_description: "this_should_fail", state: ""}
        error was in response, rejecting: Object {error: "access_denied", error_description: "this_should_fail", state: ""}

  - please look at source code of `src/background.js` and `src/OAuthIGSvc.js`, they are documented.


### 3. Implementation details

  - `OAuthIGService` is completely decoupled from chrome internals, to use the service you have to supply  
     - storage get function (like `chrome.storage.local.get`)
     - storage set function (like `chrome.storage.local.set`)
     - requesting function that will actually GET request an OAuth implicit grant endpoint (implemented using `chrome.identity.launchWebAuthFlow` in `background.js`)
     - an resolving function, which will resolve the redirection location back to OAuthIGService using callback
     - configuration values (mostly key names and default values for lookup in storage)
     - see `background.js` for actual usage

  - `background.js` runs a message listener. content_script.js can request a jwt from `background.js` by messaging. `background.js` will request a jwt from `OAuthIGService`. tokens are passed between `background.js` and `OAuthIGService` by using promises, and between `contesnt_script.js` and `background.js` using `sendResponse` callbacks.

  - external script used: [`jwt-decode`](https://github.com/auth0/jwt-decode) for chrome extension.
  - `express`, `request-promise`, `node-jsonwebtoken` .. for implementation of a mock oauth server. (not necessary)

### 4. Sample screenshots:

  - ![token success](http://i.imgur.com/y5DSduH.png)
  - ![token success](http://i.imgur.com/KiwvdPG.png)
  - images: successful retrieval of a token

  - ![options page](http://i.imgur.com/Tf0HGri.png)
  - image: updated options page 
    



  


