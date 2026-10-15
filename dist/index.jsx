// src/Chessboard.tsx
import { createMemo as createMemo4 } from "solid-js";

// src/Board.tsx
import { For as For2, Show as Show2 } from "solid-js";
import { DragOverlay } from "@dnd-kit/solid";

// src/Arrows.tsx
import { For } from "solid-js";
import { createMemo as createMemo2 } from "solid-js";

// src/ChessboardProvider.tsx
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  on,
  onCleanup,
  untrack,
  useContext
} from "solid-js";
import {
  DragDropProvider,
  KeyboardSensor
} from "@dnd-kit/solid";
import { AutoScroller, PointerActivationConstraints } from "@dnd-kit/dom";

// src/utils.ts
function generateBoard(noOfRows, noOfColumns, boardOrientation) {
  const board = Array.from(
    Array(noOfRows),
    () => new Array(noOfColumns)
  );
  for (let row = 0; row < noOfRows; row++) {
    for (let column = 0; column < noOfColumns; column++) {
      board[row][column] = {
        squareId: `${columnIndexToChessColumn(column, noOfColumns, boardOrientation)}${rowIndexToChessRow(row, noOfRows, boardOrientation)}`,
        // e.g. "a8" for row 0, column 0 in white orientation
        isLightSquare: (row + column) % 2 === 0
      };
    }
  }
  return board;
}
function rowIndexToChessRow(row, noOfRows, boardOrientation) {
  return boardOrientation === "white" ? (noOfRows - row).toString() : (row + 1).toString();
}
function columnIndexToChessColumn(column, noOfColumns, boardOrientation) {
  return boardOrientation === "white" ? String.fromCharCode(97 + column) : String.fromCharCode(97 + noOfColumns - column - 1);
}
function chessColumnToColumnIndex(column, noOfColumns, boardOrientation) {
  return boardOrientation === "white" ? column.charCodeAt(0) - 97 : noOfColumns - (column.charCodeAt(0) - 97) - 1;
}
function chessRowToRowIndex(row, noOfRows, boardOrientation) {
  return boardOrientation === "white" ? noOfRows - Number(row) : Number(row) - 1;
}
function fenStringToPositionObject(fen, noOfRows, noOfColumns) {
  const positionObject = {};
  const rows = fen.split(" ")[0].split("/");
  for (let row = 0; row < rows.length; row++) {
    let column = 0;
    for (const char of rows[row]) {
      if (isNaN(Number(char))) {
        const position = `${columnIndexToChessColumn(column, noOfColumns, "white")}${rowIndexToChessRow(row, noOfRows, "white")}`;
        positionObject[position] = {
          pieceType: fenToPieceCode(char)
        };
        column++;
      } else {
        column += Number(char);
      }
    }
  }
  return positionObject;
}
function fenToPieceCode(piece) {
  if (piece.toLowerCase() === piece) {
    return "b" + piece.toUpperCase();
  }
  return "w" + piece.toUpperCase();
}
function getPositionUpdates(oldPosition, newPosition, noOfColumns, boardOrientation) {
  const updates = {};
  for (const newSquare in newPosition) {
    const candidateSquares = [];
    if (oldPosition[newSquare]?.pieceType === newPosition[newSquare].pieceType) {
      continue;
    }
    for (const oldSquare in oldPosition) {
      if (oldPosition[oldSquare].pieceType === newPosition[newSquare].pieceType && oldSquare !== newSquare && oldPosition[oldSquare].pieceType !== newPosition[oldSquare]?.pieceType) {
        candidateSquares.push(oldSquare);
      }
    }
    if (candidateSquares.length === 1) {
      updates[candidateSquares[0]] = newSquare;
    } else {
      for (const candidateSquare of candidateSquares) {
        const candidatePieceType = oldPosition[candidateSquare].pieceType[1];
        const columnDifference = Math.abs(
          chessColumnToColumnIndex(
            candidateSquare.match(/^[a-z]+/)?.[0] ?? "",
            noOfColumns,
            boardOrientation
          ) - chessColumnToColumnIndex(
            newSquare.match(/^[a-z]+/)?.[0] ?? "",
            noOfColumns,
            boardOrientation
          )
        );
        const rowDifference = Math.abs(
          Number(candidateSquare.match(/\d+$/)?.[0] ?? "") - Number(newSquare.match(/\d+$/)?.[0] ?? "")
        );
        const isOldSquareLight = (chessColumnToColumnIndex(
          candidateSquare.match(/^[a-z]+/)?.[0] ?? "",
          noOfColumns,
          boardOrientation
        ) + Number(candidateSquare.match(/\d+$/)?.[0] ?? "")) % 2 === 0;
        const isNewSquareLight = (chessColumnToColumnIndex(
          newSquare.match(/^[a-z]+/)?.[0] ?? "",
          noOfColumns,
          boardOrientation
        ) + Number(newSquare.match(/\d+$/)?.[0] ?? "")) % 2 === 0;
        if (candidatePieceType === "P") {
          if (candidateSquare.match(/^[a-z]+/)?.[0] === newSquare.match(/^[a-z]+/)?.[0]) {
            updates[candidateSquare] = newSquare;
            break;
          }
        }
        if (candidatePieceType === "N") {
          if (columnDifference === 2 && rowDifference === 1 || columnDifference === 1 && rowDifference === 2) {
            updates[candidateSquare] = newSquare;
            break;
          }
        }
        if (candidatePieceType === "B") {
          if (columnDifference === rowDifference && isOldSquareLight === isNewSquareLight) {
            updates[candidateSquare] = newSquare;
            break;
          }
        }
        if (candidatePieceType === "R") {
          if (columnDifference === 0 || rowDifference === 0) {
            updates[candidateSquare] = newSquare;
            break;
          }
        }
        if (candidatePieceType === "Q") {
          if (columnDifference === 0 || rowDifference === 0 || columnDifference === rowDifference) {
            updates[candidateSquare] = newSquare;
            break;
          }
        }
        if (candidatePieceType === "K") {
          if (columnDifference <= 1 && rowDifference <= 1) {
            updates[candidateSquare] = newSquare;
            break;
          }
        }
      }
      if (!Object.values(updates).includes(newSquare) && candidateSquares.length > 0) {
        for (const candidateSquare of candidateSquares) {
          if (!Object.keys(updates).includes(candidateSquare)) {
            updates[candidateSquare] = newSquare;
            break;
          }
        }
      }
    }
  }
  return updates;
}
function getPromotionUpdates(oldPosition, newPosition, noOfRows, noOfColumns) {
  const promotionUpdates = {};
  for (const newSquare in newPosition) {
    if (oldPosition[newSquare]?.pieceType === newPosition[newSquare].pieceType) {
      continue;
    }
    for (const oldSquare in oldPosition) {
      if (newPosition[oldSquare]?.pieceType === oldPosition[oldSquare].pieceType) {
        continue;
      }
      if (pawnPromotesAtSquares(
        oldPosition,
        newPosition,
        oldSquare,
        newSquare,
        noOfRows,
        noOfColumns
      )) {
        promotionUpdates[oldSquare] = newSquare;
      }
    }
  }
  return promotionUpdates;
}
function pawnPromotesAtSquares(oldPosition, newPosition, oldSquare, newSquare, noOfRows, noOfColumns) {
  const oldPiece = oldPosition[oldSquare].pieceType;
  const newPiece = newPosition[newSquare].pieceType;
  const promotablePieces = /* @__PURE__ */ new Set(["Q", "R", "B", "N"]);
  let pawnSquare;
  let promotionSquare;
  if (oldPiece[1] === "P" && promotablePieces.has(newPiece[1])) {
    pawnSquare = oldSquare;
    promotionSquare = newSquare;
  } else if (newPiece[1] === "P" && promotablePieces.has(oldPiece[1])) {
    pawnSquare = newSquare;
    promotionSquare = oldSquare;
  } else {
    return false;
  }
  const columnDifference = Math.abs(
    chessColumnToColumnIndex(pawnSquare[0], noOfColumns, "black") - chessColumnToColumnIndex(promotionSquare[0], noOfColumns, "black")
  );
  if (columnDifference > 1 || oldPiece[0] !== newPiece[0]) {
    return false;
  }
  const pawnSquareRowIndex = chessRowToRowIndex(
    pawnSquare[1],
    noOfRows,
    "black"
  );
  const promotionSquareRowIndex = chessRowToRowIndex(
    promotionSquare[1],
    noOfRows,
    "black"
  );
  if (oldPiece[0] === "b" && pawnSquareRowIndex === 1 && promotionSquareRowIndex === 0) {
    return true;
  } else if (oldPiece[0] === "w" && pawnSquareRowIndex === noOfRows - 2 && promotionSquareRowIndex === noOfRows - 1) {
    return true;
  } else {
    return false;
  }
}
function getRelativeCoords(boardOrientation, boardWidth, chessboardColumns, chessboardRows, square) {
  const squareWidth = boardWidth / chessboardColumns;
  const x2 = chessColumnToColumnIndex(
    square.match(/^[a-z]+/)?.[0] ?? "",
    chessboardColumns,
    boardOrientation
  ) * squareWidth + squareWidth / 2;
  const y2 = chessRowToRowIndex(
    square.match(/\d+$/)?.[0] ?? "",
    chessboardRows,
    boardOrientation
  ) * squareWidth + squareWidth / 2;
  return { x: x2, y: y2 };
}
function isTouchEndWithinSquare(id, squareId, e2) {
  const rect = document.getElementById(`${id}-square-${squareId}`).getBoundingClientRect();
  const touches = e2.changedTouches;
  let within = false;
  for (let i2 = 0; i2 < touches.length; i2++) {
    const x2 = touches[i2].clientX;
    const y2 = touches[i2].clientY;
    if (x2 >= rect.left && x2 <= rect.right && y2 >= rect.top && y2 <= rect.bottom) {
      within = true;
      break;
    }
  }
  return within;
}

