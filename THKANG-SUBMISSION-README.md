THKANG-SUBMISSION-README.md

##### sorry for bothering you with multiple submissions. The challenge seemed very trivial first, but it wasn't really, and some messages that I sent to copilot/reviewer weren't answered (maybe timezone mismatch).

> Description:
> 
> The GLIB-Chrome-Ext challenges are a set of challenges where we will be building out a chrome extension that inserts a button onto various vendor (Github, Gitlab, Jira, etc) sites in order to launch a new Topcoder challenge(s). This this challenged we will be altering the code that does the button injection as it is currently causing the page to freeze up on Github after a period of time. We will be updating the extension to use chome events that are triggered on updates to the page that will check the url on updates and only inject the styles and button when the appropriate url is detected.

> Requirements:
> 
> Add tabs to the permission object in the manifest.

  - Added `tabs`
  - Added `webRequests` : to capture github/jira's api call and subsequent DOM redraws
  - Added 'webNavigation' : to capture requests to a different page (real navigation: not just modifying history/state. whole page is new, parsed again from <html>)
  - "http://*/", "https://*/"` added to allow css injection to the entry (last two required in order to allow `chrome.tabs.insertCSS`)

>In the background.js script add a chrome.tabs.onUpdated event handler that will check the current url to determine if the styles need to be injected and button added. Note the event will fire multiple times for a single page navigation (such as clicking issues in github). Your code should verify that the styles and button have not already been injected for the current view.

- currently there are duplicate checks for button injection in content_script.js.  I have reused them.
- css is only injected when webNavigaion happens, to prevent duplicates

> Use the chrome.tab.injectCss function add the required styles to the active tab.

- uses `chrome.tab.insertCSS` function, which fires only when a vendor is detected
- note that css files are modified, to match path rules for a chrome extension or image's won't load
- css files are modified, that buttons have `display: ... !important` as injected CSS have lower precedence than rules from <style> or <link> 
 
>Update the code to add the button to the page when necessary. This can either be done using something like chome.tab.executeScript (note there will need to be a custom setup per vendor), or by firing an event to be handled in the contest_script.js that will use the current button injection code.

- content script no longer has vender detection codes, completely removed
- previously vendor detection was done using `host` value checks, this behavior kept
- `background.js` detects vendor and passes to content_script.js
- `content_script.js` runs injections of buttons
- in previous submissions I made some mistake of not using Github/Gitlab/Jira domain set by user. this behavior is fixed.

> Depending on your implementation update or removed the code in the content_script that is no longer necessary. Note that the purpose of this challenge is to remove the setInterval functions from the button injects so be sure that those are removed.
 
- removed: global `vendor` in `content_script.js`. 
- removed: `setInterval` in `content_script.js`
- deleted: vendor detection functionality in content_script.js
- deleted: css injection functionality in content_script.js
- added: before actually talking to topcoder api, local `vendor` will run .isEnabled() to set up vendor attributes.
- added: `vendor` is initiated by message handler in content_script.js and that `vendor` is kept in a closure (a chain from button injection to actual challenge uplaod).

>Update the code that is executed on load, removing the button and style inject checks.
It would be ideal if the `chome.tab.onUpdated listener was only added when a valid vendor is detected. Explore this possibility and document in your submission if you were not able to accomplish this goal.

- this is simply not possible, you have to attach to events of webNavigation/tabs.onUpdated/webRequest, to obtain a tab's current url information. 

>Add a common logging function that uses console.log, but will only log out when the extension in developer mode. You added function should use this logging function to console.log out statements indicating execution in the extension.

- check function `log` in `background.js`

>Ensure that the gulpfile tasks and scripts in package.json all still pass after you updates. You should add unit test for added functionality.

- It is unfortunate that tests can't be added, as I don't know how to (and whether it is possible) simulate google chrome itself in mocha.
- all codes added to background.js and content_script.js are event handlers, can't write tests unless mock `chrome.**` api exists
- maybe we can use some automation tests like selenium but, I don't know how to provide a full selenium test environment that you can run portably and agree to
- I created a new github repo and an issue to test buttons work
- checked button displayed correctly on [sample repo issue list](https://github.com/thkang2/new-test-repo/issues)
- checked button displayed correctly on [sample repo single issue](https://github.com/thkang2/new-test-repo/issues/1)
- also tested on gitlab with sample repo single issue page
- tested on jira
- because all of three websites are basically Single Page Apps, it was required to test all possible user actions (create issue, comment on issue, edit issue, ... ) and make sure the TC button persists after SPA framework's DOM updates.

>Setup & Reference:
  
>Use dev mode when working on the extension locally. This is configured in the options of the extension.

>See the README for details around running the extension locally.
>For dev mode you are able to enter any value for the project id when prompted.
