var os = require("os");
var hostname = os.hostname();

module.exports = {
    'secret': 'FlippinDopeAssSecret',
    'database': hostname === "FineAssComputer" ? 'mongodb://127.0.0.1/dates' : 'mongodb://dateabase:Westshaw1@ds111050.mlab.com:11050/heroku_fj618667',
    'uploads': '../uploads'
};