// src/pieces.tsx
var defaultPieces = {
  wP: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <path
    d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
    style={{
      opacity: "1",
      fill: props?.fill ?? "#ffffff",
      "fill-opacity": "1",
      "fill-rule": "nonzero",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "miter",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  />
    </svg>,
  wR: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      opacity: "1",
      fill: props?.fill ?? "#ffffff",
      "fill-opacity": "1",
      "fill-rule": "evenodd",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <path
    d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z "
    style={{ "stroke-linecap": "butt" }}
  />
        <path
    d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z "
    style={{ "stroke-linecap": "butt" }}
  />
        <path
    d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14"
    style={{ "stroke-linecap": "butt" }}
  />
        <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
        <path
    d="M 31,17 L 31,29.5 L 14,29.5 L 14,17"
    style={{ "stroke-linecap": "butt", "stroke-linejoin": "miter" }}
  />
        <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
        <path
    d="M 11,14 L 34,14"
    style={{ fill: "none", stroke: "#000000", "stroke-linejoin": "miter" }}
  />
      </g>
    </svg>,
  wN: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      opacity: "1",
      fill: "none",
      "fill-opacity": "1",
      "fill-rule": "evenodd",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <path
    d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
    style={{ fill: props?.fill ?? "#ffffff", stroke: "#000000" }}
  />
        <path
    d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
    style={{ fill: props?.fill ?? "#ffffff", stroke: "#000000" }}
  />
        <path
    d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"
    style={{ fill: "#000000", stroke: "#000000" }}
  />
        <path
    d="M 15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5 z"
    transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
    style={{ fill: "#000000", stroke: "#000000" }}
  />
      </g>
    </svg>,
  wB: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      opacity: "1",
      fill: "none",
      "fill-rule": "evenodd",
      "fill-opacity": "1",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <g
    style={{
      fill: props?.fill ?? "#ffffff",
      stroke: "#000000",
      "stroke-linecap": "butt"
    }}
  >
          <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z" />
          <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
          <path d="M 25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8 z" />
        </g>
        <path
    d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18"
    style={{ fill: "none", stroke: "#000000", "stroke-linejoin": "miter" }}
  />
      </g>
    </svg>,
  wQ: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      fill: props?.fill ?? "#ffffff",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linejoin": "round"
    }}
  >
        <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
        <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
        <path d="M 11.5,30 C 15,29 30,29 33.5,30" style={{ fill: "none" }} />
        <path
    d="M 12,33.5 C 18,32.5 27,32.5 33,33.5"
    style={{ fill: "none" }}
  />
        <circle cx="6" cy="12" r="2" />
        <circle cx="14" cy="9" r="2" />
        <circle cx="22.5" cy="8" r="2" />
        <circle cx="31" cy="9" r="2" />
        <circle cx="39" cy="12" r="2" />
      </g>
    </svg>,
  wK: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      fill: "none",
      "fill-opacity": "1",
      "fill-rule": "evenodd",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <path
    d="M 22.5,11.63 L 22.5,6"
    style={{ fill: "none", stroke: "#000000", "stroke-linejoin": "miter" }}
  />
        <path
    d="M 20,8 L 25,8"
    style={{ fill: "none", stroke: "#000000", "stroke-linejoin": "miter" }}
  />
        <path
    d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"
    style={{
      fill: props?.fill ?? "#ffffff",
      stroke: "#000000",
      "stroke-linecap": "butt",
      "stroke-linejoin": "miter"
    }}
  />
        <path
    d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37"
    style={{ fill: props?.fill ?? "#ffffff", stroke: "#000000" }}
  />
        <path
    d="M 12.5,30 C 18,27 27,27 32.5,30"
    style={{ fill: "none", stroke: "#000000" }}
  />
        <path
    d="M 12.5,33.5 C 18,30.5 27,30.5 32.5,33.5"
    style={{ fill: "none", stroke: "#000000" }}
  />
        <path
    d="M 12.5,37 C 18,34 27,34 32.5,37"
    style={{ fill: "none", stroke: "#000000" }}
  />
      </g>
    </svg>,
  bP: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <path
    d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
    style={{
      opacity: "1",
      fill: props?.fill ?? "#000000",
      "fill-opacity": "1",
      "fill-rule": "nonzero",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "miter",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  />
    </svg>,
  bR: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      opacity: "1",
      fill: props?.fill ?? "#000000",
      "fill-opacity": "1",
      "fill-rule": "evenodd",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <path
    d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z "
    style={{ "stroke-linecap": "butt" }}
  />
        <path
    d="M 12.5,32 L 14,29.5 L 31,29.5 L 32.5,32 L 12.5,32 z "
    style={{ "stroke-linecap": "butt" }}
  />
        <path
    d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z "
    style={{ "stroke-linecap": "butt" }}
  />
        <path
    d="M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z "
    style={{ "stroke-linecap": "butt", "stroke-linejoin": "miter" }}
  />
        <path
    d="M 14,16.5 L 11,14 L 34,14 L 31,16.5 L 14,16.5 z "
    style={{ "stroke-linecap": "butt" }}
  />
        <path
    d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 z "
    style={{ "stroke-linecap": "butt" }}
  />
        <path
    d="M 12,35.5 L 33,35.5 L 33,35.5"
    style={{
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "1",
      "stroke-linejoin": "miter"
    }}
  />
        <path
    d="M 13,31.5 L 32,31.5"
    style={{
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "1",
      "stroke-linejoin": "miter"
    }}
  />
        <path
    d="M 14,29.5 L 31,29.5"
    style={{
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "1",
      "stroke-linejoin": "miter"
    }}
  />
        <path
    d="M 14,16.5 L 31,16.5"
    style={{
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "1",
      "stroke-linejoin": "miter"
    }}
  />
        <path
    d="M 11,14 L 34,14"
    style={{
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": "1",
      "stroke-linejoin": "miter"
    }}
  />
      </g>
    </svg>,
  bN: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      opacity: "1",
      fill: "none",
      "fill-opacity": "1",
      "fill-rule": "evenodd",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <path
    d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
    style={{ fill: props?.fill ?? "#000000", stroke: "#000000" }}
  />
        <path
    d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
    style={{ fill: props?.fill ?? "#000000", stroke: "#000000" }}
  />
        <path
    d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"
    style={{ fill: "#ffffff", stroke: "#ffffff" }}
  />
        <path
    d="M 15 15.5 A 0.5 1.5 0 1 1  14,15.5 A 0.5 1.5 0 1 1  15 15.5 z"
    transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
    style={{ fill: "#ffffff", stroke: "#ffffff" }}
  />
        <path
    d="M 24.55,10.4 L 24.1,11.85 L 24.6,12 C 27.75,13 30.25,14.49 32.5,18.75 C 34.75,23.01 35.75,29.06 35.25,39 L 35.2,39.5 L 37.45,39.5 L 37.5,39 C 38,28.94 36.62,22.15 34.25,17.66 C 31.88,13.17 28.46,11.02 25.06,10.5 L 24.55,10.4 z "
    style={{ fill: "#ffffff", stroke: "none" }}
  />
      </g>
    </svg>,
  bB: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      opacity: "1",
      fill: "none",
      "fill-rule": "evenodd",
      "fill-opacity": "1",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <g
    style={{
      fill: props?.fill ?? "#000000",
      stroke: "#000000",
      "stroke-linecap": "butt"
    }}
  >
          <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z" />
          <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
          <path d="M 25 8 A 2.5 2.5 0 1 1  20,8 A 2.5 2.5 0 1 1  25 8 z" />
        </g>
        <path
    d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18"
    style={{ fill: "none", stroke: "#ffffff", "stroke-linejoin": "miter" }}
  />
      </g>
    </svg>,
  bQ: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      fill: props?.fill ?? "#000000",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }}
  >
        <path
    d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z"
    style={{ "stroke-linecap": "butt", fill: props?.fill ?? "#000000" }}
  />
        <path d="m 9,26 c 0,2 1.5,2 2.5,4 1,1.5 1,1 0.5,3.5 -1.5,1 -1,2.5 -1,2.5 -1.5,1.5 0,2.5 0,2.5 6.5,1 16.5,1 23,0 0,0 1.5,-1 0,-2.5 0,0 0.5,-1.5 -1,-2.5 -0.5,-2.5 -0.5,-2 0.5,-3.5 1,-2 2.5,-2 2.5,-4 -8.5,-1.5 -18.5,-1.5 -27,0 z" />
        <path d="M 11.5,30 C 15,29 30,29 33.5,30" />
        <path d="m 12,33.5 c 6,-1 15,-1 21,0" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="14" cy="9" r="2" />
        <circle cx="22.5" cy="8" r="2" />
        <circle cx="31" cy="9" r="2" />
        <circle cx="39" cy="12" r="2" />
        <path
    d="M 11,38.5 A 35,35 1 0 0 34,38.5"
    style={{ fill: "none", stroke: "#000000", "stroke-linecap": "butt" }}
  />
        <g style={{ fill: "none", stroke: "#ffffff" }}>
          <path d="M 11,29 A 35,35 1 0 1 34,29" />
          <path d="M 12.5,31.5 L 32.5,31.5" />
          <path d="M 11.5,34.5 A 35,35 1 0 0 33.5,34.5" />
          <path d="M 10.5,37.5 A 35,35 1 0 0 34.5,37.5" />
        </g>
      </g>
    </svg>,
  bK: (props) => <svg
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 45 45"
    width="100%"
    height="100%"
    style={props?.svgStyle}
  >
      <g
    style={{
      fill: "none",
      "fill-opacity": "1",
      "fill-rule": "evenodd",
      stroke: "#000000",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "4",
      "stroke-dasharray": "none",
      "stroke-opacity": "1"
    }}
  >
        <path
    d="M 22.5,11.63 L 22.5,6"
    style={{ fill: "none", stroke: "#000000", "stroke-linejoin": "miter" }}
    id="path6570"
  />
        <path
    d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25"
    style={{
      fill: props?.fill ?? "#000000",
      "fill-opacity": "1",
      "stroke-linecap": "butt",
      "stroke-linejoin": "miter"
    }}
  />
        <path
    d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37"
    style={{ fill: props?.fill ?? "#000000", stroke: "#000000" }}
  />
        <path
    d="M 20,8 L 25,8"
    style={{ fill: "none", stroke: "#000000", "stroke-linejoin": "miter" }}
  />
        <path
    d="M 32,29.5 C 32,29.5 40.5,25.5 38.03,19.85 C 34.15,14 25,18 22.5,24.5 L 22.5,26.6 L 22.5,24.5 C 20,18 10.85,14 6.97,19.85 C 4.5,25.5 13,29.5 13,29.5"
    style={{ fill: "none", stroke: "#ffffff" }}
  />
        <path
    d="M 12.5,30 C 18,27 27,27 32.5,30 M 12.5,33.5 C 18,30.5 27,30.5 32.5,33.5 M 12.5,37 C 18,34 27,34 32.5,37"
    style={{ fill: "none", stroke: "#ffffff" }}
  />
      </g>
    </svg>
};

// src/defaults.ts
function defaultBoardStyle(chessboardColumns) {
  return {
    display: "grid",
    "grid-template-columns": `repeat(${chessboardColumns}, 1fr)`,
    overflow: "hidden",
    width: "100%",
    height: "100%",
    position: "relative"
  };
}
var defaultSquareStyle = {
  "aspect-ratio": "1 / 1",
  display: "flex",
  "justify-content": "center",
  "align-items": "center",
  position: "relative"
};
var defaultDarkSquareStyle = {
  "background-color": "#B58863"
};
var defaultLightSquareStyle = {
  "background-color": "#F0D9B5"
};
var defaultDropSquareStyle = {
  "box-shadow": "inset 0 0 0 1px black"
};
var defaultDarkSquareNotationStyle = {
  color: "#F0D9B5"
};
var defaultLightSquareNotationStyle = {
  color: "#B58863"
};
var defaultAlphaNotationStyle = {
  "font-size": "13px",
  position: "absolute",
  bottom: "1px",
  right: "4px",
  "user-select": "none"
};
var defaultNumericNotationStyle = {
  "font-size": "13px",
  position: "absolute",
  top: "2px",
  left: "2px",
  "user-select": "none"
};
var defaultDraggingPieceStyle = {
  transform: "scale(1.2)"
};
var defaultDraggingPieceGhostStyle = {
  opacity: 0.5
};
var defaultArrowOptions = {
  colors: {
    default: "#ffaa00",
    shift: "#4caf50",
    ctrl: "#f44336",
    alt: "#9c27b0",
    meta: "#fbbf24"
  },
  /** @deprecated Use `colors.default` instead */
  color: "#ffaa00",
  /** @deprecated Use `colors.shift` instead */
  secondaryColor: "#4caf50",
  /** @deprecated Use `colors.ctrl` instead */
  tertiaryColor: "#f44336",
  arrowLengthReducerDenominator: 8,
  sameTargetArrowLengthReducerDenominator: 4,
  arrowWidthDenominator: 5,
  activeArrowWidthMultiplier: 0.9,
  opacity: 0.65,
  activeOpacity: 0.5,
  arrowStartOffset: 0
};

// src/RightClickCancelSensor.ts
import { PointerSensor } from "@dnd-kit/dom";

