'use strict';

const express = require('express');
const fs = require('fs');
const rp = require('request-promise');
const app = express();
const https = require('https');

app.get('/authorize', function (req, res) {
    const options = {
        method: 'POST',
        uri: 'https://glib-mock.herokuapp.com/oauth/access_token',
        body: JSON.stringify({
            "x_auth_username": "mess",
            "x_auth_password": "appirio123"
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }

    rp(options)
        .then(function (body) {            
            let response = JSON.parse(body);
            console.log(body);
            if (response.errorMessage) {
                response = {"x_auth_access_token":"d6ca1599-e279-47a7-8df8-24b7cb6d8966","expiry":"Sun, 14-Aug-2016 04:18:01 GMT","message":"authentication successful"};
            }

            const expires_at = new Date(response.expiry);            
            const expires_in = Math.floor((expires_at.getTime() - new Date().getTime()) / 1000);
            const hash = [  `#access_token=${response.x_auth_access_token}`,
                            '&token_type=bearer',
                            `&expires_in=${expires_in}` ].join('');
            console.log(hash)
            res.redirect(302, 'https://kbdpmophclfhglceikdgbcoambjjgkgb.chromiumapp.org/oauth2' +
                         hash);
        
        });
});

const port = 30001;

const listner = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app).listen(port, "0.0.0.0");

console.log("mock oauth server runnning authorization endpoint on:\t" +
             `https://0.0.0.0:${port}/authorize`);

