var app = require('../app');
var express = require('express');
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
var config = require('../config');
var router = express.Router();
var multiparty = require('multiparty');
var aws = require('aws-sdk');
var fs = require('fs');
var path = require('path');
var jwt = require('jsonwebtoken');
var User = require('../models/users');

const S3_BUCKET = process.env.S3_BUCKET;
aws.config.region = 'us-west-1';

/* Create User */
router.post('/create', function (req, res) {
    var user = new User({
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        password: req.body.password,
        identifier: req.body.identifier,
        admin: req.body.admin
    });

    user.save(function (err, user) {
        console.log(err);
        if (err) res.json({success: false, message: err});
        else {
            user.password = null;
            res.json({
                success: true,
                message: 'created',
                user: user
            });
        }
    });
});

/* Authenticate user */
router.post('/authenticate', function (req, res) {
    let identifier = req.body.identifier;
    let password = req.body.password;
    let FCMToken = req.body.FCMToken;

    // find the user
    User.findOne({identifier: identifier}, function (err, user) {
        if (err) throw err;

        if (!user) {
            res.json({success: false, message: 'Authentication failed. User not found.'});
        } else if (user) {
            // check if password matches
            if (user.password !== password) {
                res.json({success: false, message: 'Authentication failed. Wrong password.'});
            } else {
                // if user is found and password is right
                // create a token with only our given payload
                // we don't want to pass in the entire user since that has the password
                User.findOne({identifier: identifier}, {password: 0}, function (err, user) {
                    const token = jwt.sign(JSON.stringify(user), app.get('secret'), {
                        //expiresInMinutes: 1440 // expires in 24 hours
                    });

                    user.FCMToken = FCMToken;
                    user.save(function (err, updatedUser) {
                        if (err) {
                            res.json({success: false, message: err});
                            return null;
                        }
                        else {
                            updatedUser.password = null;
                            // return the information including token as JSON
                            res.json({
                                success: true,
                                message: 'Authenticated',
                                user: user,
                                token: token
                            });
                        }
                    });
                });
            }

        }

    });
});

/* Verify token with POST request */
router.post('/verify', function (req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    if (token) {
        jwt.verify(token, app.get('secret'), function (err, decoded) {
            if (err) {
                return res.json({success: false, message: 'Failed to verify token.'});
            } else {
                User.findOne({identifier: decoded.identifier}, {password: 0}, function (err, user) {
                    const token = jwt.sign(JSON.stringify(user), app.get('secret'), {
                        //expiresInMinutes: 1440 // expires in 24 hours
                    });

                    // return the information including token as JSON
                    res.json({
                        success: true,
                        message: 'Verified',
                        user: user,
                        token: token
                    });
                });
            }
        });
    } else {
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
});

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
        // if there is no token, return an error
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
});

/* Update User */
router.post('/update', function (req, res) {
    User.findById(req.decoded._id, function (err, user) {
        if (err) {
            res.json({success: false, message: err});
            return null;
        }

        if (req.body.first_name) user.set({first_name: req.body.first_name});
        if (req.body.last_name) user.set({last_name: req.body.last_name});
        if (req.body.email) user.set({email: req.body.email});
        if (req.body.birthday) user.set({birthday: req.body.birthday});
        if (req.body.gender) user.set({gender: req.body.gender});
        if (req.body.preference) user.set({preference: req.body.preference});
        if (req.body.age_min) user.set({age_min: req.body.age_min});
        if (req.body.age_max) user.set({age_max: req.body.age_max});
        if (req.body.distance_max) user.set({distance_max: req.body.distance_max});
        if (req.body.bio) user.set({bio: req.body.bio});
        if (req.body.FCMToken) user.set({FCMToken: req.body.FCMToken});
        if (req.body.picture && req.body.picture_ref) {
            user.pictures.push({url: req.body.picture, reference: req.body.picture_ref});
            user.set({pictures: user.pictures});
        }

        user.save(function (err, updatedUser) {
            if (err) {
                res.json({success: false, message: err});
                return null;
            }
            else {
                updatedUser.password = null;
                res.json({
                    success: true,
                    message: 'updated',
                    user: updatedUser
                });
            }
        });
    });
});