// node_modules/@preact/signals-core/dist/signals-core.module.js
var i = /* @__PURE__ */ Symbol.for("preact-signals");
function t() {
  if (!(v > 1)) {
    var i2, t2 = false;
    !(function() {
      var i3 = c;
      c = void 0;
      while (void 0 !== i3) {
        var t3 = i3.S;
        if (t3.v === i3.v) {
          for (var n3 = t3.t; void 0 !== n3; n3 = n3.x) if (n3.i === i3.i) n3.i = t3.i;
        }
        i3 = i3.o;
      }
    })();
    while (void 0 !== h) {
      var n2 = h;
      h = void 0;
      s++;
      while (void 0 !== n2) {
        var r2 = n2.u;
        n2.u = void 0;
        n2.f &= -3;
        if (!(8 & n2.f) && w(n2)) try {
          n2.c();
        } catch (n3) {
          if (!t2) {
            i2 = n3;
            t2 = true;
          }
        }
        n2 = r2;
      }
    }
    s = 0;
    v--;
    if (t2) throw i2;
  } else v--;
}
function n(i2) {
  if (v > 0) return i2();
  e = ++u;
  v++;
  try {
    return i2();
  } finally {
    t();
  }
}
var r;
var o = void 0;
function f(i2) {
  var t2 = o, n2 = r;
  o = void 0;
  r = void 0;
  try {
    return i2();
  } finally {
    o = t2;
    r = n2;
  }
}
var h = void 0;
var v = 0;
var s = 0;
var u = 0;
var e = 0;
var c = void 0;
var d = 0;
function a(i2) {
  if (void 0 !== o) {
    var t2 = i2.n;
    if (void 0 === t2 || t2.t !== o) {
      t2 = { i: 0, S: i2, p: o.s, n: void 0, t: o, e: void 0, x: void 0, r: t2 };
      if (void 0 !== o.s) o.s.n = t2;
      o.s = t2;
      i2.n = t2;
      if (32 & o.f) i2.S(t2);
      return t2;
    } else if (-1 === t2.i) {
      t2.i = 0;
      if (void 0 !== t2.n) {
        t2.n.p = t2.p;
        if (void 0 !== t2.p) t2.p.n = t2.n;
        t2.p = o.s;
        t2.n = void 0;
        o.s.n = t2;
        o.s = t2;
      }
      return t2;
    }
  }
}
function l(i2, t2) {
  this.v = i2;
  this.i = 0;
  this.n = void 0;
  this.t = void 0;
  this.l = 0;
  this.W = null == t2 ? void 0 : t2.watched;
  this.Z = null == t2 ? void 0 : t2.unwatched;
  this.name = null == t2 ? void 0 : t2.name;
}
l.prototype.brand = i;
l.prototype.h = function() {
  return true;
};
l.prototype.S = function(i2) {
  var t2 = this, n2 = this.t;
  if (n2 !== i2 && void 0 === i2.e) {
    i2.x = n2;
    this.t = i2;
    if (void 0 !== n2) n2.e = i2;
    else f(function() {
      var i3;
      null == (i3 = t2.W) || i3.call(t2);
    });
  }
};
l.prototype.U = function(i2) {
  var t2 = this;
  if (void 0 !== this.t) {
    var n2 = i2.e, r2 = i2.x;
    if (void 0 !== n2) {
      n2.x = r2;
      i2.e = void 0;
    }
    if (void 0 !== r2) {
      r2.e = n2;
      i2.x = void 0;
    }
    if (i2 === this.t) {
      this.t = r2;
      if (void 0 === r2) f(function() {
        var i3;
        null == (i3 = t2.Z) || i3.call(t2);
      });
    }
  }
};
l.prototype.subscribe = function(i2) {
  var t2 = this;
  return j(function() {
    var n2 = t2.value;
    f(function() {
      return i2(n2);
    });
  }, { name: "sub" });
};
l.prototype.valueOf = function() {
  return this.value;
};
l.prototype.toString = function() {
  return this.value + "";
};
l.prototype.toJSON = function() {
  return this.value;
};
l.prototype.peek = function() {
  var i2 = this;
  return f(function() {
    return i2.value;
  });
};
Object.defineProperty(l.prototype, "value", { get: function() {
  var i2 = a(this);
  if (void 0 !== i2) i2.i = this.i;
  return this.v;
}, set: function(i2) {
  if (i2 !== this.v) {
    if (s > 100) throw new Error("Cycle detected");
    !(function(i3) {
      if (0 !== v && 0 === s) {
        if (i3.l !== e) {
          i3.l = e;
          c = { S: i3, v: i3.v, i: i3.i, o: c };
        }
      }
    })(this);
    this.v = i2;
    this.i++;
    d++;
    v++;
    try {
      for (var n2 = this.t; void 0 !== n2; n2 = n2.x) n2.t.N();
    } finally {
      t();
    }
  }
} });
function y(i2, t2) {
  return new l(i2, t2);
}
function w(i2) {
  for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) if (t2.S.i !== t2.i || !t2.S.h() || t2.S.i !== t2.i) return true;
  return false;
}
function _(i2) {
  for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) {
    var n2 = t2.S.n;
    if (void 0 !== n2) t2.r = n2;
    t2.S.n = t2;
    t2.i = -1;
    if (void 0 === t2.n) {
      i2.s = t2;
      break;
    }
  }
}
function b(i2) {
  var t2 = i2.s, n2 = void 0;
  while (void 0 !== t2) {
    var r2 = t2.p;
    if (-1 === t2.i) {
      t2.S.U(t2);
      if (void 0 !== r2) r2.n = t2.n;
      if (void 0 !== t2.n) t2.n.p = r2;
    } else n2 = t2;
    t2.S.n = t2.r;
    if (void 0 !== t2.r) t2.r = void 0;
    t2 = r2;
  }
  i2.s = n2;
}
function p(i2, t2) {
  l.call(this, void 0, t2);
  this.x = i2;
  this.s = void 0;
  this.g = d - 1;
  this.f = 4;
}
p.prototype = new l();
p.prototype.h = function() {
  this.f &= -3;
  if (1 & this.f) return false;
  if (32 == (36 & this.f)) return true;
  this.f &= -5;
  if (this.g === d) return true;
  this.g = d;
  this.f |= 1;
  if (this.i > 0 && !w(this)) {
    this.f &= -2;
    return true;
  }
  var i2 = o;
  try {
    _(this);
    o = this;
    var t2 = this.x();
    if (16 & this.f || this.v !== t2 || 0 === this.i) {
      this.v = t2;
      this.f &= -17;
      this.i++;
    }
  } catch (i3) {
    this.v = i3;
    this.f |= 16;
    this.i++;
  }
  o = i2;
  b(this);
  this.f &= -2;
  return true;
};
p.prototype.S = function(i2) {
  if (void 0 === this.t) {
    this.f |= 36;
    for (var t2 = this.s; void 0 !== t2; t2 = t2.n) t2.S.S(t2);
  }
  l.prototype.S.call(this, i2);
};
p.prototype.U = function(i2) {
  if (void 0 !== this.t) {
    l.prototype.U.call(this, i2);
    if (void 0 === this.t) {
      this.f &= -33;
      for (var t2 = this.s; void 0 !== t2; t2 = t2.n) t2.S.U(t2);
    }
  }
};
p.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 6;
    for (var i2 = this.t; void 0 !== i2; i2 = i2.x) i2.t.N();
  }
};
Object.defineProperty(p.prototype, "value", { get: function() {
  if (1 & this.f) throw new Error("Cycle detected");
  var i2 = a(this);
  this.h();
  if (void 0 !== i2) i2.i = this.i;
  if (16 & this.f) throw this.v;
  return this.v;
} });
function g(i2, t2) {
  return new p(i2, t2);
}
function S(i2) {
  var n2 = i2.m;
  i2.m = void 0;
  if ("function" == typeof n2) {
    v++;
    var r2 = o;
    o = void 0;
    try {
      n2();
    } catch (t2) {
      i2.f &= -2;
      i2.f |= 8;
      m(i2);
      throw t2;
    } finally {
      o = r2;
      t();
    }
  }
}
function m(i2) {
  for (var t2 = i2.s; void 0 !== t2; t2 = t2.n) t2.S.U(t2);
  i2.x = void 0;
  i2.s = void 0;
  S(i2);
}
function x(i2) {
  if (o !== this) throw new Error("Out-of-order effect");
  b(this);
  o = i2;
  this.f &= -2;
  if (8 & this.f) m(this);
  t();
}
function E(i2, t2) {
  this.x = i2;
  this.m = void 0;
  this.s = void 0;
  this.u = void 0;
  this.f = 32;
  this.name = null == t2 ? void 0 : t2.name;
  if (r) r.push(this);
}
E.prototype.c = function() {
  var i2 = this.S();
  try {
    if (8 & this.f) return;
    if (void 0 === this.x) return;
    var t2 = this.x();
    if ("function" == typeof t2) this.m = t2;
  } finally {
    i2();
  }
};
E.prototype.S = function() {
  if (1 & this.f) throw new Error("Cycle detected");
  this.f |= 1;
  this.f &= -9;
  S(this);
  _(this);
  v++;
  var i2 = o;
  o = this;
  return x.bind(this, i2);
};
E.prototype.N = function() {
  if (!(2 & this.f)) {
    this.f |= 2;
    this.u = h;
    h = this;
  }
};
E.prototype.d = function() {
  this.f |= 8;
  if (!(1 & this.f)) m(this);
};
E.prototype.dispose = function() {
  this.d();
};
function j(i2, t2) {
  var n2 = new E(i2, t2);
  try {
    n2.c();
  } catch (i3) {
    n2.d();
    throw i3;
  }
  var r2 = n2.d.bind(n2);
  r2[Symbol.dispose] = r2;
  return r2;
}

