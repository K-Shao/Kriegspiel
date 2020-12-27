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
var db = require("./postgre.js");
var mailer = require("./mailer.js");
var accounts = require("./accounts.js");
var crypto = require("crypto");

app.use(favicon(__dirname + "/public/img/favicon.ico"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

var server_port = process.env.PORT || 3000;
var server_ip_address = process.env.IP || '127.0.0.1';

//http.listen(server_port, server_ip_address, function () {
http.listen(server_port, function () {
    console.log("listening on port " + server_port);
});

app.post("/register", async function(req, res) {

    if ((!req.body.username)||(!req.body.password)||(!req.body.email)) {
        res.redirect("/login.html");
        console.log("Registration failed: one of username, password, or email missing.")
        return;
    }
    console.log("Registering new user: " + req.body.username + ". Email: " + req.body.email + ". Password: you wish.")
    var username = req.body.username;
    var password = sha1(username + req.body.password);
    var email = req.body.email;
    
    let userExists = await accounts.checkUserExists(username);
    if (userExists) {
        console.log("Username already in use!");
        res.redirect("/home.html");
        return;
    }
    
    let emailUsed = await accounts.checkEmailUsed(email);
    if (emailUsed) {
        console.log("Email already in use!");
        res.redirect("/home.html");
        return;
    }
    
    var verificationHash = User.createUser(username, password, email);
    var cookies = new Cookies(req, res);
    cookies.set("user", username, {httpOnly: false})
           .set("pass", password, {httpOnly: false});
    
    let link ="http://"+req.get('host')+"/verify?user=" + username + "&id=" + verificationHash;
    mailer.sendVerification(link, email);
    res.redirect("/home.html");
});

app.get("/verify", async function(req, res) {
    console.log(req);
    await login.verifyUser(req.query.user, req.query.id);
    res.redirect("/index.html");
});

app.get("/home.html", function(req, res) {
    checkLogin(req, res, function(result) {
        if (result) {
            res.sendFile(__dirname + "/public/home.html");
        } else {
            res.redirect("/index.html");
        } 
    });
})

app.post("/home.html", function(req, res) {
    var loggedIn;
    if (!req.body.user || !req.body.pass) {
        res.redirect("/index.html");
        console.log("Request to log in is missing either username or password. ")
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
            res.sendFile(__dirname + "/public/home.html");

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
            res.sendFile(__dirname + "/public/index.html");
        }
    });
});

