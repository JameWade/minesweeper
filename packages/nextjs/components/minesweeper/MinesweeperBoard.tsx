import { Cell } from "./types";

interface MinesweeperBoardProps {
  board: Cell[][];
  onCellClick: (x: number, y: number) => void;
  onCellRightClick: (x: number, y: number) => void;
}

export const MinesweeperBoard = ({ board, onCellClick, onCellRightClick }: MinesweeperBoardProps) => {
  const getCellContent = (cell: Cell) => {
    if (!cell.isRevealed) {
      return cell.isFlagged ? "🚩" : "";
    }
    if (cell.isMine) {
      return "💣";
    }
    return cell.adjacentMines || "";
  };

  const getCellColor = (cell: Cell) => {
    if (!cell.isRevealed) return "bg-base-300";
    if (cell.isMine) return "bg-error";
    return "bg-base-200";
  };

  const getNumberColor = (number: number) => {
    const colors = [
      "text-blue-500",   // 1
      "text-green-500",  // 2
      "text-red-500",    // 3
      "text-purple-500", // 4
      "text-yellow-500", // 5
      "text-pink-500",   // 6
      "text-orange-500", // 7
      "text-gray-500",   // 8
    ];
    return colors[number - 1] || "";
  };

  return (
    <div className="grid gap-1 p-4 bg-base-100 rounded-lg shadow-xl">
      {board.map((row, y) => (
        <div key={y} className="flex gap-1">
          {row.map((cell, x) => (
            <button
              key={`${x}-${y}`}
              className={`
                w-8 h-8 flex items-center justify-center
                font-bold rounded-md transition-colors
                ${getCellColor(cell)}
                ${cell.isRevealed && cell.adjacentMines > 0 ? getNumberColor(cell.adjacentMines) : ""}
                hover:opacity-80
              `}
              onClick={() => onCellClick(x, y)}
              onContextMenu={e => {
                e.preventDefault();
                console.log("Context menu event triggered");
                onCellRightClick(x, y);
              }}
              disabled={cell.isRevealed}
            >
              {getCellContent(cell)}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
