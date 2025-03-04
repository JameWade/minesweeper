"use client";

import type { NextPage } from "next";
import { MinesweeperGame } from "~~/components/minesweeper/MinesweeperGame";

const Minesweeper: NextPage = () => {
  return (
    <div className="flex flex-col items-center py-8">
      <h1 className="text-4xl font-bold mb-8">Minesweeper</h1>
      <MinesweeperGame />
    </div>
  );
};

export default Minesweeper;
