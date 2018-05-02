var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SwipeSchema = new Schema({
    user1ID: {type: Schema.Types.ObjectId, required: true},
    user2ID: {type: Schema.Types.ObjectId, required: true},
    liked: {type: Boolean, required: true},
    createdAt: {type: Date, default: Date.now}
});

SwipeSchema.statics.checkForMatch = function (user1, user2, callback) {
    var that = this;
    this.find({user1ID: user1, user2ID: user2, liked: true}, function (err, s1) {
        if (err) return callback(false);
        that.find({user1ID: user2, user2ID: user1, liked: true}, function (err, s2) {
            if (err) return callback(false);
            if (s1[0] && s2[0]) {
                return callback(true);
            }
            else {
                return callback(false);
            }
        });
    });
};

module.exports = mongoose.model('Swipe', SwipeSchema);