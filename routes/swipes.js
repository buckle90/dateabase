var app = require('../app');
var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/users');
var Message = require('../models/message');
var Match = require('../models/match');
var Swipe = require('../models/swipe');

/* Verify token */
router.use(function (req, res, next) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {
        // verifies secret and checks exp
        jwt.verify(token, app.get('secret'), function (err, decoded) {
            if (err) {
                return res.json({success: false, message: 'Failed to authenticate token.'});
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
});

/* Create Match */
router.post('/create', function (req, res) {
    User.findOne({identifier: req.body.user2ID}, function (err, user) {
        if (err) {
            res.json({success: false, message: err});
            return null;
        }

        var swipe = new Swipe({
            user1ID: req.decoded._id,
            user2ID: user._id,
            liked: req.body.liked
        });

        swipe.save(function (err, swipe) {
            if (err) res.json({success: false, message: err});
            else {
                if (req.body.liked) {
                    Swipe.checkForMatch(swipe.user1ID, swipe.user2ID, function (matched) {
                        if (matched) {
                            let chatID = mongoose.Types.ObjectId();
                            let match1 = new Match({
                                user1ID: swipe.user1ID,
                                user2ID: swipe.user2ID,
                                chatID: chatID
                            });

                            let match2 = new Match({
                                user1ID: swipe.user2ID,
                                user2ID: swipe.user1ID,
                                chatID: chatID
                            });

                            match1.save(function (err, match1) {
                                if (err) {
                                    console.log(err);
                                    res.json({success: false, message: err});
                                }
                                else {
                                    match2.save(function (err, match2) {
                                        if (err) res.json({success: false, message: err});
                                        else {
                                            res.json({
                                                success: true,
                                                status: 'created',
                                                swipe: swipe,
                                                match: match1
                                            });
                                        }
                                    });
                                }
                            });
                        }
                        else {
                            res.json({
                                success: true,
                                status: 'created',
                                swipe: swipe,
                                match: false
                            });
                        }
                    })
                }
                else {
                    res.json({
                        success: true,
                        status: 'created',
                        swipe: swipe,
                        match: false
                    });
                }
            }
        });
    });
});

/* Get Matches by User */
router.post('/findByUserID', function (req, res) {
    var id = req.body.userID;
    Swipe.find({$or: [{user1ID: id}, {user2ID: id}]}, null, {sort: {created: -1}}, function (err, swipes) {
        res.json(swipes);
    });
});

module.exports = router;
