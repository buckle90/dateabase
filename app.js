var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var config = require('./config');
var User = require('./models/users');

var app = express();

/**
 * Set up DB
 */

//Set up default mongoose connection
app.set('secret', config.secret);
mongoose.connect(config.database);
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Create test user
User.count({}, function (err, c) {
    if (c === 0) {
        // Create an instance of model SomeModel
        var user = new User({
            first_name: 'Jacob',
            last_name: "Buckley",
            email: "buckley.msu@gmail.com",
            identifier: "buckley.msu@gmail.com",
            password: "test123",
            admin: true
        });

        // Save the new model instance, passing a callback
        user.save(function (err) {
            if (err) console.log(err);
            // saved!
        });
    }
});

module.exports = app;

var index = require('./routes/index');
var users = require('./routes/users');
var matches = require('./routes/matches');
var messages = require('./routes/messages');
var swipes = require('./routes/swipes');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static('./html'));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);
app.use('/matches', matches);
app.use('/messages', messages);
app.use('/swipes', swipes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

