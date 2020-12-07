//var mysql = require("./connector.js");
var db = require("./postgre.js");

module.exports.createUser = function(username, passwordHash, email) {
    db.execute("INSERT INTO users (username, password, rating, dateJoined, email) values ($1,$2, 1200,  NOW(), $3);", [username, passwordHash, email]);
};
    
module.exports.validate = function (username, passwordHash, callback) {
    db.query("SELECT * FROM users WHERE username = $1 and password = $2;", [username, passwordHash], function(rows) {
        console.log("User validation calling back: " + username + passwordHash);
        callback(rows.length > 0);
    });
};

