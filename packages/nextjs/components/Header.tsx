"use client";
import { FaucetButton } from "~~/components/scaffold-eth";
import { AccountKitButton } from "~~/components/account-kit/AccountKitButton";
import React from "react";
import { useMinesweeper } from "~~/hooks/useMinesweeper";
import { getRandomBytes } from "~~/utils/scaffold-eth";

export const Header = () => {
  const { startNewGame } = useMinesweeper();

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start">
        <h1 className="text-3xl font-bold ml-4 bg-gradient-to-r from-purple-500 to-purple-300 bg-clip-text text-transparent">
          Minesweeper
        </h1>
      </div>
      <div className="navbar-center">
        <button className="btn btn-primary btn-sm" onClick={() => startNewGame(getRandomBytes())}>
          Start Game
        </button>
      </div>
      <div className="navbar-end">
        <AccountKitButton />
        <FaucetButton />
      </div>
    </div>
  );
};
