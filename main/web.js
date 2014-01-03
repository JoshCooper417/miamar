// web.js
var express = require("express");
var logfmt = require("logfmt");
var app = express();

var path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logfmt.requestLogger());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.render('quiz', { message: 'created'})
});

app.get('/leaderboard', function(req, res) {
    res.render('leaderboard', { message: 'created'})
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log("Listening on " + port);
});