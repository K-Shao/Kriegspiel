var socket;

var myColor = "white";
var turn = false;
var inGame = false;
var challengeExtended = false;

var board;

var username;
var opponent;

var q = false, r = false, b = false, n = false, p = false;

var getCookie = function(name) {
  match = document.cookie.match(new RegExp(name + '=([^;]+)'));
  if (match) return match[1];
}

var initGame = function (color, fen) {
    var onDragStart = function (source, piece, position, orientation) {
        if (!inGame) {
            return true;
        }
        if (piece.search(/^w/) === -1 && myColor === "black" && turn === false) {
            return false;
        }
        if (piece.search(/^b/) === -1 && myColor === "white" && turn === false) {
            return false;
        }
        return true;
    };
    
    var onDrop = function (source, target, piece, newPos, oldPos, orientation) {
        if (!inGame) {
            return;
        }
        if ((piece.search(/w/) === -1 && myColor === "black") || (piece.search(/b/) === -1 && myColor === "white")) {
            if (target !== source) {
                socket.emit("moveAttempt", {"username": username, "from": source, "to": target, "piece": piece}, newPos); 
            }
            return 'snapback';
        } 
        
        //If you move your OWN piece (piece is white and mycolor is white or piece is black and mycolor is black), if the move is ILLEGAL, snapback, else handle the move. 
    };
    var configurations = {
        draggable: true, 
        position : 'start', 
        dropOffBoard: 'trash',
//        sparePieces: true,
        orientation: color, 
        onDragStart: onDragStart, 
        onDrop: onDrop
    };
    if (fen) {
        configurations.position = fen;
    }
    board = Chessboard("gameBoard", configurations);  
};



function arbiterAnnounce (newMsg) {
    $("#arbiterTranscript").append("Arbiter: " + newMsg + "\n");
     $('#arbiterTranscript').scrollTop($('#arbiterTranscript')[0].scrollHeight);
}

function announce (announcer, msg) {
    $("#arbiterTranscript").append(announcer + ": " + msg + "\n");
    $('#arbiterTranscript').scrollTop($('#arbiterTranscript')[0].scrollHeight);
}

