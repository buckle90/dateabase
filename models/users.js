var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    first_name: String,
    last_name: String,
    email: { type: String, unique: true },
    identifier: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    admin: { type: Boolean, default: false },
    birthday: { type: Date },
    gender: { type: String, default: "female" },
    preference: { type: String, default: "female" },
    created: { type: Date, default: Date.now },
    age_min: { type: Number, default: 18 },
    age_max: { type: Number, default: 99 },
    distance_max: { type: Number, default: 10 },
    bio: { type: String, default: "" },
    pictures: [{
        url: String,
        reference: String
    }],
    FCMToken: String
});

module.exports = mongoose.model('User', UserSchema );