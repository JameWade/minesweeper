import React, { useState } from "react";
import { LeaderboardEntry } from "./types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard = ({ entries }: LeaderboardProps) => {
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(entries.length / PAGE_SIZE);

  const paginatedEntries = entries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePrev = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="bg-purple-600/20 p-4 rounded-2xl backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        🏆 <span className="bg-gradient-to-r from-purple-500 to-purple-300 bg-clip-text text-transparent">Leaderboard</span>
      </h2>
      {entries.length === 0 ? (
        <div className="text-center text-gray-500">No scores yet</div>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedEntries.map((entry, index) => (
              <div
                key={entry.address}
                className="flex justify-between items-center p-3 bg-purple-500/10 rounded-xl hover:bg-purple-500/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-purple-300">#{(currentPage - 1) * PAGE_SIZE + index + 1}</span>
                  <span className="text-gray-300">
                    {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                  </span>
                </div>
                <span className="font-mono text-purple-200">{entry.score}</span>
              </div>
            ))}
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              onClick={handlePrev}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${currentPage === 1 ? 'bg-gray-400/30 text-gray-400 cursor-not-allowed' : 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/40'}`}
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageClick(i + 1)}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${currentPage === i + 1 ? 'bg-purple-400 text-white' : 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/40'}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${currentPage === totalPages ? 'bg-gray-400/30 text-gray-400 cursor-not-allowed' : 'bg-purple-500/20 text-purple-200 hover:bg-purple-500/40'}`}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
}; 