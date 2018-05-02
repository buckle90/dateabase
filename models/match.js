var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MatchSchema = new Schema({
    user1ID: Schema.Types.ObjectId,
    user2ID: Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
    chatID: Schema.Types.ObjectId
});

module.exports = mongoose.model('Match', MatchSchema );