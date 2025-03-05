"use client";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import React from "react";

export const Header = () => {
  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="flex-1">
        <h1 className="text-2xl font-bold">Minesweeper</h1>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <RainbowKitCustomConnectButton />
        {<FaucetButton />}
      </div>
    </div>
  );
};
