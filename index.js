const http = require('http');
const express = require('express');
const {limiter} = require('./lib/middleware.js');
const FlickServer = require('./lib/FlickServer.js');
const {handleProcessEvents} = require('./lib/handler.js');

handleProcessEvents();

const app = express();
const port = process.env.PORT || 3000;

app.use(limiter);

app.set('trust proxy', 5);

app.use(express.static('public'));

app.use(function(req, res) {
    res.redirect('/');
});

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

const httpServer = http.createServer(app);

new FlickServer(httpServer);

httpServer.listen(port);

console.log('Flick is running on port', port);

Object.defineProperty(String.prototype, 'hashCode', {
    value: function() {
        let hash =  0, i, chr;
        for (i = 0; i < this.length; i++) {
            chr   = this.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
});