// node_modules/@dnd-kit/state/dist/index.mjs
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a2, b2) => {
  for (var prop in b2 || (b2 = {}))
    if (__hasOwnProp.call(b2, prop))
      __defNormalProp(a2, prop, b2[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b2)) {
      if (__propIsEnum.call(b2, prop))
        __defNormalProp(a2, prop, b2[prop]);
    }
  return a2;
};
var __spreadProps = (a2, b2) => __defProps(a2, __getOwnPropDescs(b2));
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __decoratorStart = (base) => {
  var _a22;
  return [, , , __create((_a22 = base == null ? void 0 : base[__knownSymbol("metadata")]) != null ? _a22 : null)];
};
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i2 = 0, fns = array[flags >> 1], n2 = fns && fns.length; i2 < n2; i2++) flags & 1 ? fns[i2].call(self) : value = fns[i2].call(self, value);
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s2 = !!(flags & 8), p2 = !!(flags & 16);
  var j2 = k > 3 ? array.length + 1 : k ? s2 ? 1 : 2 : 0, key = __decoratorStrings[k + 5];
  var initializers = k > 3 && (array[j2 - 1] = []), extraInitializers = array[j2] || (array[j2] = []);
  var desc = k && (!p2 && !s2 && (target = target.prototype), k < 5 && (k > 3 || !p2) && __getOwnPropDesc(k < 4 ? target : { get [name]() {
    return __privateGet(this, extra);
  }, set [name](x2) {
    return __privateSet(this, extra, x2);
  } }, name));
  k ? p2 && k < 4 && __name(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name(target, name);
  for (var i2 = decorators.length - 1; i2 >= 0; i2--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s2, ctx.private = p2, access = ctx.access = { has: p2 ? (x2) => __privateIn(target, x2) : (x2) => name in x2 };
      if (k ^ 3) access.get = p2 ? (x2) => (k ^ 1 ? __privateGet : __privateMethod)(x2, target, k ^ 4 ? extra : desc.get) : (x2) => x2[name];
      if (k > 2) access.set = p2 ? (x2, y2) => __privateSet(x2, target, y2, k ^ 4 ? extra : desc.set) : (x2, y2) => x2[name] = y2;
    }
    it = (0, decorators[i2])(k ? k < 4 ? p2 ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn(it) && (k > 4 ? initializers.unshift(it) : k ? p2 ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError("Object expected");
    else __expectFn(fn = it.get) && (desc.get = fn), __expectFn(fn = it.set) && (desc.set = fn), __expectFn(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata(array, target), desc && __defProp(target, name, desc), p2 ? k ^ 4 ? extra : desc : target;
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateIn = (member, obj) => Object(obj) !== obj ? __typeError('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
function computed(compute, comparator) {
  if (comparator) {
    let previousValue;
    return g(() => {
      const value = compute();
      if (value && previousValue && comparator(previousValue, value)) {
        return previousValue;
      }
      previousValue = value;
      return value;
    });
  }
  return g(compute);
}
function reactive({ get }, _2) {
  return {
    init(value) {
      return y(value);
    },
    get() {
      const current = get.call(this);
      return current.value;
    },
    set(newValue) {
      const current = get.call(this);
      if (current.peek() === newValue) {
        return;
      }
      current.value = newValue;
    }
  };
}
function derived(target, _2) {
  const map = /* @__PURE__ */ new WeakMap();
  return function() {
    let result = map.get(this);
    if (!result) {
      result = computed(target.bind(this));
      map.set(this, result);
    }
    return result.value;
  };
}
function enumerable(enumerable2 = true) {
  return function(_value2, context) {
    context.addInitializer(function() {
      const host = context.kind === "field" ? this : context.static ? this : Object.getPrototypeOf(this);
      const descriptor2 = Object.getOwnPropertyDescriptor(host, context.name);
      if (descriptor2) {
        Object.defineProperty(host, context.name, __spreadProps(__spreadValues({}, descriptor2), { enumerable: enumerable2 }));
      }
    });
  };
}
var _previous_dec;
var _initial_dec;
var _current_dec;
var _current_dec2;
var _previous_dec2;
var _initial_dec2;
var _init;
var _initial;
var _a;
var initial_get;
var initial_set;
var _ValueHistory_instances;
var _previous;
var _b;
var previous_get;
var previous_set;
var _current;
var _c;
var current_get;
var current_set;
_initial_dec2 = [reactive], _previous_dec2 = [reactive], _current_dec2 = [reactive], _current_dec = [enumerable()], _initial_dec = [enumerable()], _previous_dec = [enumerable()];
var ValueHistory = class {
  constructor(defaultValue, equals = Object.is) {
    this.defaultValue = defaultValue;
    this.equals = equals;
    __runInitializers(_init, 5, this);
    __privateAdd(this, _ValueHistory_instances);
    __privateAdd(this, _initial, __runInitializers(_init, 8, this)), __runInitializers(_init, 11, this);
    __privateAdd(this, _previous, __runInitializers(_init, 12, this)), __runInitializers(_init, 15, this);
    __privateAdd(this, _current, __runInitializers(_init, 16, this)), __runInitializers(_init, 19, this);
    this.reset = this.reset.bind(this);
    this.reset();
  }
  get current() {
    return __privateGet(this, _ValueHistory_instances, current_get);
  }
  get initial() {
    return __privateGet(this, _ValueHistory_instances, initial_get);
  }
  get previous() {
    return __privateGet(this, _ValueHistory_instances, previous_get);
  }
  /** Set the current value */
  set current(value) {
    const current = f(() => __privateGet(this, _ValueHistory_instances, current_get));
    if (value && current && this.equals(current, value)) {
      return;
    }
    n(() => {
      if (!__privateGet(this, _ValueHistory_instances, initial_get)) {
        __privateSet(this, _ValueHistory_instances, value, initial_set);
      }
      __privateSet(this, _ValueHistory_instances, current, previous_set);
      __privateSet(this, _ValueHistory_instances, value, current_set);
    });
  }
  /** Reset the state to the initial value */
  reset(value = this.defaultValue) {
    n(() => {
      __privateSet(this, _ValueHistory_instances, void 0, previous_set);
      __privateSet(this, _ValueHistory_instances, value, initial_set);
      __privateSet(this, _ValueHistory_instances, value, current_set);
    });
  }
};
_init = __decoratorStart(null);
_initial = /* @__PURE__ */ new WeakMap();
_ValueHistory_instances = /* @__PURE__ */ new WeakSet();
_previous = /* @__PURE__ */ new WeakMap();
_current = /* @__PURE__ */ new WeakMap();
_a = __decorateElement(_init, 20, "#initial", _initial_dec2, _ValueHistory_instances, _initial), initial_get = _a.get, initial_set = _a.set;
_b = __decorateElement(_init, 20, "#previous", _previous_dec2, _ValueHistory_instances, _previous), previous_get = _b.get, previous_set = _b.set;
_c = __decorateElement(_init, 20, "#current", _current_dec2, _ValueHistory_instances, _current), current_get = _c.get, current_set = _c.set;
__decorateElement(_init, 2, "current", _current_dec, ValueHistory);
__decorateElement(_init, 2, "initial", _initial_dec, ValueHistory);
__decorateElement(_init, 2, "previous", _previous_dec, ValueHistory);
__decoratorMetadata(_init, ValueHistory);
function snapshot(value) {
  return f(() => {
    const output = {};
    for (const key in value) {
      output[key] = value[key];
    }
    return output;
  });
}
var _store;
_store = /* @__PURE__ */ new WeakMap();

// node_modules/@dnd-kit/geometry/dist/index.mjs
var __create2 = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __knownSymbol2 = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __typeError2 = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp2 = (obj, key, value) => key in obj ? __defProp2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name2 = (target, value) => __defProp2(target, "name", { value, configurable: true });
var __decoratorStart2 = (base) => {
  var _a22;
  return [, , , __create2((_a22 = base == null ? void 0 : base[__knownSymbol2("metadata")]) != null ? _a22 : null)];
};
var __decoratorStrings2 = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn2 = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError2("Function expected") : fn;
var __decoratorContext2 = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings2[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError2("Already initialized") : fns.push(__expectFn2(fn || null)) });
var __decoratorMetadata2 = (array, target) => __defNormalProp2(target, __knownSymbol2("metadata"), array[3]);
var __runInitializers2 = (array, flags, self, value) => {
  for (var i2 = 0, fns = array[flags >> 1], n2 = fns && fns.length; i2 < n2; i2++) flags & 1 ? fns[i2].call(self) : value = fns[i2].call(self, value);
  return value;
};
var __decorateElement2 = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s2 = !!(flags & 8), p2 = !!(flags & 16);
  var j2 = k > 3 ? array.length + 1 : k ? s2 ? 1 : 2 : 0, key = __decoratorStrings2[k + 5];
  var initializers = k > 3 && (array[j2 - 1] = []), extraInitializers = array[j2] || (array[j2] = []);
  var desc = k && (!p2 && !s2 && (target = target.prototype), k < 5 && (k > 3 || !p2) && __getOwnPropDesc2(k < 4 ? target : { get [name]() {
    return __privateGet2(this, extra);
  }, set [name](x2) {
    return __privateSet2(this, extra, x2);
  } }, name));
  k ? p2 && k < 4 && __name2(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name2(target, name);
  for (var i2 = decorators.length - 1; i2 >= 0; i2--) {
    ctx = __decoratorContext2(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s2, ctx.private = p2, access = ctx.access = { has: p2 ? (x2) => __privateIn2(target, x2) : (x2) => name in x2 };
      if (k ^ 3) access.get = p2 ? (x2) => (k ^ 1 ? __privateGet2 : __privateMethod2)(x2, target, k ^ 4 ? extra : desc.get) : (x2) => x2[name];
      if (k > 2) access.set = p2 ? (x2, y2) => __privateSet2(x2, target, y2, k ^ 4 ? extra : desc.set) : (x2, y2) => x2[name] = y2;
    }
    it = (0, decorators[i2])(k ? k < 4 ? p2 ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn2(it) && (k > 4 ? initializers.unshift(it) : k ? p2 ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError2("Object expected");
    else __expectFn2(fn = it.get) && (desc.get = fn), __expectFn2(fn = it.set) && (desc.set = fn), __expectFn2(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata2(array, target), desc && __defProp2(target, name, desc), p2 ? k ^ 4 ? extra : desc : target;
};
var __accessCheck2 = (obj, member, msg) => member.has(obj) || __typeError2("Cannot " + msg);
var __privateIn2 = (member, obj) => Object(obj) !== obj ? __typeError2('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet2 = (obj, member, getter) => (__accessCheck2(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd2 = (obj, member, value) => member.has(obj) ? __typeError2("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet2 = (obj, member, value, setter) => (__accessCheck2(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod2 = (obj, member, method) => (__accessCheck2(obj, member, "access private method"), method);
var Point = class _Point {
  /**
   * @param {number} Coordinate of the point on the horizontal axis
   * @param {number} Coordinate of the point on the vertical axis
   */
  constructor(x2, y2) {
    this.x = x2;
    this.y = y2;
  }
  /**
   * Returns the delta between this point and another point.
   *
   * @param {Point} a - A point
   * @param {Point} b - Another point
   */
  static delta(a2, b2) {
    return new _Point(a2.x - b2.x, a2.y - b2.y);
  }
  /**
   * Returns the distance (hypotenuse) between this point and another point.
   *
   * @param {Point} a - A point
   * @param {Point} b - Another point
   */
  static distance(a2, b2) {
    return Math.hypot(a2.x - b2.x, a2.y - b2.y);
  }
  /**
   * Returns true if both points are equal.
   *
   * @param {Point} a - A point
   * @param {Point} b - Another point
   */
  static equals(a2, b2) {
    return a2.x === b2.x && a2.y === b2.y;
  }
  static from({ x: x2, y: y2 }) {
    return new _Point(x2, y2);
  }
};
var _direction_dec;
var _delta_dec;
var _a2;
var _timestamp;
var _init2;
var Position = class extends (_a2 = ValueHistory, _delta_dec = [derived], _direction_dec = [derived], _a2) {
  constructor(initialValue) {
    const point = Point.from(initialValue);
    super(point, (a2, b2) => Point.equals(a2, b2));
    __runInitializers2(_init2, 5, this);
    __privateAdd2(this, _timestamp, 0);
    this.velocity = { x: 0, y: 0 };
  }
  get delta() {
    return Point.delta(this.current, this.initial);
  }
  get direction() {
    const { current, previous } = this;
    if (!previous) return null;
    const delta = {
      x: current.x - previous.x,
      y: current.y - previous.y
    };
    if (!delta.x && !delta.y) {
      return null;
    }
    if (Math.abs(delta.x) > Math.abs(delta.y)) {
      return delta.x > 0 ? "right" : "left";
    }
    return delta.y > 0 ? "down" : "up";
  }
  get current() {
    return super.current;
  }
  set current(coordinates) {
    const { current } = this;
    const point = Point.from(coordinates);
    const delta = {
      x: point.x - current.x,
      y: point.y - current.y
    };
    const timestamp = Date.now();
    const timeDelta = timestamp - __privateGet2(this, _timestamp);
    const velocity = (delta2) => Math.round(delta2 / timeDelta * 100);
    n(() => {
      __privateSet2(this, _timestamp, timestamp);
      this.velocity = {
        x: velocity(delta.x),
        y: velocity(delta.y)
      };
      super.current = point;
    });
  }
  reset(coordinates = this.defaultValue) {
    super.reset(Point.from(coordinates));
    this.velocity = { x: 0, y: 0 };
  }
};
_init2 = __decoratorStart2(_a2);
_timestamp = /* @__PURE__ */ new WeakMap();
__decorateElement2(_init2, 2, "delta", _delta_dec, Position);
__decorateElement2(_init2, 2, "direction", _direction_dec, Position);
__decoratorMetadata2(_init2, Position);
var Axis = /* @__PURE__ */ ((Axis2) => {
  Axis2["Horizontal"] = "x";
  Axis2["Vertical"] = "y";
  return Axis2;
})(Axis || {});
var Axes = Object.values(Axis);

// node_modules/@dnd-kit/abstract/index.js
var __create3 = Object.create;
var __defProp3 = Object.defineProperty;
var __defProps2 = Object.defineProperties;
var __getOwnPropDesc3 = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs2 = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols2 = Object.getOwnPropertySymbols;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __propIsEnum2 = Object.prototype.propertyIsEnumerable;
var __knownSymbol3 = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __typeError3 = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp3 = (obj, key, value) => key in obj ? __defProp3(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues2 = (a2, b2) => {
  for (var prop in b2 || (b2 = {}))
    if (__hasOwnProp2.call(b2, prop))
      __defNormalProp3(a2, prop, b2[prop]);
  if (__getOwnPropSymbols2)
    for (var prop of __getOwnPropSymbols2(b2)) {
      if (__propIsEnum2.call(b2, prop))
        __defNormalProp3(a2, prop, b2[prop]);
    }
  return a2;
};
var __spreadProps2 = (a2, b2) => __defProps2(a2, __getOwnPropDescs2(b2));
var __name3 = (target, value) => __defProp3(target, "name", { value, configurable: true });
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp2.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols2)
    for (var prop of __getOwnPropSymbols2(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum2.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __decoratorStart3 = (base) => {
  var _a3;
  return [, , , __create3((_a3 = base == null ? void 0 : base[__knownSymbol3("metadata")]) != null ? _a3 : null)];
};
var __decoratorStrings3 = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn3 = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError3("Function expected") : fn;
var __decoratorContext3 = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings3[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError3("Already initialized") : fns.push(__expectFn3(fn || null)) });
var __decoratorMetadata3 = (array, target) => __defNormalProp3(target, __knownSymbol3("metadata"), array[3]);
var __runInitializers3 = (array, flags, self, value) => {
  for (var i2 = 0, fns = array[flags >> 1], n2 = fns && fns.length; i2 < n2; i2++) flags & 1 ? fns[i2].call(self) : value = fns[i2].call(self, value);
  return value;
};
var __decorateElement3 = (array, flags, name, decorators, target, extra) => {
  var fn, it, done, ctx, access, k = flags & 7, s2 = !!(flags & 8), p2 = !!(flags & 16);
  var j2 = k > 3 ? array.length + 1 : k ? s2 ? 1 : 2 : 0, key = __decoratorStrings3[k + 5];
  var initializers = k > 3 && (array[j2 - 1] = []), extraInitializers = array[j2] || (array[j2] = []);
  var desc = k && (!p2 && !s2 && (target = target.prototype), k < 5 && (k > 3 || !p2) && __getOwnPropDesc3(k < 4 ? target : { get [name]() {
    return __privateGet3(this, extra);
  }, set [name](x2) {
    return __privateSet3(this, extra, x2);
  } }, name));
  k ? p2 && k < 4 && __name3(extra, (k > 2 ? "set " : k > 1 ? "get " : "") + name) : __name3(target, name);
  for (var i2 = decorators.length - 1; i2 >= 0; i2--) {
    ctx = __decoratorContext3(k, name, done = {}, array[3], extraInitializers);
    if (k) {
      ctx.static = s2, ctx.private = p2, access = ctx.access = { has: p2 ? (x2) => __privateIn3(target, x2) : (x2) => name in x2 };
      if (k ^ 3) access.get = p2 ? (x2) => (k ^ 1 ? __privateGet3 : __privateMethod3)(x2, target, k ^ 4 ? extra : desc.get) : (x2) => x2[name];
      if (k > 2) access.set = p2 ? (x2, y2) => __privateSet3(x2, target, y2, k ^ 4 ? extra : desc.set) : (x2, y2) => x2[name] = y2;
    }
    it = (0, decorators[i2])(k ? k < 4 ? p2 ? extra : desc[key] : k > 4 ? void 0 : { get: desc.get, set: desc.set } : target, ctx), done._ = 1;
    if (k ^ 4 || it === void 0) __expectFn3(it) && (k > 4 ? initializers.unshift(it) : k ? p2 ? extra = it : desc[key] = it : target = it);
    else if (typeof it !== "object" || it === null) __typeError3("Object expected");
    else __expectFn3(fn = it.get) && (desc.get = fn), __expectFn3(fn = it.set) && (desc.set = fn), __expectFn3(fn = it.init) && initializers.unshift(fn);
  }
  return k || __decoratorMetadata3(array, target), desc && __defProp3(target, name, desc), p2 ? k ^ 4 ? extra : desc : target;
};
var __accessCheck3 = (obj, member, msg) => member.has(obj) || __typeError3("Cannot " + msg);
var __privateIn3 = (member, obj) => Object(obj) !== obj ? __typeError3('Cannot use the "in" operator on this value') : member.has(obj);
var __privateGet3 = (obj, member, getter) => (__accessCheck3(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd3 = (obj, member, value) => member.has(obj) ? __typeError3("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet3 = (obj, member, value, setter) => (__accessCheck3(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod3 = (obj, member, method) => (__accessCheck3(obj, member, "access private method"), method);
function configure(plugin, options) {
  return {
    plugin,
    options
  };
}
function configurator(plugin) {
  return (options) => {
    return configure(plugin, options);
  };
}
function descriptor(plugin) {
  if (typeof plugin === "function") {
    return {
      plugin,
      options: void 0
    };
  }
  return plugin;
}
var _disabled_dec;
var _init3;
var _disabled;
var _cleanupFunctions;
_disabled_dec = [reactive];
var Plugin = class {
  /**
   * Creates a new plugin instance.
   *
   * @param manager - The drag and drop manager that owns this plugin
   * @param options - Optional configuration for the plugin
   */
  constructor(manager, options) {
    this.manager = manager;
    this.options = options;
    __privateAdd3(this, _disabled, __runInitializers3(_init3, 8, this, false)), __runInitializers3(_init3, 11, this);
    __privateAdd3(this, _cleanupFunctions, /* @__PURE__ */ new Set());
  }
  /**
   * Enables a disabled plugin instance.
   *
   * @remarks
   * This method triggers effects when called.
   */
  enable() {
    this.disabled = false;
  }
  /**
   * Disables an enabled plugin instance.
   *
   * @remarks
   * This method triggers effects when called.
   */
  disable() {
    this.disabled = true;
  }
  /**
   * Checks if the plugin instance is disabled.
   *
   * @returns true if the plugin is disabled
   * @remarks
   * This method does not trigger effects when accessed.
   */
  isDisabled() {
    return f(() => {
      return this.disabled;
    });
  }
  /**
   * Configures a plugin instance with new options.
   *
   * @param options - The new options to apply
   */
  configure(options) {
    this.options = options;
  }
  /**
   * Registers an effect that will be cleaned up when the plugin is destroyed.
   *
   * @param callback - The effect callback to register
   * @returns A function to dispose of the effect
   */
  registerEffect(callback) {
    const dispose = j(callback.bind(this));
    __privateGet3(this, _cleanupFunctions).add(dispose);
    return dispose;
  }
  /**
   * Destroys a plugin instance and cleans up its resources.
   *
   * @remarks
   * This method:
   * - Calls all registered cleanup functions
   * - Should be overridden by subclasses to clean up additional resources
   */
  destroy() {
    __privateGet3(this, _cleanupFunctions).forEach((cleanup) => cleanup());
  }
  /**
   * Configures a plugin constructor with options.
   *
   * @param options - The options to configure the constructor with
   * @returns The configured plugin constructor
   *
   * @remarks
   * This method is used to configure the options that the
   * plugin constructor will use to create plugin instances.
   */
  static configure(options) {
    return configure(this, options);
  }
};
_init3 = __decoratorStart3(null);
_disabled = /* @__PURE__ */ new WeakMap();
_cleanupFunctions = /* @__PURE__ */ new WeakMap();
__decorateElement3(_init3, 4, "disabled", _disabled_dec, Plugin, _disabled);
__decoratorMetadata3(_init3, Plugin);
var _previousValues;
_previousValues = /* @__PURE__ */ new WeakMap();
var _previousCoordinates;
var _collisions;
_previousCoordinates = /* @__PURE__ */ new WeakMap();
_collisions = /* @__PURE__ */ new WeakMap();
var _disabled_dec2;
var _data_dec;
var _manager_dec;
var _Entity_static;
var flushIdChanges_fn;
var _init22;
var _manager;
var _idSignal;
var _data;
var _disabled2;
_manager_dec = [reactive], _data_dec = [reactive], _disabled_dec2 = [reactive];
var _Entity = class _Entity2 {
  /**
   * Creates a new instance of the `Entity` class.
   *
   * @param input - An object containing the initial properties of the entity.
   * @param manager - The manager that controls the drag and drop operations.
   */
  constructor(input, manager) {
    __privateAdd3(this, _manager, __runInitializers3(_init22, 8, this)), __runInitializers3(_init22, 11, this);
    __privateAdd3(this, _idSignal);
    __privateAdd3(this, _data, __runInitializers3(_init22, 12, this)), __runInitializers3(_init22, 15, this);
    __privateAdd3(this, _disabled2, __runInitializers3(_init22, 16, this)), __runInitializers3(_init22, 19, this);
    const { effects: effects6, id, data = {}, disabled = false, register = true } = input;
    let previousId = id;
    __privateSet3(this, _idSignal, y(id));
    this.manager = manager;
    this.data = data;
    this.disabled = disabled;
    this.effects = () => {
      var _a3;
      return [
        () => {
          const { id: id2, manager: manager2 } = this;
          if (id2 === previousId) {
            return;
          }
          previousId = id2;
          manager2 == null ? void 0 : manager2.registry.register(this);
          return () => manager2 == null ? void 0 : manager2.registry.unregister(this);
        },
        ...(_a3 = effects6 == null ? void 0 : effects6()) != null ? _a3 : []
      ];
    };
    this.register = this.register.bind(this);
    this.unregister = this.unregister.bind(this);
    this.destroy = this.destroy.bind(this);
    if (manager && register) {
      queueMicrotask(this.register);
    }
  }
  get id() {
    var _a3, _b2;
    const signalValue = __privateGet3(this, _idSignal).value;
    return (_b2 = (_a3 = _Entity2.pendingIdChanges) == null ? void 0 : _a3.get(this)) != null ? _b2 : signalValue;
  }
  set id(value) {
    var _a3, _b2;
    const current = (_b2 = (_a3 = _Entity2.pendingIdChanges) == null ? void 0 : _a3.get(this)) != null ? _b2 : __privateGet3(this, _idSignal).peek();
    if (value === current) return;
    if (!_Entity2.pendingIdChanges) {
      _Entity2.pendingIdChanges = /* @__PURE__ */ new Map();
      queueMicrotask(() => {
        var _a22;
        return __privateMethod3(_a22 = _Entity2, _Entity_static, flushIdChanges_fn).call(_a22);
      });
    }
    _Entity2.pendingIdChanges.set(this, value);
  }
  /**
   * A method that registers the entity with the manager.
   * @returns CleanupFunction | void
   */
  register() {
    var _a3;
    return (_a3 = this.manager) == null ? void 0 : _a3.registry.register(this);
  }
  /**
   * A method that unregisters the entity from the manager.
   * @returns void
   */
  unregister() {
    var _a3;
    (_a3 = this.manager) == null ? void 0 : _a3.registry.unregister(this);
  }
  /**
   * A method that cleans up the entity when it is no longer needed.
   * @returns void
   */
  destroy() {
    var _a3;
    (_a3 = this.manager) == null ? void 0 : _a3.registry.unregister(this);
  }
};
_init22 = __decoratorStart3(null);
_Entity_static = /* @__PURE__ */ new WeakSet();
flushIdChanges_fn = function() {
  const changes = _Entity.pendingIdChanges;
  _Entity.pendingIdChanges = null;
  if (changes) {
    n(() => {
      for (const [entity, id] of changes) {
        __privateGet3(entity, _idSignal).value = id;
      }
    });
  }
};
_manager = /* @__PURE__ */ new WeakMap();
_idSignal = /* @__PURE__ */ new WeakMap();
_data = /* @__PURE__ */ new WeakMap();
_disabled2 = /* @__PURE__ */ new WeakMap();
__decorateElement3(_init22, 4, "manager", _manager_dec, _Entity, _manager);
__decorateElement3(_init22, 4, "data", _data_dec, _Entity, _data);
__decorateElement3(_init22, 4, "disabled", _disabled_dec2, _Entity, _disabled2);
__privateAdd3(_Entity, _Entity_static);
__decoratorMetadata3(_init22, _Entity);
_Entity.pendingIdChanges = null;
var Entity = _Entity;
var _isDragSource_dec;
var _isDragging_dec;
var _isDropping_dec;
var _status_dec;
var _modifiers_dec;
var _type_dec;
var _c2;
var _init32;
var _type;
var _modifiers;
var _status;
var Draggable = class extends (_c2 = Entity, _type_dec = [reactive], _modifiers_dec = [reactive], _status_dec = [reactive], _isDropping_dec = [derived], _isDragging_dec = [derived], _isDragSource_dec = [derived], _c2) {
  constructor(_a3, manager) {
    var _b2 = _a3, { modifiers, type, sensors, plugins, effects: effects6 } = _b2, input = __objRest(_b2, ["modifiers", "type", "sensors", "plugins", "effects"]);
    super(
      __spreadProps2(__spreadValues2({}, input), {
        effects: () => {
          var _a22;
          return [
            ...(_a22 = effects6 == null ? void 0 : effects6()) != null ? _a22 : [],
            () => {
              const { manager: manager2, plugins: plugins2 } = this;
              if (!manager2 || !plugins2) return;
              for (const entry of plugins2) {
                const { plugin } = descriptor(entry);
                manager2.registry.plugins.register(plugin);
              }
            }
          ];
        }
      }),
      manager
    );
    __runInitializers3(_init32, 5, this);
    __privateAdd3(this, _type, __runInitializers3(_init32, 8, this)), __runInitializers3(_init32, 11, this);
    __privateAdd3(this, _modifiers, __runInitializers3(_init32, 12, this)), __runInitializers3(_init32, 15, this);
    __privateAdd3(this, _status, __runInitializers3(_init32, 16, this, this.isDragSource ? "dragging" : "idle")), __runInitializers3(_init32, 19, this);
    this.type = type;
    this.sensors = sensors;
    this.modifiers = modifiers;
    this.alignment = input.alignment;
    this.plugins = plugins;
  }
  /**
   * Look up per-entity options for a given plugin constructor.
   */
  pluginConfig(plugin) {
    if (!this.plugins) return void 0;
    for (const entry of this.plugins) {
      const desc = descriptor(entry);
      if (desc.plugin === plugin) return desc.options;
    }
    return void 0;
  }
  get isDropping() {
    return this.status === "dropping" && this.isDragSource;
  }
  get isDragging() {
    return this.status === "dragging" && this.isDragSource;
  }
  get isDragSource() {
    var _a3, _b2;
    return ((_b2 = (_a3 = this.manager) == null ? void 0 : _a3.dragOperation.source) == null ? void 0 : _b2.id) === this.id;
  }
};
_init32 = __decoratorStart3(_c2);
_type = /* @__PURE__ */ new WeakMap();
_modifiers = /* @__PURE__ */ new WeakMap();
_status = /* @__PURE__ */ new WeakMap();
__decorateElement3(_init32, 4, "type", _type_dec, Draggable, _type);
__decorateElement3(_init32, 4, "modifiers", _modifiers_dec, Draggable, _modifiers);
__decorateElement3(_init32, 4, "status", _status_dec, Draggable, _status);
__decorateElement3(_init32, 2, "isDropping", _isDropping_dec, Draggable);
__decorateElement3(_init32, 2, "isDragging", _isDragging_dec, Draggable);
__decorateElement3(_init32, 2, "isDragSource", _isDragSource_dec, Draggable);
__decoratorMetadata3(_init32, Draggable);
var _isDropTarget_dec;
var _shape_dec;
var _collisionPriority_dec;
var _collisionDetector_dec;
var _type_dec2;
var _accept_dec;
var _c22;
var _init4;
var _accept;
var _type2;
var _collisionDetector;
var _collisionPriority;
var _shape;
var Droppable = class extends (_c22 = Entity, _accept_dec = [reactive], _type_dec2 = [reactive], _collisionDetector_dec = [reactive], _collisionPriority_dec = [reactive], _shape_dec = [reactive], _isDropTarget_dec = [derived], _c22) {
  constructor(_a3, manager) {
    var _b2 = _a3, { accept, collisionDetector, collisionPriority, type } = _b2, input = __objRest(_b2, ["accept", "collisionDetector", "collisionPriority", "type"]);
    super(input, manager);
    __runInitializers3(_init4, 5, this);
    __privateAdd3(this, _accept, __runInitializers3(_init4, 8, this)), __runInitializers3(_init4, 11, this);
    __privateAdd3(this, _type2, __runInitializers3(_init4, 12, this)), __runInitializers3(_init4, 15, this);
    __privateAdd3(this, _collisionDetector, __runInitializers3(_init4, 16, this)), __runInitializers3(_init4, 19, this);
    __privateAdd3(this, _collisionPriority, __runInitializers3(_init4, 20, this)), __runInitializers3(_init4, 23, this);
    __privateAdd3(this, _shape, __runInitializers3(_init4, 24, this)), __runInitializers3(_init4, 27, this);
    this.accept = accept;
    this.collisionDetector = collisionDetector;
    this.collisionPriority = collisionPriority;
    this.type = type;
  }
  /**
   * Checks whether or not the droppable accepts a given draggable.
   *
   * @param draggable - The draggable to check
   * @returns true if the draggable can be dropped here
   */
  accepts(draggable) {
    const { accept } = this;
    if (!accept) {
      return true;
    }
    if (typeof accept === "function") {
      return accept(draggable);
    }
    if (!draggable.type) {
      return false;
    }
    if (Array.isArray(accept)) {
      return accept.includes(draggable.type);
    }
    return draggable.type === accept;
  }
  get isDropTarget() {
    var _a3, _b2;
    return ((_b2 = (_a3 = this.manager) == null ? void 0 : _a3.dragOperation.target) == null ? void 0 : _b2.id) === this.id;
  }
};
_init4 = __decoratorStart3(_c22);
_accept = /* @__PURE__ */ new WeakMap();
_type2 = /* @__PURE__ */ new WeakMap();
_collisionDetector = /* @__PURE__ */ new WeakMap();
_collisionPriority = /* @__PURE__ */ new WeakMap();
_shape = /* @__PURE__ */ new WeakMap();
__decorateElement3(_init4, 4, "accept", _accept_dec, Droppable, _accept);
__decorateElement3(_init4, 4, "type", _type_dec2, Droppable, _type2);
__decorateElement3(_init4, 4, "collisionDetector", _collisionDetector_dec, Droppable, _collisionDetector);
__decorateElement3(_init4, 4, "collisionPriority", _collisionPriority_dec, Droppable, _collisionPriority);
__decorateElement3(_init4, 4, "shape", _shape_dec, Droppable, _shape);
__decorateElement3(_init4, 2, "isDropTarget", _isDropTarget_dec, Droppable);
__decoratorMetadata3(_init4, Droppable);
var _dropped_dec;
var _dragging_dec;
var _initialized_dec;
var _initializing_dec;
var _initializationPending_dec;
var _idle_dec;
var _current_dec3;
var _value_dec;
var _init5;
var _value;
_value_dec = [reactive], _current_dec3 = [derived], _idle_dec = [derived], _initializationPending_dec = [derived], _initializing_dec = [derived], _initialized_dec = [derived], _dragging_dec = [derived], _dropped_dec = [derived];
var Status = class {
  constructor() {
    __runInitializers3(_init5, 5, this);
    __privateAdd3(this, _value, __runInitializers3(
      _init5,
      8,
      this,
      "idle"
      /* Idle */
    )), __runInitializers3(_init5, 11, this);
  }
  get current() {
    return this.value;
  }
  get idle() {
    return this.value === "idle";
  }
  get initializationPending() {
    return this.value === "initialization-pending";
  }
  get initializing() {
    return this.value === "initializing";
  }
  get initialized() {
    const { value } = this;
    return value !== "idle" && value !== "initialization-pending";
  }
  get dragging() {
    return this.value === "dragging";
  }
  get dropped() {
    return this.value === "dropped";
  }
  /**
   * Sets the current status value.
   *
   * @param value - The new status value
   */
  set(value) {
    this.value = value;
  }
};
_init5 = __decoratorStart3(null);
_value = /* @__PURE__ */ new WeakMap();
__decorateElement3(_init5, 4, "value", _value_dec, Status, _value);
__decorateElement3(_init5, 2, "current", _current_dec3, Status);
__decorateElement3(_init5, 2, "idle", _idle_dec, Status);
__decorateElement3(_init5, 2, "initializationPending", _initializationPending_dec, Status);
__decorateElement3(_init5, 2, "initializing", _initializing_dec, Status);
__decorateElement3(_init5, 2, "initialized", _initialized_dec, Status);
__decorateElement3(_init5, 2, "dragging", _dragging_dec, Status);
__decorateElement3(_init5, 2, "dropped", _dropped_dec, Status);
__decoratorMetadata3(_init5, Status);
var _controller;
_controller = /* @__PURE__ */ new WeakMap();
var Modifier = class extends Plugin {
  /**
   * Creates a new modifier instance.
   *
   * @param manager - The drag and drop manager that owns this modifier
   * @param options - Optional configuration for the modifier
   */
  constructor(manager, options) {
    super(manager, options);
    this.manager = manager;
    this.options = options;
  }
  /**
   * Applies the modifier to the current drag operation.
   *
   * @param operation - The current state of the drag operation
   * @returns The transformed coordinates
   *
   * @remarks
   * Override this method to implement custom transformation logic.
   * The default implementation returns the original transform unchanged.
   */
  apply(operation) {
    return operation.transform;
  }
};
var _transform_dec;
var _target_dec;
var _source_dec;
var _modifiers_dec2;
var _targetIdentifier_dec;
var _sourceIdentifier_dec;
var _activatorEvent_dec;
var _canceled_dec;
var _shape_dec2;
var _manager2;
var _previousSource;
var _shape2;
var _init6;
var _canceled;
var _activatorEvent;
var _sourceIdentifier;
var _targetIdentifier;
var _modifiers2;
var _transform;
_shape_dec2 = [derived], _canceled_dec = [reactive], _activatorEvent_dec = [reactive], _sourceIdentifier_dec = [reactive], _targetIdentifier_dec = [reactive], _modifiers_dec2 = [reactive], _source_dec = [derived], _target_dec = [derived], _transform_dec = [derived];
var DragOperation = class {
  /**
   * Creates a new drag operation instance.
   *
   * @param manager - The drag and drop manager that owns this operation
   */
  constructor(manager) {
    __runInitializers3(_init6, 5, this);
    __privateAdd3(this, _manager2);
    __privateAdd3(this, _previousSource);
    __privateAdd3(this, _shape2, new ValueHistory(
      void 0,
      (a2, b2) => a2 && b2 ? a2.equals(b2) : a2 === b2
    ));
    this.status = new Status();
    __privateAdd3(this, _canceled, __runInitializers3(_init6, 8, this, false)), __runInitializers3(_init6, 11, this);
    __privateAdd3(this, _activatorEvent, __runInitializers3(_init6, 12, this, null)), __runInitializers3(_init6, 15, this);
    __privateAdd3(this, _sourceIdentifier, __runInitializers3(_init6, 16, this, null)), __runInitializers3(_init6, 19, this);
    __privateAdd3(this, _targetIdentifier, __runInitializers3(_init6, 20, this, null)), __runInitializers3(_init6, 23, this);
    __privateAdd3(this, _modifiers2, __runInitializers3(_init6, 24, this, [])), __runInitializers3(_init6, 27, this);
    this.position = new Position({ x: 0, y: 0 });
    __privateAdd3(this, _transform, { x: 0, y: 0 });
    __privateSet3(this, _manager2, manager);
  }
  get shape() {
    const { current, initial, previous } = __privateGet3(this, _shape2);
    if (!current || !initial) {
      return null;
    }
    return { current, initial, previous };
  }
  /**
   * Sets the shape of the dragged entity.
   *
   * @param value - The new shape or null to reset
   */
  set shape(value) {
    if (!value) {
      __privateGet3(this, _shape2).reset();
    } else {
      __privateGet3(this, _shape2).current = value;
    }
  }
  get source() {
    var _a3;
    const identifier = this.sourceIdentifier;
    if (identifier == null) return null;
    const value = __privateGet3(this, _manager2).registry.draggables.get(identifier);
    if (value) {
      __privateSet3(this, _previousSource, value);
    }
    return (_a3 = value != null ? value : __privateGet3(this, _previousSource)) != null ? _a3 : null;
  }
  get target() {
    var _a3;
    const identifier = this.targetIdentifier;
    return identifier != null ? (_a3 = __privateGet3(this, _manager2).registry.droppables.get(identifier)) != null ? _a3 : null : null;
  }
  get transform() {
    const { x: x2, y: y2 } = this.position.delta;
    let transform = { x: x2, y: y2 };
    for (const modifier of this.modifiers) {
      transform = modifier.apply(__spreadProps2(__spreadValues2({}, this.snapshot()), {
        transform
      }));
    }
    __privateSet3(this, _transform, transform);
    return transform;
  }
  /**
   * Creates a snapshot of the current drag operation state.
   *
   * @returns An immutable snapshot of the current operation state
   */
  snapshot() {
    return f(() => ({
      source: this.source,
      target: this.target,
      activatorEvent: this.activatorEvent,
      transform: __privateGet3(this, _transform),
      shape: this.shape ? snapshot(this.shape) : null,
      position: snapshot(this.position),
      status: snapshot(this.status),
      canceled: this.canceled
    }));
  }
  /**
   * Resets the drag operation to its initial state.
   *
   * @remarks
   * This method:
   * - Sets status to idle
   * - Clears source and target identifiers
   * - Resets shape history
   * - Resets position and transform
   * - Clears modifiers
   */
  reset() {
    n(() => {
      this.status.set(
        "idle"
        /* Idle */
      );
      this.sourceIdentifier = null;
      this.targetIdentifier = null;
      __privateGet3(this, _shape2).reset();
      this.position.reset({ x: 0, y: 0 });
      __privateSet3(this, _transform, { x: 0, y: 0 });
      this.modifiers = [];
    });
  }
};
_init6 = __decoratorStart3(null);
_manager2 = /* @__PURE__ */ new WeakMap();
_previousSource = /* @__PURE__ */ new WeakMap();
_shape2 = /* @__PURE__ */ new WeakMap();
_canceled = /* @__PURE__ */ new WeakMap();
_activatorEvent = /* @__PURE__ */ new WeakMap();
_sourceIdentifier = /* @__PURE__ */ new WeakMap();
_targetIdentifier = /* @__PURE__ */ new WeakMap();
_modifiers2 = /* @__PURE__ */ new WeakMap();
_transform = /* @__PURE__ */ new WeakMap();
__decorateElement3(_init6, 2, "shape", _shape_dec2, DragOperation);
__decorateElement3(_init6, 4, "canceled", _canceled_dec, DragOperation, _canceled);
__decorateElement3(_init6, 4, "activatorEvent", _activatorEvent_dec, DragOperation, _activatorEvent);
__decorateElement3(_init6, 4, "sourceIdentifier", _sourceIdentifier_dec, DragOperation, _sourceIdentifier);
__decorateElement3(_init6, 4, "targetIdentifier", _targetIdentifier_dec, DragOperation, _targetIdentifier);
__decorateElement3(_init6, 4, "modifiers", _modifiers_dec2, DragOperation, _modifiers2);
__decorateElement3(_init6, 2, "source", _source_dec, DragOperation);
__decorateElement3(_init6, 2, "target", _target_dec, DragOperation);
__decorateElement3(_init6, 2, "transform", _transform_dec, DragOperation);
__decoratorMetadata3(_init6, DragOperation);

// src/RightClickCancelSensor.ts
var RightClickCancelSensor = class _RightClickCancelSensor extends PointerSensor {
  // NOTE: `configure` must be re-declared here. The inherited static is bound
  // to the base PointerSensor and would silently instantiate that instead.
  static configure = configurator(_RightClickCancelSensor);
  bind(source, options) {
    const cleanup = super.bind(source, options);
    if (typeof window === "undefined") return cleanup;
    const handleContextMenu = (e2) => {
      this.handleCancel?.(
        e2
      );
    };
    window.addEventListener("contextmenu", handleContextMenu);
    return () => {
      cleanup();
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }
};

// src/modifiers.ts
var PreventDragOffBoard = class _PreventDragOffBoard extends Modifier {
  static configure = configurator(_PreventDragOffBoard);
  apply(operation) {
    const { transform } = operation;
    const boardId = this.options?.boardId;
    const draggingPiecePosition = this.options?.getDraggingPosition?.() ?? "";
    if (typeof document === "undefined" || !boardId) return transform;
    const boardElement = document.getElementById(`${boardId}-board`);
    if (!boardElement) return transform;
    const boardRect = boardElement.getBoundingClientRect();
    const a1Square = boardElement.querySelector(
      '[data-column="a"][data-row="1"]'
    );
    if (!a1Square) return transform;
    const squareWidth = a1Square.getBoundingClientRect().width;
    const halfSquareWidth = squareWidth / 2;
    const match = draggingPiecePosition.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) return transform;
    const [, col, row] = match;
    const startSquare = boardElement.querySelector(
      `[data-column="${col}"][data-row="${row}"]`
    );
    if (!startSquare) return transform;
    const startSquareRect = startSquare.getBoundingClientRect();
    const startX = startSquareRect.left + halfSquareWidth - boardRect.left;
    const startY = startSquareRect.top + halfSquareWidth - boardRect.top;
    const minX = -startX;
    const maxX = boardRect.width - startX;
    const minY = -startY;
    const maxY = boardRect.height - startY;
    return {
      ...transform,
      x: Math.min(Math.max(transform.x, minX), maxX),
      y: Math.min(Math.max(transform.y, minY), maxY)
    };
  }
};
var preventDragOffBoard = (boardId, draggingPiecePosition) => PreventDragOffBoard.configure({
  boardId,
  getDraggingPosition: typeof draggingPiecePosition === "function" ? draggingPiecePosition : () => draggingPiecePosition
});

// src/ChessboardProvider.tsx
var START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
var ChessboardContext = createContext(null);
function useChessboardContext() {
  return useContext(ChessboardContext);
}
function ChessboardProvider(props) {
  const options = mergeProps(
    {
      id: "chessboard",
      pieces: defaultPieces,
      position: START_FEN,
      boardOrientation: "white",
      chessboardRows: 8,
      chessboardColumns: 8,
      boardStyle: {},
      squareStyle: defaultSquareStyle,
      squareStyles: {},
      darkSquareStyle: defaultDarkSquareStyle,
      lightSquareStyle: defaultLightSquareStyle,
      dropSquareStyle: defaultDropSquareStyle,
      draggingPieceStyle: defaultDraggingPieceStyle,
      draggingPieceGhostStyle: defaultDraggingPieceGhostStyle,
      darkSquareNotationStyle: defaultDarkSquareNotationStyle,
      lightSquareNotationStyle: defaultLightSquareNotationStyle,
      alphaNotationStyle: defaultAlphaNotationStyle,
      numericNotationStyle: defaultNumericNotationStyle,
      showNotation: true,
      animationDurationInMs: 300,
      showAnimations: true,
      allowDragging: true,
      allowDragOffBoard: true,
      allowAutoScroll: false,
      dragActivationDistance: 1,
      allowDrawingArrows: true,
      arrows: [],
      arrowOptions: defaultArrowOptions,
      clearArrowsOnClick: true,
      clearArrowsOnPositionChange: true
    },
    () => props.options ?? {}
  );
  const toPositionObject = (pos) => typeof pos === "string" ? fenStringToPositionObject(
    pos,
    options.chessboardRows,
    options.chessboardColumns
  ) : pos;
  const [draggingPiece, setDraggingPiece] = createSignal(null);
  const [currentPosition, setCurrentPosition] = createSignal(
    toPositionObject(untrack(() => options.position))
  );
  const [positionDifferences, setPositionDifferences] = createSignal({});
  const [manuallyDroppedPieceAndSquare, setManuallyDroppedPieceAndSquare] = createSignal(null);
  const [newArrowStartSquare, setNewArrowStartSquare] = createSignal(null);
  const [newArrowOverSquare, setNewArrowOverSquare] = createSignal(null);
  const [internalArrows, setInternalArrows] = createSignal([]);
  const [waitingForAnimationPosition, setWaitingForAnimationPosition] = createSignal(null);
  const board = createMemo(
    () => generateBoard(
      options.chessboardRows,
      options.chessboardColumns,
      options.boardOrientation
    )
  );
  const resolveArrowColor = (modifiers2) => {
    const arrowOptions = options.arrowOptions;
    if (arrowOptions.colors) {
      if (modifiers2?.altKey && arrowOptions.colors.alt)
        return arrowOptions.colors.alt;
      if (modifiers2?.shiftKey && arrowOptions.colors.shift)
        return arrowOptions.colors.shift;
      if (modifiers2?.ctrlKey && arrowOptions.colors.ctrl)
        return arrowOptions.colors.ctrl;
      if (modifiers2?.metaKey && arrowOptions.colors.meta)
        return arrowOptions.colors.meta;
      return arrowOptions.colors.default || arrowOptions.color;
    }
    return modifiers2?.shiftKey ? arrowOptions.secondaryColor : modifiers2?.ctrlKey ? arrowOptions.tertiaryColor : arrowOptions.color;
  };
  const drawArrow = (newArrowEndSquare, modifiers2) => {
    if (!options.allowDrawingArrows) return;
    const start = newArrowStartSquare();
    if (!start || start === newArrowEndSquare) return;
    const externalArrows = options.arrows;
    const current = internalArrows();
    const arrowExistsIndex = current.findIndex(
      (arrow) => arrow.startSquare === start && arrow.endSquare === newArrowEndSquare
    );
    const arrowExistsExternally = externalArrows.some(
      (arrow) => arrow.startSquare === start && arrow.endSquare === newArrowEndSquare
    );
    if (arrowExistsExternally) {
      setNewArrowStartSquare(null);
      setNewArrowOverSquare(null);
      return;
    }
    const arrowColor = resolveArrowColor(modifiers2);
    setInternalArrows(
      (prev) => arrowExistsIndex === -1 ? [
        ...prev,
        {
          startSquare: start,
          endSquare: newArrowEndSquare,
          color: arrowColor
        }
      ] : prev.filter((_2, index) => index !== arrowExistsIndex)
    );
    setNewArrowStartSquare(null);
    setNewArrowOverSquare(null);
  };
  const clearArrows = () => {
    if (options.clearArrowsOnClick) {
      setInternalArrows([]);
      setNewArrowStartSquare(null);
      setNewArrowOverSquare(null);
    }
  };
  const setNewArrowOverSquareWithModifiers = (square, modifiers2) => {
    if (square) {
      setNewArrowOverSquare({ square, color: resolveArrowColor(modifiers2) });
    } else {
      setNewArrowOverSquare(null);
    }
  };
  createEffect(
    on(
      () => options.position,
      (position) => {
        const newPosition = toPositionObject(position);
        if (untrack(() => options.clearArrowsOnPositionChange)) {
          untrack(clearArrows);
        }
        if (!untrack(() => options.showAnimations)) {
          setCurrentPosition(newPosition);
          return;
        }
        const animationDurationInMs = untrack(
          () => options.animationDurationInMs
        );
        const chessboardColumns = untrack(() => options.chessboardColumns);
        const chessboardRows = untrack(() => options.chessboardRows);
        const boardOrientation = untrack(() => options.boardOrientation);
        const currentWaitingForAnimationPosition = waitingForAnimationPosition();
        if (currentWaitingForAnimationPosition) {
          setCurrentPosition(currentWaitingForAnimationPosition);
          setWaitingForAnimationPosition(null);
        }
        const base = currentWaitingForAnimationPosition ?? currentPosition();
        const positionUpdates = getPositionUpdates(
          base,
          newPosition,
          chessboardColumns,
          boardOrientation
        );
        const multiplePiecesMoved = Object.keys(positionUpdates).length > 1;
        const manual = manuallyDroppedPieceAndSquare();
        if (manual && multiplePiecesMoved) {
          const intermediatePosition = { ...currentPosition() };
          delete intermediatePosition[manual.sourceSquare];
          intermediatePosition[manual.targetSquare] = {
            pieceType: manual.piece
          };
          setCurrentPosition(intermediatePosition);
          const otherPiecesUpdates = { ...positionUpdates };
          delete otherPiecesUpdates[manual.sourceSquare];
          setPositionDifferences(otherPiecesUpdates);
          const timer2 = setTimeout(() => {
            setCurrentPosition(newPosition);
            setPositionDifferences({});
            setManuallyDroppedPieceAndSquare(null);
          }, animationDurationInMs);
          onCleanup(() => clearTimeout(timer2));
          return;
        }
        if (manual) {
          setCurrentPosition(newPosition);
          setManuallyDroppedPieceAndSquare(null);
          return;
        }
        if (Object.keys(positionUpdates).length === 0) {
          const promotionUpdates = getPromotionUpdates(
            base,
            newPosition,
            chessboardRows,
            chessboardColumns
          );
          if (Object.keys(promotionUpdates).length === 1) {
            setPositionDifferences(promotionUpdates);
            setWaitingForAnimationPosition(newPosition);
            const timer2 = setTimeout(() => {
              setCurrentPosition(newPosition);
              setPositionDifferences({});
              setWaitingForAnimationPosition(null);
            }, animationDurationInMs);
            onCleanup(() => clearTimeout(timer2));
            return;
          }
        }
        setPositionDifferences(positionUpdates);
        setWaitingForAnimationPosition(newPosition);
        const timer = setTimeout(() => {
          setCurrentPosition(newPosition);
          setPositionDifferences({});
          setWaitingForAnimationPosition(null);
        }, animationDurationInMs);
        onCleanup(() => clearTimeout(timer));
      },
      { defer: true }
    )
  );
  createEffect(
    on(
      () => [
        options.chessboardRows,
        options.chessboardColumns,
        options.boardOrientation
      ],
      () => {
        setCurrentPosition(toPositionObject(untrack(() => options.position)));
      },
      { defer: true }
    )
  );
  createEffect(() => {
    const arrows = internalArrows();
    untrack(() => options.onArrowsChange)?.({ arrows });
  });
  const handleDragStart = (event) => {
    const source = event.operation.source;
    if (!source) return;
    const data = source.data;
    const isSparePiece = data?.isSparePiece ?? false;
    const id = String(source.id);
    const pieceType = data?.pieceType ?? currentPosition()[id]?.pieceType ?? id;
    untrack(() => options.onPieceDrag)?.({
      isSparePiece,
      piece: isSparePiece ? { pieceType: id } : currentPosition()[id] ?? { pieceType },
      square: isSparePiece ? null : id
    });
    setDraggingPiece({ isSparePiece, position: id, pieceType });
  };
  const handleDragEnd = (event) => {
    if (event.canceled) {
      setDraggingPiece(null);
      untrack(() => options.onPieceDragCancel)?.();
      return;
    }
    const dragging = draggingPiece();
    if (!dragging) return;
    const target = event.operation.target;
    const dropSquare = target ? String(target.id) : null;
    if (!dropSquare) {
      untrack(() => options.onPieceDrop)?.({
        piece: dragging,
        sourceSquare: dragging.position,
        targetSquare: null
      });
      setManuallyDroppedPieceAndSquare({
        piece: dragging.pieceType,
        sourceSquare: dragging.position,
        targetSquare: ""
      });
      setDraggingPiece(null);
      return;
    }
    const isDropValid = untrack(() => options.onPieceDrop)?.({
      piece: dragging,
      sourceSquare: dragging.position,
      targetSquare: dropSquare
    });
    if (isDropValid) {
      setManuallyDroppedPieceAndSquare({
        piece: dragging.pieceType,
        sourceSquare: dragging.position,
        targetSquare: dropSquare
      });
    }
    setDraggingPiece(null);
  };
  const sensors = [
    RightClickCancelSensor.configure({
      activationConstraints: () => [
        new PointerActivationConstraints.Distance({
          value: options.dragActivationDistance
        })
      ],
      preventActivation: (event) => event.button === 2
    }),
    KeyboardSensor
  ];
  const modifiers = options.allowDragOffBoard ? [] : [
    preventDragOffBoard(options.id, () => draggingPiece()?.position ?? "")
  ];
  const contextValue = {
    options,
    isWrapped: true,
    board,
    currentPosition,
    draggingPiece,
    positionDifferences,
    newArrowStartSquare,
    newArrowOverSquare,
    internalArrows,
    setNewArrowStartSquare,
    setNewArrowOverSquare: setNewArrowOverSquareWithModifiers,
    drawArrow,
    clearArrows
  };
  return <ChessboardContext.Provider value={contextValue}>
      <DragDropProvider
    sensors={sensors}
    modifiers={modifiers}
    plugins={(defaults) => (
      // `allowAutoScroll: false` removes the default AutoScroller plugin.
      untrack(() => options.allowAutoScroll) ? defaults : defaults.filter((p2) => p2 !== AutoScroller)
    )}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
        {props.children}
      </DragDropProvider>
    </ChessboardContext.Provider>;
}

// src/Arrows.tsx
function Arrows() {
  const ctx = useChessboardContext();
  const viewBoxWidth = 2048;
  const viewBoxHeight = () => viewBoxWidth * (ctx.options.chessboardRows / ctx.options.chessboardColumns);
  const currentlyDrawingArrow = createMemo2(() => {
    const start = ctx.newArrowStartSquare();
    const over = ctx.newArrowOverSquare();
    return start && over && start !== over.square ? {
      startSquare: start,
      endSquare: over.square,
      color: over.color
    } : null;
  });
  const arrowsToDraw = createMemo2(() => {
    const drawing = currentlyDrawingArrow();
    return drawing ? [...ctx.options.arrows, ...ctx.internalArrows(), drawing] : [...ctx.options.arrows, ...ctx.internalArrows()];
  });
  const renderArrow = (arrow, i2) => {
    const from = () => getRelativeCoords(
      ctx.options.boardOrientation,
      viewBoxWidth,
      ctx.options.chessboardColumns,
      ctx.options.chessboardRows,
      arrow.startSquare
    );
    const to = () => getRelativeCoords(
      ctx.options.boardOrientation,
      viewBoxWidth,
      ctx.options.chessboardColumns,
      ctx.options.chessboardRows,
      arrow.endSquare
    );
    return (() => {
      const squareWidth = viewBoxWidth / ctx.options.chessboardColumns;
      const arrowOptions = ctx.options.arrowOptions;
      let lengthReducer = squareWidth / arrowOptions.arrowLengthReducerDenominator;
      const drawing = currentlyDrawingArrow();
      const all = arrowsToDraw();
      const isArrowActive = !!drawing && i2() === all.length - 1;
      if (all.some(
        (restArrow) => restArrow.startSquare !== arrow.startSquare && restArrow.endSquare === arrow.endSquare
      ) && !isArrowActive) {
        lengthReducer = squareWidth / arrowOptions.sameTargetArrowLengthReducerDenominator;
      }
      const dx = to().x - from().x;
      const dy = to().y - from().y;
      const r2 = Math.hypot(dy, dx);
      const startOffset = squareWidth * arrowOptions.arrowStartOffset;
      let pathD;
      if (r2 === Math.hypot(1, 2) * squareWidth) {
        const isVerticalFirst = Math.abs(dx) < Math.abs(dy);
        const start = isVerticalFirst ? { x: from().x, y: from().y + Math.sign(dy) * startOffset } : { x: from().x + Math.sign(dx) * startOffset, y: from().y };
        const corner = isVerticalFirst ? { x: from().x, y: to().y } : { x: to().x, y: from().y };
        const dxFinalLeg = to().x - corner.x;
        const dyFinalLeg = to().y - corner.y;
        const finalLegLength = squareWidth;
        const end = {
          x: corner.x + dxFinalLeg * (finalLegLength - lengthReducer) / finalLegLength,
          y: corner.y + dyFinalLeg * (finalLegLength - lengthReducer) / finalLegLength
        };
        pathD = `M${start.x},${start.y} L${corner.x},${corner.y} L${end.x},${end.y}`;
      } else {
        const start = {
          x: from().x + dx * startOffset / r2,
          y: from().y + dy * startOffset / r2
        };
        const end = {
          x: from().x + dx * (r2 - lengthReducer) / r2,
          y: from().y + dy * (r2 - lengthReducer) / r2
        };
        pathD = `M${start.x},${start.y} L${end.x},${end.y}`;
      }
      const markerId = () => `${ctx.options.id}-arrowhead-${i2()}-${arrow.startSquare}-${arrow.endSquare}`;
      return <>
          <marker
        id={markerId()}
        markerWidth="2"
        markerHeight="2.5"
        refX="1.25"
        refY="1.25"
        orient="auto"
      >
            <polygon points="0.3 0, 2 1.25, 0.3 2.5" fill={arrow.color} />
          </marker>
          <path
        d={pathD}
        fill="none"
        opacity={isArrowActive ? arrowOptions.activeOpacity : arrowOptions.opacity}
        stroke={arrow.color}
        stroke-width={isArrowActive ? arrowOptions.activeArrowWidthMultiplier * (squareWidth / arrowOptions.arrowWidthDenominator) : squareWidth / arrowOptions.arrowWidthDenominator}
        marker-end={`url(#${markerId()})`}
      />
        </>;
    })();
  };
  return <svg
    viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight()}`}
    style={{
      position: "absolute",
      top: "0",
      right: "0",
      bottom: "0",
      left: "0",
      "pointer-events": "none",
      "z-index": "20"
    }}
  >
      <For each={arrowsToDraw()}>{(arrow, i2) => renderArrow(arrow, i2)}</For>
    </svg>;
}

// src/Draggable.tsx
import { createEffect as createEffect2 } from "solid-js";
import { useDraggable } from "@dnd-kit/solid";
function Draggable2(props) {
  const ctx = useChessboardContext();
  const { ref, draggable } = useDraggable({
    id: props.position,
    data: {
      isSparePiece: props.isSparePiece ?? false,
      pieceType: props.pieceType
    }
  });
  createEffect2(() => {
    const allowDragging = ctx.options.allowDragging;
    const canDragPiece = ctx.options.canDragPiece;
    const disabled = !allowDragging || (canDragPiece ? !canDragPiece({
      piece: { pieceType: props.pieceType },
      isSparePiece: props.isSparePiece ?? false,
      square: props.position
    }) : false);
    draggable.disabled = disabled;
  });
  createEffect2(() => {
    draggable.id = props.position;
    draggable.data = {
      isSparePiece: props.isSparePiece ?? false,
      pieceType: props.pieceType
    };
  });
  return <div ref={ref}>{props.children}</div>;
}

// src/Droppable.tsx
import { useDroppable } from "@dnd-kit/solid";
function Droppable2(props) {
  const { ref, isDropTarget } = useDroppable({
    id: props.squareId
  });
  return <div ref={ref}>{props.children({ isOver: isDropTarget })}</div>;
}

// src/Piece.tsx
import { createEffect as createEffect3, createMemo as createMemo3, createSignal as createSignal2 } from "solid-js";
function Piece(props) {
  const ctx = useChessboardContext();
  const [animationStyle, setAnimationStyle] = createSignal2({});
  const cursor = createMemo3(() => {
    if (props.clone) return "grabbing";
    if (!ctx.options.allowDragging || ctx.options.canDragPiece && !ctx.options.canDragPiece({
      piece: { pieceType: props.pieceType },
      isSparePiece: props.isSparePiece ?? false,
      square: props.position
    })) {
      return "pointer";
    }
    return "grab";
  });
  createEffect3(() => {
    const targetSquare = ctx.positionDifferences()[props.position];
    if (!targetSquare) {
      setAnimationStyle({});
      return;
    }
    if (typeof document === "undefined") return;
    const sourceSquare = props.position;
    const squareWidth = document.querySelector(`#${ctx.options.id}-square-${sourceSquare}`)?.getBoundingClientRect().width;
    if (!squareWidth) return;
    const orientation = ctx.options.boardOrientation;
    const duration = ctx.options.animationDurationInMs;
    setAnimationStyle({
      transform: `translate(${(orientation === "black" ? -1 : 1) * (targetSquare.charCodeAt(0) - sourceSquare.charCodeAt(0)) * squareWidth}px, ${(orientation === "black" ? -1 : 1) * (Number(sourceSquare[1]) - Number(targetSquare[1])) * squareWidth}px)`,
      transition: `transform ${duration}ms`,
      position: "relative",
      "z-index": 10
    });
  });
  return <div
    id={`${ctx.options.id}-piece-${props.pieceType}-${props.position}`}
    data-piece={props.pieceType}
    style={{
      ...animationStyle(),
      ...props.clone ? {
        ...defaultDraggingPieceStyle,
        ...ctx.options.draggingPieceStyle
      } : {},
      ...!props.clone && ctx.draggingPiece()?.position === props.position ? {
        ...defaultDraggingPieceGhostStyle,
        ...ctx.options.draggingPieceGhostStyle
      } : {},
      width: "100%",
      height: "100%",
      cursor: cursor(),
      "touch-action": "none"
    }}
    onClick={() => ctx.options.onPieceClick?.({
      isSparePiece: props.isSparePiece ?? false,
      piece: { pieceType: props.pieceType },
      square: props.position
    })}
  >
      {(() => {
    const PieceSvg = ctx.options.pieces[props.pieceType];
    return PieceSvg ? <PieceSvg square={props.position} /> : null;
  })()}
    </div>;
}

// src/Square.tsx
import { Show } from "solid-js";
import { createEffect as createEffect4, createSignal as createSignal3 } from "solid-js";
function Square(props) {
  const [isDrawingArrow, setIsDrawingArrow] = createSignal3(false);
  const [isClickingOnMobile, setIsClickingOnMobile] = createSignal3(false);
  const ctx = useChessboardContext();
  const isOver = () => typeof props.isOver === "function" ? props.isOver() : props.isOver;
  let prevIsOver = false;
  createEffect4(() => {
    const over = isOver();
    const dragging = ctx.draggingPiece();
    const position = ctx.currentPosition();
    if (over && dragging) {
      ctx.options.onMouseOverSquare?.({
        piece: position[props.squareId] ?? null,
        square: props.squareId
      });
    } else if (!over && dragging && prevIsOver) {
      ctx.options.onMouseOutSquare?.({
        piece: position[props.squareId] ?? null,
        square: props.squareId
      });
    }
    prevIsOver = over;
  });
  createEffect4(() => {
    if (ctx.draggingPiece() && isClickingOnMobile()) {
      setIsClickingOnMobile(false);
    }
  });
  const column = () => props.squareId.match(/^[a-z]+/)?.[0];
  const row = () => props.squareId.match(/\d+$/)?.[0];
  return <div
    id={`${ctx.options.id}-square-${props.squareId}`}
    style={{
      ...defaultSquareStyle,
      ...ctx.options.squareStyle,
      ...props.isLightSquare ? {
        ...defaultLightSquareStyle,
        ...ctx.options.lightSquareStyle
      } : { ...defaultDarkSquareStyle, ...ctx.options.darkSquareStyle },
      ...isOver() ? { ...defaultDropSquareStyle, ...ctx.options.dropSquareStyle } : {}
    }}
    data-column={column()}
    data-row={row()}
    data-square={props.squareId}
    onClick={(e2) => {
      if (e2.button === 0) {
        ctx.options.onSquareClick?.({
          piece: ctx.currentPosition()[props.squareId] ?? null,
          square: props.squareId
        });
      }
    }}
    onTouchStart={() => {
      setIsClickingOnMobile(true);
    }}
    onTouchEnd={(e2) => {
      e2.preventDefault();
      const within = isTouchEndWithinSquare(
        ctx.options.id,
        props.squareId,
        e2
      );
      if (within && isClickingOnMobile()) {
        ctx.options.onSquareClick?.({
          piece: ctx.currentPosition()[props.squareId] ?? null,
          square: props.squareId
        });
      }
      setIsClickingOnMobile(false);
    }}
    onContextMenu={(e2) => {
      e2.preventDefault();
      if (!isDrawingArrow()) {
        ctx.options.onSquareRightClick?.({
          piece: ctx.currentPosition()[props.squareId] ?? null,
          square: props.squareId
        });
      }
      setIsDrawingArrow(false);
    }}
    onMouseDown={(e2) => {
      if (e2.button === 0) {
        ctx.clearArrows();
      }
      if (e2.button === 2 && ctx.options.allowDrawingArrows) {
        ctx.setNewArrowStartSquare(props.squareId);
      }
      ctx.options.onSquareMouseDown?.(
        {
          piece: ctx.currentPosition()[props.squareId] ?? null,
          square: props.squareId
        },
        e2
      );
    }}
    onMouseUp={(e2) => {
      if (e2.button === 2) {
        if (ctx.options.allowDrawingArrows && ctx.newArrowStartSquare() && ctx.newArrowStartSquare() !== props.squareId) {
          setIsDrawingArrow(true);
          ctx.drawArrow(props.squareId, {
            shiftKey: e2.shiftKey,
            ctrlKey: e2.ctrlKey,
            altKey: e2.altKey,
            metaKey: e2.metaKey
          });
        } else if (ctx.newArrowStartSquare() === props.squareId) {
          ctx.setNewArrowStartSquare(null);
          ctx.setNewArrowOverSquare(null);
        }
      }
      ctx.options.onSquareMouseUp?.(
        {
          piece: ctx.currentPosition()[props.squareId] ?? null,
          square: props.squareId
        },
        e2
      );
    }}
    onMouseOver={(e2) => {
      if (e2.buttons === 2 && ctx.options.allowDrawingArrows && ctx.newArrowStartSquare() && ctx.newArrowStartSquare() !== props.squareId) {
        ctx.setNewArrowOverSquare(props.squareId, {
          shiftKey: e2.shiftKey,
          ctrlKey: e2.ctrlKey,
          altKey: e2.altKey,
          metaKey: e2.metaKey
        });
      } else if (ctx.newArrowStartSquare() === props.squareId) {
        ctx.setNewArrowOverSquare(null);
      }
      if (!ctx.draggingPiece()) {
        ctx.options.onMouseOverSquare?.({
          piece: ctx.currentPosition()[props.squareId] ?? null,
          square: props.squareId
        });
      }
    }}
    onMouseLeave={() => {
      if (!ctx.draggingPiece()) {
        ctx.options.onMouseOutSquare?.({
          piece: ctx.currentPosition()[props.squareId] ?? null,
          square: props.squareId
        });
      }
    }}
  >
      <Show when={ctx.options.showNotation}>
        <span
    style={props.isLightSquare ? {
      ...defaultLightSquareNotationStyle,
      ...ctx.options.lightSquareNotationStyle
    } : {
      ...defaultDarkSquareNotationStyle,
      ...ctx.options.darkSquareNotationStyle
    }}
  >
          <Show
    when={row() === (ctx.options.boardOrientation === "white" ? "1" : ctx.options.chessboardRows.toString())}
  >
            <span
    style={{
      ...defaultAlphaNotationStyle,
      ...ctx.options.alphaNotationStyle
    }}
  >
              {column()}
            </span>
          </Show>
          <Show
    when={column() === (ctx.options.boardOrientation === "white" ? "a" : columnIndexToChessColumn(
      0,
      ctx.options.chessboardColumns,
      ctx.options.boardOrientation
    ))}
  >
            <span
    style={{
      ...defaultNumericNotationStyle,
      ...ctx.options.numericNotationStyle
    }}
  >
              {row()}
            </span>
          </Show>
        </span>
      </Show>

      {ctx.options.squareRenderer?.({
    piece: ctx.currentPosition()[props.squareId] ?? null,
    square: props.squareId,
    children: props.children
  }) || <div
    style={{
      width: "100%",
      height: "100%",
      ...ctx.options.squareStyles[props.squareId]
    }}
  >
          {props.children}
        </div>}
    </div>;
}

// src/Board.tsx
function Board() {
  const ctx = useChessboardContext();
  return <>
      <div
    id={`${ctx.options.id}-board`}
    style={{
      ...defaultBoardStyle(ctx.options.chessboardColumns),
      ...ctx.options.boardStyle
    }}
  >
        <For2 each={ctx.board()}>
          {(row) => <For2 each={row}>
              {(square) => <Droppable2 squareId={square.squareId}>
                  {({ isOver }) => <Square
    squareId={square.squareId}
    isLightSquare={square.isLightSquare}
    isOver={isOver}
  >
                      <Show2
    when={ctx.currentPosition()[square.squareId]}
  >
                        {(piece) => <Draggable2
    isSparePiece={false}
    position={square.squareId}
    pieceType={piece().pieceType}
  >
                            <Piece
    position={square.squareId}
    pieceType={piece().pieceType}
  />
                          </Draggable2>}
                      </Show2>
                    </Square>}
                </Droppable2>}
            </For2>}
        </For2>

        <Arrows />
      </div>

      <DragOverlay dropAnimation={null}>
        <Show2 when={ctx.draggingPiece()}>
          {(dragging) => <Piece
    clone
    position={dragging().position}
    pieceType={dragging().pieceType}
  />}
        </Show2>
      </DragOverlay>
    </>;
}

// src/Chessboard.tsx
function Chessboard(props) {
  const ctx = useChessboardContext();
  const forwarded = createMemo4(() => ({ ...props.options }));
  if (ctx?.isWrapped) {
    return <Board />;
  }
  return <ChessboardProvider options={forwarded()}>
      <Board />
    </ChessboardProvider>;
}

// src/SparePiece.tsx
function SparePiece(props) {
  return <Draggable2
    isSparePiece
    position={props.pieceType}
    pieceType={props.pieceType}
  >
      <Piece
    isSparePiece
    pieceType={props.pieceType}
    position={props.pieceType}
  />
    </Draggable2>;
}
export {
  Chessboard,
  ChessboardProvider,
  SparePiece,
  chessColumnToColumnIndex,
  chessRowToRowIndex,
  columnIndexToChessColumn,
  defaultAlphaNotationStyle,
  defaultArrowOptions,
  defaultBoardStyle,
  defaultDarkSquareNotationStyle,
  defaultDarkSquareStyle,
  defaultDraggingPieceGhostStyle,
  defaultDraggingPieceStyle,
  defaultDropSquareStyle,
  defaultLightSquareNotationStyle,
  defaultLightSquareStyle,
  defaultNumericNotationStyle,
  defaultPieces,
  defaultSquareStyle,
  fenStringToPositionObject,
  generateBoard,
  getPositionUpdates,
  getPromotionUpdates,
  getRelativeCoords,
  isTouchEndWithinSquare,
  rowIndexToChessRow,
  useChessboardContext
};
