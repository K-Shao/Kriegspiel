const { Client } = require('pg');

credentials = (process.env.DATABASE_URL)?
    {
      connectionString: process.env.DATABASE_URL,
    }
    :
    {
      username: 'kevinshao',
      database: 'kriegspiel',
      password: 'str0keseet'
    };

module.exports.execute = function (query, args) {
    const client = new Client(credentials)
    client.connect(function (err) {
        if (err) {
            console.log("Error connecting to database");
            return;
        } 
    });
    client.query(query, args, function(err) {
        if (err) {throw err;}
        client.end();
        return true;
    });
};

module.exports.query = async function (query, args) {
    const client = new Client(credentials)
    client.connect(function (err) {
        if (err) {
            console.log("Error connecting to database");
            return false;
        } 
    });   
    var result;
    
    const res = await client.query(query, args);
    client.end()
    return res.rows;
};