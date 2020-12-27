var login = require("./accounts.js");
var db = require("./postgre.js")
var sha1 = require("sha1");

var User = function (username, rating, email) {
    this.username = username;
    this.rating = rating;
    this.email = email;
}

module.exports.createUser = function (username, password, email) {
    return login.createUser(username, password, email);
}

module.exports.getUser = async function (username, callback) {
    var rows = await db.query("SELECT * FROM users WHERE username = $1", [username]);
    var user = new User(rows[0].username, rows[0].rating, rows[0].email);
    callback(user);
}