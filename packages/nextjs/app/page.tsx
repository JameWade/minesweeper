"use client";

import { MinesweeperGame } from "~~/components/minesweeper/MinesweeperGame";

const Home = () => {
  return (
    <main className="flex flex-col items-center min-h-screen py-10">
      <MinesweeperGame />
    </main>
  );
};

export default Home;
