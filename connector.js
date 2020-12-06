var mysql = require("mysql");

var databaseCredentials = 
  {
  host     : "localhost",
  user     : "root",
  password : "str0keseet",
  database : "kriegspiel"
 };
    
module.exports.execute = function (query, args) {
    var con = mysql.createConnection(databaseCredentials);
    con.connect(function (err) {
        if (err) {
            console.log("Error connecting to database");
            return;
        } 
    });
    con.query(query, args, function(err) {
        if (err) {throw err;}
        return true;
    });
    con.end();
};

module.exports.query = function (query, args, callback) {
    var con = mysql.createConnection(databaseCredentials);
    con.connect(function (err) {
        if (err) {
            console.log("Error connecting to database");
            return false;
        } 
    });   
    con.query(query, args, function(err, rows) {
        if (err) {throw err};
        callback(rows);
    });
    con.end();
};