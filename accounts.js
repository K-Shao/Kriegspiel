

(function() {
    var mysql = require("mysql");
    
    
    var databaseCredentials = 
            {host: "localhost",
             user: "root", 
             password: "str0keseet", 
            database: "kriegspiel"};
    
    module.exports.createUser = function(username, passwordHash, email) {
        var con = mysql.createConnection(databaseCredentials);
        con.connect(function (err) {
            if (err) {
                console.log("Error connecting to database");
                return;
            } 
        });
        con.query("INSERT INTO users (username, password, rating, dateJoined, email) values (?,?, 1200,  NOW(), ?);", [username, passwordHash, email], function(err) {
            if (err) {
                throw err;
            }
            return true;
        }); 

        
        con.end();
    };
    
    module.exports.validate = function (username, passwordHash, callback) {
        var con = mysql.createConnection(databaseCredentials);
        con.connect(function (err) {
            if (err) {
                console.log("Error connecting to database");
                return false;
            } 
        });
        var queryStr = "SELECT * FROM users WHERE username = '" + username + "' and password = '" + passwordHash + "';";
        var result = con.query(queryStr, function(err, rows) {
            if (err) {
                throw err;
            
            }
            callback(rows.length > 0)
        });
    } 
}
());