app.get("/play.html", function(req, res) {
    checkLogin(req, res, function(result) {
        if (result) {
            res.sendFile(__dirname + "/public/play.html");
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

function handleGameOver (game, result) {
    console.log("Game over: " + game.player1.username + " vs. " + game.player2.username + " with result " + result + ".");

    db.execute("INSERT INTO games (white, black, fen, pgn, result, datePlayed) values ($1,$2,$3,$4,$5,NOW());", [game.player1.username, game.player2.username, game.chess.fen(), game.chess.pgn(), result]);
    var p1newrating, p2newrating;
    var p1oldrating = game.player1.rating;
    var p2oldrating = game.player2.rating;
    var R1 = Math.pow(10,(p1oldrating/400));
    var R2 = Math.pow(10,(p2oldrating/400));
    var E1 = R1/(R1+R2);
    var E2 = R2/(R1+R2);
    var S1 = (result + 1)/2;
    var S2 = ((result * -1) + 1)/2
    var K = 80;
    p1newrating = Math.round(p1oldrating + (K * (S1-E1)));
    p2newrating = Math.round(p2oldrating + (K * (S2-E2)));
            
    db.execute("UPDATE users SET rating = $1 WHERE username = $2;", [p1newrating, game.player1.username]);
    db.execute("UPDATE users SET rating = $1 WHERE username = $2;", [p2newrating, game.player2.username]);
            
    delete games[game.id];
}


function buildHiddenMoveCode (capture, to, check, checkmate) {
    var code = "";
    if (capture) {
        code += "???x" + to;
    } else {
        code += "???";
    }
    if (check) {
        code += "+";
    }
    if (checkmate) {
        code += "#";
    }
    return code;
}

var Game = function (player1, player2) {
    this.player1 = player1;
    this.player2 = player2;
    this.chess = new Chess();
    this.board1 = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    this.board2 = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    this.whiteMove = true;
    this.id = crypto.randomBytes(20).toString('hex');
}


var clients = [];
var openChallenges = [];
var games = {};
var numOnline = 0;


var io = require("socket.io")(http);
io.on("connection", function(socket) {
    var username;
    console.log("New connection!");
    
    socket.on("disconnect", function() {
        if (!username) return;
        
        clients[username] = false;
        numOnline--;
        io.to("lobby").emit("updateNumOnline", numOnline);
        
        for (var index in openChallenges) {
            if (openChallenges[index].username == username) {
                openChallenges.splice(index, 1);
                break;
            }
        }
        
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
                        handleGameOver(game, -1); 
                        socket.broadcast.emit("gameover", game.chess.pgn());
                    } 
                    if (username == games[index].player2.username) {
                        handleGameOver(game, 1);
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
        numOnline++;
        socket.join("lobby");
        io.to("lobby").emit("updateNumOnline", numOnline);
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
        console.log("Open challenge from " + username);
        console.log(openChallenges);
        for (var challenge of openChallenges) {
            if (challenge.username == username) {
                return;
            }
        }
        if (openChallenges.length > 0) {
            User.getUser(username, function(player2) {
                var player1 = openChallenges.shift();
                var game = new Game(player1, player2);
                games[game.id] = game;
                io.to("lobby").emit("newgame", game);
                console.log("New game with " + player1.username + " and " + player2.username);
            });
        } else {
            User.getUser(username, function(user) {
                openChallenges.push(user);
            });
        }
    });
    
    socket.on("joinGame", function (id) {
        console.log(username + " joining game " + id);
        socket.join("room" + id);
    });
    
    socket.on("leaveGame", function (id) {
        console.log(username + " leaving game " + id);
        socket.leave("room" + id);
    })
    
    
    socket.on("moveAttempt", function(moveData, fen) {
        var game;
        var color;
        var gameOver = false;
        
        var roomId = moveData.id;
        
        if (!(roomId in games)) {
            return;
        }
        
        var current = games[roomId];
        
        if (current.player1.username === moveData.username) {
            game = current;
            color = true;
        } else
        if (current.player2.username === moveData.username) {
            game = current;
            color = false;
        } else {
            console.log("Attempting a move in a game you're not in!");
        }
        
        var move = game.chess.move({"from": moveData.from, 
                                   "to" : moveData.to, 
                                   "promotion": "q", 
                                   "piece": moveData.piece});        
        if (move===null) {
            //Illegal move, inform as such
            io.to("room" + roomId).emit("illegal", moveData.username)
        } else {
            if (color) {
                games[roomId].board1 = fen;
            } else {
                games[roomId].board2 = fen;
            }

            //Legal move, inform mover that move was legal, inform everyone move was made
            var result; //Only used for game over situations
            var msg = moveData.username + " has moved";
            var check = false, checkmate = false, capture = false;
            if (move.flags.search(/e|c/)!==-1) {
                //Capture was made
                msg += " and captured on the square " + move.to;
                io.to("room" + roomId).emit("capture", move.to);
                capture = true;
            }
            if (game.chess.in_draw()) {
                msg += ", drawing the game";
                gameOver = true;
                result = 0
            }
            if (game.chess.in_stalemate()) {
                msg += ", delivering stalemate";
                gameOver = true;
                result = 0
            }
            if (game.chess.in_threefold_repetition()) {
                msg += ", completing threefold repetition";
                gameOver = true;
                result = 0
            }
            if (game.chess.in_checkmate()) {
                msg += ", delivering checkmate"
                gameOver = true;
                result = game.whiteMove? 1: -1;
                checkmate = true;
            }
            if (game.chess.in_check() && !game.chess.in_checkmate()) {
                msg += ", delivering check from ";
                msg += logic.findCheckSource(game.chess);
                check = true;
            }
            msg += ".";
            
            var moveCodeHidden = buildHiddenMoveCode(capture, moveData.to, check, checkmate);
            socket.to("room" + roomId).emit("moveMade", msg, moveCodeHidden);
            
            socket.emit("moveMade", msg, move.san) // For the person who made the move, just use SAN (Standard Algebraic Notation)
            socket.emit("makeMove", moveData); // Only make the move on the socket that the move came on. 
            game.whiteMove = !game.whiteMove;
            
            if (gameOver) {
                //Game over code here
                io.to("room" + roomId).emit("gameover", game.chess.pgn());
                handleGameOver(game, result);
            }

        } 
    });
    
    socket.on("resign", function(roomId) {
        for (var index in games) {
            var game = games[index];
            if (game.player1.username == username || game.player2.username == username) {
                var result = (game.player1.username == username)?-1:1;
                handleGameOver(game, result);
                io.to("room" + game.id).emit("gameover", game.chess.pgn());
            }
        }
        io.to("room" + roomId).emit("resignation", username);
    });
    
    socket.on("pawnCapturesQuery", function(roomId) {
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
        io.to("room" + roomId).emit("pawnCapturesResult", pawnCaptures);
    });
    
    
    socket.on("messageSend", function(msg, roomId) {
        io.to("room" + roomId).emit("messageRecieve", username, msg);
    });
    
    socket.on("cancelChallenge", function () {
        for (var index in openChallenges) {
            if (openChallenges[index].username == username) {
                openChallenges.splice(index, 1);
            }
        }
    });
});



