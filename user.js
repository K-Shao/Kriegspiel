var login = require("./accounts.js");
var mysql = require("./connector.js")
var sha1 = require("sha1");

var User = function (username, rating, email) {
    this.username = username;
    this.rating = rating;
    this.email = email;
}

module.exports.createUser = function (username, password, email) {
    login.createUser(username, password, email);
}

module.exports.getUser = function (username, callback) {
    mysql.query("SELECT * FROM users WHERE username = ?", username, function(rows) {
        var user = new User(rows[0].username, rows[0].rating)
        callback(user);
    });

}