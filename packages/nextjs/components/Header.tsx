"use client";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import React from "react";
import { useMinesweeper } from "~~/hooks/useMinesweeper";

export const Header = () => {

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start">
        <h1 className="text-3xl font-bold ml-4 bg-gradient-to-r from-purple-500 to-purple-300 bg-clip-text text-transparent">
          Minesweeper
        </h1>
      </div>
     
      <div className="navbar-end">
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};