$(document).ready(function () {
    $("#gameOptions").hide();
    $("#cancelChallenge").hide();
    initGame("white");
    $(document).keydown(function (e) {
        switch (e.which) {
            case 81: q = true; break;
            case 82: r = true; break;
            case 66: b = true; break;
            case 78: n = true; break;
            case 80: p = true; break;
        }
    });
    
    $(document).keyup(function (e) {
        switch (e.which) {
            case 81: q = false; break;
            case 82: r = false; break;
            case 66: b = false; break;
            case 78: n = false; break;
            case 80: p = false; break;
        }                  
    });
    
    $("#gameBoard").click(function(event) {
        var square = event.target.getAttribute("data-square");
        var pieceColor = (myColor == "white")?"b":"w";
        if (square in board.position()) {
            return;
        }
        var keysPressed = 0;
        if (q) keysPressed++;
        if (r) keysPressed++;
        if (b) keysPressed++;
        if (n) keysPressed++;
        if (p) keysPressed++;
        if (keysPressed == 1) {
            var currentPosition = board.position();
            if (q) {currentPosition[square] = pieceColor + "Q";}
            if (r) {currentPosition[square] = pieceColor + "R";}
            if (b) {currentPosition[square] = pieceColor + "B";}
            if (n) {currentPosition[square] = pieceColor + "N";}
            if (p) {currentPosition[square] = pieceColor + "P";}
            board.position(currentPosition);
        }
    });
    
    socket = io({transports:['websocket']}); 

    username = getCookie("user");
    if (username) {
        socket.emit("username", username);
    } else {
        document.location = "login.html";
    }
    $("#message").keypress(function(event) {
        if (event.which === 13) { //Enter key
            if ($("#message").val() !== "") {
                socket.emit("messageSend", $("#message").val());
                $("#message").val("");
            }
        }
    });
    
    $("#chatSend").click(function () {
        if ($("#message").val()!=="") {
            socket.emit("messageSend", $("#message").val());
            $("#message").val("");
        }
    });
    
    $("#pawnCaptures").click(function() {
        if (inGame && turn) {
            socket.emit("messageSend", "Arbiter, are there any pawn captures?");
            socket.emit("pawnCapturesQuery");
        }
    });
    
    $("#drawButton").click(function() {
        socket.emit("drawOffer");
    });
    
    $("#resignButton").click(function() {
        socket.emit("resign");    
    });
    
    socket.on("newgame", function(data) {
        var p1 = data.player1;
        var p2 = data.player2;
        var myRating, opponentRating;
        if (username==p1.username || username==p2.username) {
            arbiterAnnounce ("New game between " + p1.username + " and " + p2.username + ". " + p1.username + " plays White; it is their move.");
            $("#arbiterTranscript").text();
            $("#cancelChallenge").hide();
            inGame = true;
            challengeExtended = false;
            if (username==p1.username) {
                myColor = "white";
                initGame("white");
                turn = true;
                opponent = p2.username;
                myRating = p1.rating;
                opponentRating = p2.rating;
            } else {
                myColor = "black";
                initGame("black");
                turn = false;
                opponent = p1.username;
                opponentRating = p1.rating;
                myRating = p2.rating;
            }
            $("#player1info").text(username + " (" + myRating + ")");
            $("#player1info").css("color", "black");
            $("#player2info").text(opponent + " (" + opponentRating + ")");
            $("#player2info").css("color", "black");
            $("cOptions").show();
        }
    });
    
    socket.on("resumeGame", function(data, fen, gameTurn) {
        var myRating, opponentRating;
        if (username==data.player1.username) {
            opponent = data.player2.username;
            myColor = "white";
            myRating = data.player1.rating;
            opponentRating = data.player2.rating;
        } else {
            opponent = data.player1.username;
            myColor = "black";
            myRating = data.player2.rating;
            opponentRating = data.player1.rating;
        }
        initGame(myColor, fen);
        inGame = true;
        console.log(gameTurn)
        if ((gameTurn == 'w' && myColor == "white")||(gameTurn=='b' && myColor == "black")) {
            turn = true;
        }
        
        $("#player1info").text(username + " (" + myRating + ")");
        $("#player1info").css("color", "black");
        $("#player2info").text(opponent + " (" + opponentRating + ")");
        $("#player2info").css("color", "black");
        $("#gameOptions").show();
        arbiterAnnounce("Resumed game with " + opponent);
        
    });
    
    socket.on("messageRecieve", function(sender, message) {
        announce(sender, message);
    });
    
    socket.on("illegal", function(username) {
        arbiterAnnounce(username + ", that move is not legal. ");
    });
    
    socket.on("moveMade", function(msg) {
        arbiterAnnounce(msg);
        turn = !turn;
    });
    
    socket.on("makeMove", function(moveData) {
        var m = moveData.from + "-" + moveData.to;
        board.move(m);
        
        //Now gotta handle castling. 
        if (m=="e1-g1") {
            board.move("h1-f1");
        }
        if (m=="e1-c1") {
            board.move("a1-d1");
        }
        if (m=="e8-g8") {
            board.move("h8-f8");
        }
        if (m=="e8-c8") {
            board.move("a8-d8");
        }
        
        //Now gotta handle pawn promotions. 
        piece = moveData.piece.charAt(1);
        targetRank = moveData.to.charAt(1)
        console.log(piece, targetRank);
        console.log(piece === 'P')
        console.log((targetRank === '1' || targetRank === '8'))
        console.log(piece === 'P' && (targetRank === 1 || targetRank === 8));
        if (piece === 'P' && (targetRank === '1' || targetRank === '8')) {
            console.log("Promoting")
            position = board.position();
            position[moveData.to] = moveData.piece.charAt(0) + 'Q';
            board.position(position, false);
        }
        
        
    });
    
    socket.on("capture", function (square) {
        var oldPosition = board.position();
        delete oldPosition[square];
        board.position(oldPosition);
    });
    
    socket.on("userDisconnect", function(username) {
        if (opponent === username) {
            arbiterAnnounce(username + " has left the game. ")
            inGame = false;
        }
    });
    
    socket.on("pawnCapturesResult", function(pawnCaptures) {
        if (pawnCaptures) {
            arbiterAnnounce("There are one or more pawn captures. ");
        } else {
            arbiterAnnounce("There are no pawn captures. ");
        }
    });
    
    socket.on("usernameTaken", function() {
        var u = prompt("Username was taken. Please choose another.");
        while (u === null) {
            u = prompt("Please choose a username. ")
        }
        socket.emit("username", u);
    });
    
    socket.on("gameover", function(pgn) {
        inGame = false;
        arbiterAnnounce("Game history: " + pgn);
        $("#gameOptions").hide();
    });
    
    socket.on("resignation", function(resigner) {
        if (username == resigner || opponent == resigner) {
            arbiterAnnounce(resigner + " has resigned. ");
        }
    })
    
    socket.on("home", function(me) {
        $("#myInfo").text(me.username + " (" + me.rating + ")");
        initGame("white");
    });
    
    $("#pawnCaptures").click(function(e) { 
        socket.emit("message", "hello world!");
    }); 
    
    $("#openChallenge").click(function(e) {
        if (!challengeExtended && !inGame) {
            socket.emit("openChallenge");
            challengeExtended = true;
            $("#cancelChallenge").show();

        }
    });
    
    $("#cancelChallenge").click(function(e) {
        socket.emit("cancelChallenge");
        challengeExtended = false;
        $("#cancelChallenge").hide();
    });
    

    

});

