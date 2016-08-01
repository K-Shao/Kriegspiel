
(function () {
    module.exports.findCheckSource = function(game) {
    var turn = game.turn();
    var enemyColor = (turn=='w')?'b':'w';
    var rows = [1, 2, 3, 4, 5, 6, 7, 8];
    var columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    var columnBefore = {"a": 'i', "b": 'a', "c": 'b', "d": 'c', "e": 'd', "f": 'e', "g": 'f', "h": 'g', "i": 'i', "j": 'j'};
    var columnAfter = {"a": 'b', "b": 'c', "c": 'd', "d": 'e', "e": 'f', "f": 'g', "g": 'h', "h": 'i', "i": 'i', "j": 'j'};
    var kingRow, kingColumn;
    var kingFound = false;
    
    //Find the king
    for (var rowIndex in rows) {
        if (kingFound) {break;}
        for (var columnIndex in columns) {
            var square = columns[columnIndex] + rows[rowIndex];
            var piece = game.get(square);
            if (piece === null) {
                continue;
            }
            if (piece.type == 'k' && piece.color == turn) {
                kingSquare = square;
                kingRow = rows[rowIndex];
                kingColumn = columns[columnIndex];
                kingFound = true;
                break;
            }
        }
    }
    //King found, now check if the source is a knight
    var knightSquares = [
                         columnAfter[columnAfter[kingColumn]] + (kingRow + 1),
                         columnAfter[kingColumn] + (kingRow + 2),
                         columnAfter[columnAfter[kingColumn]] + (kingRow - 1),
                         columnAfter[kingColumn] + (kingRow - 2),
                         columnBefore[columnBefore[kingColumn]] + (kingRow + 1),
                         columnBefore[kingColumn] + (kingRow + 2),
                         columnBefore[columnBefore[kingColumn]] + (kingRow - 1),
                         columnBefore[kingColumn] + (kingRow - 2) ];
    for (var index in knightSquares) {
        var piece = game.get(knightSquares[index]);
        if (piece!==null) {
            if (piece.type === 'n' && piece.color == enemyColor) {
                return "a knight";
            }
        }
    }
    
    //Check if source is from row
    var left = columnBefore[kingColumn];
    var right = columnAfter[kingColumn];
    var leftActive = true;
    var rightActive = true;
    
    var kingSide;
    if (kingColumn == 'a' || kingColumn == 'b' || kingColumn == 'c' || kingColumn == 'd') {
        kingSide = "left";
    } else {
        kingSide = "right";
    }
    while ((left != "i" && left != "j") || (right != "i" && right != "j")) {
        if (leftActive) {
            var piece = game.get(left + kingRow);
            if (piece !== null && (piece.type == 'r' || piece.type == 'q') && piece.color == enemyColor) {
                if (kingSide == "left") {
                    return "the short side of the row";
                } else {
                    return "the long side of the row";
                }
            } else {
                if (piece!==null) {
                    leftActive = false;
                }
            }
        }
        
        if (rightActive) {
            var piece = game.get(right + kingRow);
            if (piece !== null && (piece.type == 'r' || piece.type == 'q') && piece.color == enemyColor) {
                if (kingSide == "right") {
                    return "the short side of the row";
                } else {
                    return "the long side of the row";
                }
            } else {
                if (piece!==null) {
                    rightAcitve = false;
                }
            }
        }
        
        left = columnBefore[left];
        right = columnAfter[right];
    }
    
    //Check if source is from column
    var up = kingRow + 1;
    var down = kingRow - 1;
    var upActive = true, downActive = true;
    if (kingRow < 5) {
        kingSide = "lower";
    } else {
        kingSide = "upper";
    }
    while ((up < 9)||(down > 0)) {
        if (upActive) {
            var piece = game.get(kingColumn + up);
            if (piece !== null && (piece.type == 'r' || piece.type == 'q') && piece.color == enemyColor) {
                if (kingSide == "upper") {
                    return "the short side of the column";
                } else {
                    return "the long side of the column";
                }
            } else {
                if (piece!==null) {
                    upActive = false;
                }
            }
        }
        if (downActive) {
            var piece = game.get(kingColumn + down);
            if (piece !== null && (piece.type == 'r' || piece.type == 'q') && piece.color == enemyColor) {
                if (kingSide == "lower") {
                    return "the short side of the column";
                } else {
                    return "the long side of the column";
                }
            } else {
                if (piece!==null) {
                    downActive = false;
                }
            }
        }
        
        up++;
        down--;
    }
    //Check if source is from the a1-h8 direction diagonal
    var diagonal;
    var leftActive = true, rightActive = true;
    
    if (kingColumn == 'a' || kingColumn == 'b' || kingColumn == 'c' || kingColumn == 'd') {
        if (kingRow < 5) {
            diagonal = "long";
        } else {
            diagonal = "short";
        }
    } else {
        if (kingRow < 5) {
            diagonal = "short";
        } else {
            diagonal = "long";
        }
    }
    var left = columnBefore[kingColumn];
    var down = kingRow -1;
    var right = columnAfter[kingColumn];
    var up = kingRow + 1;
    var possiblePawnSquare = (turn=='w')?(right + up):(left + down);
    var possiblePawn = game.get(possiblePawnSquare);
    if (possiblePawn!==null && possiblePawn.color==enemyColor && possiblePawn.type == 'p') {
        return "the " + diagonal + " diagonal";
    }
    
    while ((down>0 && left!=="i" && left!=="j")||(up<9 && right!=="i" && right!=="j")) {
        if (leftActive) {
            var piece = game.get(left + down);
            if (piece!==null) {
                leftActive = false;
                if ((piece.type == 'b' || piece.type == 'q') && piece.color == enemyColor) {
                    return "the " + diagonal + " diagonal";
                }
            }
        }
        if (rightActive) {
            var piece = game.get(right + up);
            if (piece!==null) {
                rightActive = false;
                if ((piece.type == 'b' || piece.type == 'q') && piece.color == enemyColor) {
                    return "the " + diagonal + " diagonal";
                }
            }
        }
        left = columnBefore[left];
        right = columnAfter[right];
        up++;
        down--;
    }

    //Check if source is from the h1-a8 direction diagonal
    leftActive = true;
    rightActive = true;
    diagonal = (diagonal =="long")? "short":"long";
    var left = columnBefore[kingColumn];
    var down = kingRow -1;
    var right = columnAfter[kingColumn];
    var up = kingRow + 1;
    var possiblePawnSquare = (turn=='b')?(right + down):(left + up);
    var possiblePawn = game.get(possiblePawnSquare);
    if (possiblePawn!==null && possiblePawn.color==enemyColor && possiblePawn.type == 'p') {
        return "the " + diagonal + " diagonal";
    }
    
    while ((up<9 && left!=="i" && left!=="j")||(down>0 && right!=="i" && right!=="j")) {
        if (leftActive) {
            var piece = game.get(left + up);
            if (piece!==null) {
                leftActive = false;
                if ((piece.type == 'b' || piece.type == 'q') && piece.color == enemyColor) {
                    return "the " + diagonal + " diagonal";
                }
            }
        }
        if (rightActive) {
            var piece = game.get(right + down);
            if (piece!==null) {
                rightActive = false;
                if ((piece.type == 'b' || piece.type == 'q') && piece.color == enemyColor) {
                    return "the " + diagonal + " diagonal";
                }
            }
        }
        left = columnBefore[left];
        right = columnAfter[right];
        up++;
        down--;
    }
    
    
    return "a piece";
    }
}());

