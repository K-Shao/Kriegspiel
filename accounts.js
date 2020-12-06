var mysql = require("./connector.js");

module.exports.createUser = function(username, passwordHash, email) {
    mysql.execute("INSERT INTO users (username, password, rating, dateJoined, email) values (?,?, 1200,  NOW(), ?);", [username, passwordHash, email]);
};
    
module.exports.validate = function (username, passwordHash, callback) {
    mysql.query("SELECT * FROM users WHERE username = ? and password = ?;", [username, passwordHash], function(rows) {
        console.log("User validation calling back: " + username + passwordHash)
        callback(rows.length > 0);
    });
};

