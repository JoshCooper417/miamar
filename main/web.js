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
    res.render('login', { message: 'created'})
});

app.get('/quiz',function(req,res){
    console.log('QUIZ');
    res.render('quiz', { message: 'quizzing'})
});

var port = process.env.PORT || 5000;
app.listen(port, function() {
    console.log("Listening on " + port);
});