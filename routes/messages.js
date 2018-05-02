var app = require('../app');
var express = require('express');
var mongoose = require('mongoose');
var router = express.Router();
var jwt = require('jsonwebtoken');
var User = require('../models/users');
var Message = require('../models/message');

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

/* Create Message */
router.post('/create', function (req, res) {
    var message = new Message({
        toUserID: req.body.toUserID,
        fromUserID: req.body.fromUserID,
        matchID: req.body.matchID,
        text: req.body.text
    });

    message.save(function (err, message) {
        console.log(err);
        if (err) res.json({success: false, message: err});
        else {
            res.json({
                success: true,
                status: 'created',
                message: message
            });
        }
    });
});

/* Get Messages by Match */
router.post('/findByMatchID', function (req, res) {
    var id = mongoose.Types.ObjectId(req.body.matchID);

    Message.aggregate([
        {
            $match: {
                matchID: id
            }
        },
        { $sort : { createdAt : -1 } },
        {
            $lookup:
                {
                    from: "users",
                    localField: "toUserID",
                    foreignField: "_id",
                    as: "toUser"
                }
        },
        {
            $lookup:
                {
                    from: "users",
                    localField: "fromUserID",
                    foreignField: "_id",
                    as: "fromUser"
                }
        },
        //{$unwind: {path: "$toUser", "preserveNullAndEmptyArrays": true}},
        //{$unwind: {path: "$fromUser", "preserveNullAndEmptyArrays": true}},
        {
            $project: {
                _id: 1,
                matchID: 1,
                text: 1,
                createdAt: 1,
                toUser: {
                    $map: {
                        input: "$toUser",
                        as: "user",
                        in: {
                            _id: "$$user._id",
                            first_name: "$$user.first_name",
                            last_name: "$$user.last_name",
                            identifier: "$$user.identifier",
                            pictures: "$$user.pictures",
                            birthday: "$$user.birthday",
                            bio: "$$user.bio"
                        }
                    }
                },
                fromUser: {
                    $map: {
                        input: "$fromUser",
                        as: "user",
                        in: {
                            _id: "$$user._id",
                            first_name: "$$user.first_name",
                            last_name: "$$user.last_name",
                            identifier: "$$user.identifier",
                            pictures: "$$user.pictures",
                            birthday: "$$user.birthday",
                            bio: "$$user.bio"
                        }
                    }
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
            messages: result
        });
    });
});

module.exports = router;
