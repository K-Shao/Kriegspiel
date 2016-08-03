var login = require("./accounts.js");
var mysql = require("./connector.js")

var User = function (username, rating) {
    this.username = username;
    this.rating = rating;
}

module.exports.createUser = function (username, password) {
    login.createUser(username, sha1(username+password));
}

module.exports.getUser = function (username, callback) {
    mysql.query("SELECT * FROM users WHERE username = ?", username, function(rows) {
        var user = new User(rows[0].username, rows[0].rating)
        callback(user);
    });

}