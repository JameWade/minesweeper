"use client";

import { MinesweeperGame } from "~~/components/minesweeper/MinesweeperGame";

export default function MinesweeperPage() {
  return (
    <div className="flex flex-col items-center py-8">
      <h1 className="text-4xl font-bold mb-8">Minesweeper</h1>
      <MinesweeperGame />
    </div>
  );
}
