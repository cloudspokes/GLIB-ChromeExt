'use strict';

const express = require('express');
const fs = require('fs');
const app = express();
const https = require('https');
const jwt = require('jsonwebtoken');
const path = require('path');

const f = (filename) => path.resolve(__dirname, filename);

app.get('/authorize-success', function (req, res) {
    const redirect_uri = req.query.redirect_uri;
    const samplePayload = {
        email: "test@topcoder.com",
        handle: "test-user",
        iss: "https://api.topcoder-dev.com",
        jti: "7b8ff3c6-54ef-496b-9a2d-4b937fd02e85",
        roles: [],
        userId: "999999"
    }
    samplePayload.iat = Math.floor(new Date().getTime() / 1000);
    samplePayload.exp = samplePayload.iat + 360000; 

    const hash = [
        `#access_token=${jwt.sign(samplePayload, "secret")}`,
        `&token_type=bearer`,
        `&state=${req.query.state || ''}`
    ].join('');
    const resp = redirect_uri + hash
    console.log('success redirect to:', resp);
    res.redirect(302, resp);
});

app.get('/authorize-failure', function (req, res) {
    const redirect_uri = req.query.redirect_uri;
    const hash = [
        `#error=access_denied`,
        `&error_description=this_should_fail`,
        `&state=${req.query.state || ''}`
    ].join('');
    const resp = redirect_uri + hash;
    console.log('failed redirect to:', resp);
    res.redirect(302, resp);
});

const port = parseInt(process.env.MOCK_OAUTH_SERVER_PORT,10) || 30001;

const listner = https.createServer({
    key: fs.readFileSync(f('key.pem')),
    cert: fs.readFileSync(f('cert.pem'))
}, app).listen(port, "0.0.0.0");

console.log("mock oauth server runnning authorization endpoint on:" +
             `\n\thttps://0.0.0.0:${port}/authorize-success` + 
             `\n\thttps://0.0.0.0:${port}/authorize-failure`);