/*/!* Upload pic *!/
router.post('/upload', function (req, res) {
    var form = new multiparty.Form();

    User.findById(req.decoded._id, function (err, user) {
        if (err) {
            res.json({success: false, message: err});
            return;
        }

        form.parse(req, function (err, fields, files) {
            var pic = files.photo[0];
            pic.name = user._id + '_' + Date.now();

            const s3 = new aws.S3();
            const s3Params = {
                Bucket: S3_BUCKET,
                Key: pic.name,
                Expires: 60,
                ContentType: pic.type,
                ACL: 'public-read'
            };

            s3.getSignedUrl('putObject', s3Params, (err, data) => {
                if(err){
                    console.log(err);
                    return null;
                }
                const returnData = {
                    signedRequest: data,
                    url: `https://${S3_BUCKET}.s3.amazonaws.com/${pic.name}`
                };
                console.log(1);
                console.log(returnData);

                const xhr = new XMLHttpRequest();
                xhr.open('PUT', returnData.signedRequest);
                xhr.onreadystatechange = () => {
                    if(xhr.readyState === 4){
                        if(xhr.status === 200){
                            console.log(2);
                            const response = JSON.parse(xhr.responseText);
                            console.log(response);
                            //uploadFile(file, response.signedRequest, response.url);
                            user.pictures.push(returnData.url);

                            user.save(function (err, updatedUser) {
                                if (err) {
                                    console.log(err);
                                    res.json({success: false, message: err});
                                    return null;
                                }
                                else {
                                    updatedUser.password = null;
                                    res.json({
                                        success: true,
                                        message: 'updated',
                                        user: updatedUser
                                    });
                                }
                            });
                        }
                        else{
                            alert('Could not upload file.');
                        }
                    }
                };
                xhr.send(fs.readFileSync(pic));
            });

            // var returnData = signS3(pic);
            // signS3(pic).then((returnData) => {
            //     console.log(returnData);
            //     // uploadFile(pic, returnData.signedRequest, returnData.url);
            //
            //     user.pictures.push(returnData.url);
            //
            //     user.save(function (err, updatedUser) {
            //         if (err) {
            //             console.log(err);
            //             res.json({success: false, message: err});
            //             return null;
            //         }
            //         else {
            //             updatedUser.password = null;
            //             res.json({
            //                 success: true,
            //                 message: 'updated',
            //                 user: updatedUser
            //             });
            //         }
            //     });
            // });

            // var oldPath = pic.path;
            // var newPath = 'uploads/' + name;
            // fs.rename(oldPath, newPath, function (err) {
            //     if (err) {
            //         console.log(err);
            //         res.json({success: false, message: err});
            //         return;
            //     }
            //
            //     user.pictures.push(name);
            //
            //     user.save(function (err, updatedUser) {
            //         if (err) {
            //             console.log(err);
            //             res.json({success: false, message: err});
            //             return null;
            //         }
            //         else {
            //             updatedUser.password = null;
            //             res.json({
            //                 success: true,
            //                 message: 'updated',
            //                 user: updatedUser
            //             });
            //         }
            //     });
            // });
        });
    });
});

router.get('/signS3', (req, res) => {
    const s3 = new aws.S3();
    const fileName = req.query['file-name'];
    const fileType = req.query['file-type'];
    const s3Params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Expires: 60,
        ContentType: fileType,
        ACL: 'public-read'
    };

    s3.getSignedUrl('putObject', s3Params, (err, data) => {
        if(err){
            console.log(err);
            return res.end();
        }
        const returnData = {
            signedRequest: data,
            url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
        };
        res.write(JSON.stringify(returnData));
        res.end();
    });
});*/

/* Delete pic */
router.post('/deleteImage', function (req, res) {
    User.findById(req.decoded._id, function (err, user) {
        if (err) {
            res.json({success: false, message: err});
            return;
        }

        let url = req.body.url;
        let pos = user.pictures.map(function(e) { return e.url; }).indexOf(url);
        user.pictures.splice(pos, 1);

        user.save(function (err, updatedUser) {
            if (err) {
                console.log(err);
                res.json({success: false, message: err});
                return null;
            }
            else {
                updatedUser.password = null;
                res.json({
                    success: true,
                    message: 'updated',
                    user: updatedUser
                });
            }
        });
    });
});

/* Get photo */
router.get('/image/:id', function (req, res) {
    console.log(req.params.id);
    res.sendFile(req.params.id, {root: path.join(__dirname, config.uploads)});
});

/* Get profile to display for user */
router.post('/profilesForUser', function (req, res) {
    User.findById(req.decoded._id, function (err, user) {
        if (err) {
            res.json({success: false, message: err});
            return null;
        }

        User.aggregate([
            {
                $match: {
                    gender: user.preference,
                    preference: user.gender,
                    _id: {$ne: user._id}
                }
            },
            {
                $lookup:
                    {
                        from: "swipes",
                        localField: "_id",
                        foreignField: "user2ID",
                        as: "swipes"
                    }
            },
            {
                $lookup:
                    {
                        from: "swipes",
                        localField: "_id",
                        foreignField: "user1ID",
                        as: "profileSwipes"
                    }
            },
            {$unwind: {path: "$swipes", "preserveNullAndEmptyArrays": true}},
            {$unwind: {path: "$profileSwipes", "preserveNullAndEmptyArrays": true}},
            {
                $project: {
                    _id: 1,
                    identifier: 1,
                    first_name: 1,
                    last_name: 1,
                    birthday: 1,
                    bio: 1,
                    pictures: 1,
                    userSwiped: {$max: {$eq: ["$swipes.user1ID", user._id]}},
                    profileSwipedFalse: {$max: {$and: [{$eq: ["$profileSwipes.user2ID", user._id]}, {$eq:["$profileSwipes.liked", false]}]}}
                }
            },
            {
                $match: {
                    userSwiped: false,
                    profileSwipedFalse: false
                }
            },
            {
                $limit: 10
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
                profiles: result
            });
        });
    });
});

/* Get all users */
router.post('/', function (req, res) {
    User.find({}, {password: 0}, function (err, user) {
        res.json(user);
    });
});

module.exports = router;
