//var mysql = require("./connector.js");
var db = require("./postgre.js");
var crypto = require("crypto");

module.exports.checkUserExists = async function (username) {
    var users = await db.query("SELECT * FROM users WHERE username = $1;", [username]);
    return (users.length > 0);
}

module.exports.checkEmailUsed = async function (email) {
    var rows = await db.query("SELECT * FROM users WHERE email = $1;", [email]);    
    return (rows.length > 0);
}

module.exports.createUser = function(username, passwordHash, email) {
    let verificationHash = crypto.randomBytes(20).toString('hex');
    db.execute("INSERT INTO users (username, password, rating, dateJoined, email, verification_hash, verified) values ($1,$2, 1200,  NOW(), $3, $4, false);", [username, passwordHash, email, verificationHash]);
    return verificationHash;
};
    
module.exports.validate = async function (username, passwordHash, callback) {
    var rows = await db.query("SELECT * FROM users WHERE username = $1 and password = $2 and verified=true;", [username, passwordHash]);
    console.log("User validation calling back: " + username + passwordHash);
    callback(rows.length > 0);
};

module.exports.verifyUser = async function (user, id) {
    console.log("Verifying user " + user + " with verification hash " + id);
    db.execute("UPDATE users set verified=true where username=$1 and verification_hash=$2", [user, id]);
    return;
}
