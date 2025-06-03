import React from "react";

const GameTips = () => {
  return (
    <div className="w-80 bg-purple-600/20 p-4 rounded-2xl backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        📖 <span className="bg-gradient-to-r from-purple-500 to-purple-300 bg-clip-text text-transparent">Game Guide</span>
      </h2>
      <ul className="space-y-3">
        <li className="p-3 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors text-gray-300 text-sm break-words">
          Transfer MON to abstract account for gas fee (~0.4 MON/game)
        </li>
        <li className="p-3 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors text-gray-300 text-sm break-words">
          Auto-submit after 5 clicks or submit manually
        </li>
        <li className="p-3 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors text-gray-300 text-sm break-words">
          Left click to reveal, right click to flag, win to mint NFT
        </li>
        <li className="p-3 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors text-gray-300 text-sm break-words">
          Base 100pts, +2pts/s under 5min, +1pt/s under 6min, -1pt/s overtime
        </li>
      </ul>
    </div>
  );
};

export default GameTips; 