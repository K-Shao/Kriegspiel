var express = require("express");
var app = express();
var path = require("path");
var http = require("http").Server(app);
var logic = require("./chesslogic");
var sha1 = require("sha1");
var login = require("./accounts");
var Chess = require("chess.js").Chess;
var Cookies = require("cookies");
var bodyParser = require("body-parser");
var favicon = require("serve-favicon");
var User = require("./user.js");
var mysql = require("./connector.js");

app.use(favicon(__dirname + "/public/img/favicon.ico"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

http.listen(server_port, server_ip_address, function () {
    console.log("listening on port " + server_port);
});

app.post("/register", function(req, res) {

    if ((!req.body.username)||(!req.body.password)||(!req.body.email)) {
        res.redirect("/login.html");
        return;
    }
    var username = req.body.username;
    var password = sha1(username + req.body.password);
    User.createUser(username, password, req.body.email);
    var cookies = new Cookies(req, res);
    cookies.set("user", username, {httpOnly: false})
            .set("pass", password, {httpOnly: false});
    res.redirect("/home.html");
});

app.get("/home.html", function(req, res) {
    checkLogin(req, res, function(result) {
        if (result) {
            res.sendfile(__dirname + "/public/home.html");
        } else {
            res.redirect("/index.html");
        } 
    });
})

app.post("/home.html", function(req, res) {
    var loggedIn;
    if (!req.body.user || !req.body.pass) {
        res.redirect("/index.html");
        return;
    }
    var username = req.body.user;
    var password = sha1(username + req.body.pass);
    login.validate(username, password, function (result) {
        loggedIn = result;

        if (loggedIn) {
            var cookies = new Cookies (req, res);
            cookies
                .set("user", username, {httpOnly: false})
                .set("pass", password, {httpOnly: false});
            res.sendfile(__dirname + "/public/home.html");

        } else {
            res.redirect("/index.html");
        }
    });
})

app.get("/", function(req, res) {
    res.redirect("/index.html");
});

app.get("/index.html", function(req, res) {
    checkLogin(req, res, function(result) {
        if (result) {
            res.redirect("/home.html");
        } else {
            res.sendfile(__dirname + "/public/index.html");
        }
    });
});

app.get("/play.html", function(req, res) {
    checkLogin(req, res, function(result) {
        if (result) {
            res.sendfile(__dirname + "/public/play.html");
        } else {
            res.redirect("/login.html");
        }
    });
});

app.use(express.static("public"));




function checkLogin (req, res, callback) {
    var cookies = new Cookies (req, res);
    var username = cookies.get("user");
    var password = cookies.get("pass");
    
    if (username == undefined || password == undefined) {
        callback(false);
    } else {
        var validated;
        login.validate(username, password, function(result) {
            validated = result;
            callback(validated);
        });
    }
}

function handleGameOver (player1, player2, result) {
    for (var index in games) {
        var game = games[index];
        if (game.player1.username==player1.username && game.player2.username == player2.username ) {
            mysql.execute("INSERT INTO games (white, black, fen, pgn, result, datePlayed) values (?,?,?,?,?,NOW());", [game.player1.username, game.player2.username, game.chess.fen(), game.chess.pgn(), result]);
            var p1newrating, p2newrating;
            var p1oldrating = games[index].player1.rating;
            var p2oldrating = games[index].player2.rating;
            var R1 = Math.pow(10,(p1oldrating/400));
            var R2 = Math.pow(10,(p2oldrating/400));
            var E1 = R1/(R1+R2);
            var E2 = R2/(R1+R2);
            var S1 = (result + 1)/2;
            var S2 = ((result * -1) + 1)/2
            var K = 80;
            p1newrating = p1oldrating + (K * (S1-E1))
            p2newrating = p2oldrating + (K * (S2-E2));
            console.log(p1newrating);
            con.execute("UPDATE users SET rating = ? WHERE username = ?;", [p1newrating, game.player1.username]);
            con.execute("UPDATE users SET rating = ? WHERE username = ?;", [p2newrating, game.player2.username]);
            
            
            games.splice(index,1);
        }

    }
    con.end();
}


var Game = function (player1, player2) {
    this.player1 = player1;
    this.player2 = player2;
    this.chess = new Chess();
    this.board1 = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    this.board2 = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
}




var clients = [];
var openChallenges = [];
var games = [];


var io = require("socket.io")(http);
io.on("connection", function(socket) {
    
    var username;
    
    socket.on("disconnect", function() {
        if (!username) return;
        
        clients[username] = false;

        setTimeout(function() {

            if (!clients[username]) {
                console.log("User disconnect: " + username);
                clients.splice(clients.indexOf(username),1);
                if (username in openChallenges) {
                    openChallenges.splice(openChallenges.indexOf(username), 1);
                }
                for (var index in games) {
                    var game = games[index];
                    if (!game) {
                        continue;
                    }
                    if (username == games[index].player1.username) {
                        handleGameOver(game.player1, game.player2, -1); 
                        socket.broadcast.emit("gameover", game.chess.pgn());
                    } 
                    if (username == games[index].player2.username) {
                        handleGameOver(game.player1, game.player2, 1);
                        socket.broadcast.emit("gameover", game.chess.pgn());
                    }
                }
                socket.broadcast.emit("userDisconnect", username);
            }
        }, 5000);
        
    })
    
    
    socket.on("username", function(user) {
        if (!user) return;

        username = user;
        clients[username] = true;
        if (user in clients) {
            for (var index in games) {
                if (games[index].player1.username==user) {
                    socket.emit("resumeGame", games[index], games[index].board1, games[index].chess.turn());
                    return;
                } 
                if (games[index].player2.username==user) {
                    socket.emit("resumeGame", games[index], games[index].board2, games[index].chess.turn());
                    return;
                }
            }
            User.getUser(username, function(data) {
                socket.emit("home", data);
            });
            return;
        } 
        console.log("Adding user " + username);
        User.getUser(username, function(data) {
            socket.emit("home", data);

        })


    });
    
    socket.on("openChallenge", function() {
        if (openChallenges.length > 0) {
            User.getUser(username, function(player2) {
                var player1 = openChallenges.shift();
                games.push(new Game(player1, player2));
                console.log("New game with " + player1.username + " and " + player2.username);
                socket.emit("newgame", {"player1": player1, "player2": player2});
                socket.broadcast.emit("newgame", {"player1": player1, "player2": player2});
            });
        } else {
            User.getUser(username, function(user) {
                openChallenges.push(user);
            });
        }
    });
    
    
    socket.on("moveAttempt", function(moveData, fen) {
        var game;
        var gameIndex, color;
        var gameOver = false;
        for (var index in games) {
            var current = games[index];
            if (current.player1.username === moveData.username) {
                game = current;
                gameIndex = index;
                color = true;
                break;
            } 
            if (current.player2.username === moveData.username) {
                game = current;
                gameIndex = index;
                color = false;
                break;
            }
        }
        
        var move = game.chess.move({"from": moveData.from, 
                                   "to" : moveData.to, 
                                   "promotion": "q"});
        
        if (move===null) {
            //Illegal move, inform as such
            socket.emit("illegal", moveData.username);
            socket.broadcast.emit("illegal", moveData.username);
        } else {
            if (color) {
                games[gameIndex].board1 = fen;
            } else {
                games[gameIndex].board2 = fen;
            }
            
            
            
            //Legal move, inform mover that move was legal, inform everyone move was made
            var msg = moveData.username + " has moved";
            if (move.flags.search(/e|c/)!==-1) {
                //Capture was made
                msg += " and captured on the square " + move.to;
                socket.broadcast.emit("capture", move.to);
            }
            if (game.chess.in_draw()) {
                msg += ", drawing the game";
                gameOver = true;
            }
            if (game.chess.in_stalemate()) {
                msg += ", delivering stalemate";
                gameOver = true;
            }
            if (game.chess.in_threefold_repetition()) {
                msg += ", completing threefold repetition";
                gameOver = true;
            }
            if (game.chess.in_checkmate()) {
                msg += ", delivering checkmate"
                gameOver = true;
            }
            if (game.chess.in_check() && !game.chess.in_checkmate()) {
                msg += ", delivering check from ";
                msg += logic.findCheckSource(game.chess);
                
            }
            msg += ".";
            
            socket.broadcast.emit("moveMade", msg);
            socket.emit("moveMade", msg)
            socket.emit("makeMove", moveData);
            
            if (gameOver) {
                //Game over code here
                handleGameOver(moveData.username);
                socket.emit("gameover", game.chess.pgn());
                socket.broadcast.emit("gameover", game.chess.pgn());
            }

        } 
    });
    
    socket.on("resign", function() {
        for (var index in games) {
            var game = games[index];
            if (game.player1.username == username || game.player2.username == username) {
                var result = (game.player1.username == username)?-1:1;
                handleGameOver(game.player1, game.player2, result);
                socket.emit("gameover", game.chess.pgn());
                socket.broadcast.emit("gameover", game.chess.pgn());
            }
        }
        socket.emit("resignation", username);
        socket.broadcast.emit("resignation", username);
    });
    
    socket.on("pawnCapturesQuery", function() {
        var pawnCaptures = false;
        var game;
        for (var index in games) {
            var current = games[index];
            if (current.player1.username === username || current.player2.username === username) {
                game = current;
                break;
            }
        }
        var moves = game.chess.moves({verbose: true});
        for (var index in moves) {
            var move = moves[index];
            if (move.flags.search(/e|c/)!==-1 && move.piece === 'p') {
                pawnCaptures = true;
                break;
            }
        }
        socket.emit("pawnCapturesResult", pawnCaptures);
        socket.broadcast.emit("pawnCapturesResult", pawnCaptures);
    });
    
    
    socket.on("messageSend", function(msg) {
        socket.emit("messageRecieve", username, msg);
        socket.broadcast.emit("messageRecieve", username, msg);
    });
    
    socket.on("cancelChallenge", function () {
        for (var index in openChallenges) {
            if (openChallenges[index].username == username) {
                openChallenges.splice(index, 1);
            }
        }
    });
});



