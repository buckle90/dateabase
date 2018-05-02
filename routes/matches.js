var app = require('../app');
var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/users');
var Message = require('../models/message');
var Match = require('../models/match');

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
    var chatID = mongoose.Types.ObjectId;
    var match = new Match({
        user1ID: req.body.user1ID,
        user2ID: req.body.user2ID,
        chatID: chatID
    });

    match.save(function (err, match) {
        console.log(err);
        if (err) res.json({success: false, message: err});
        else {
            res.json({
                success: true,
                status: 'created',
                match: match
            });
        }
    });
});

/* Get Matches by User */
router.post('/findByUserID', function (req, res) {
    var id = mongoose.Types.ObjectId(req.decoded._id);

    Match.aggregate([
        {
            $match: {
                user1ID: id
            }
        },
        {
            $lookup:
                {
                    from: "users",
                    localField: "user2ID",
                    foreignField: "_id",
                    as: "profile"
                }
        },
        {$unwind: {path: "$profile", "preserveNullAndEmptyArrays": true}},
        {
            $project: {
                chatID: 1,
                profile: {
                    _id: 1,
                    identifier: 1,
                    first_name: 1,
                    last_name: 1,
                    birthday: 1,
                    bio: 1,
                    pictures: 1
                }
            }
        }
    ], function (err, result) {
        if (err) {
            console.log(err);
            res.json({success: false, message: err});
            return;
        }
        console.log(result);
        res.json({
            success: true,
            message: 'success',
            matches: result
        });
    });
});

module.exports = router;
