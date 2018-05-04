var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MessageSchema = new Schema({
    toUserID: Schema.Types.ObjectId,
    fromUserID: Schema.Types.ObjectId,
    matchID: Schema.Types.ObjectId,
    chatID: Schema.Types.ObjectId,
    text: String,
    createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model('Message', MessageSchema );