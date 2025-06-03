import React, { useState } from "react";
import { LeaderboardEntry } from "./types";
import { ConfigProvider, Pagination, theme } from 'antd';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard = ({ entries }: LeaderboardProps) => {
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const totalEntries = entries.length;

  const paginatedEntries = entries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
          <div className="flex justify-center mt-6">
            <ConfigProvider
              theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                  colorPrimary: '#9333ea',
                  colorBgContainer: 'rgba(147, 51, 234, 0.1)',
                  colorText: 'rgb(216, 180, 254)',
                  colorBorder: 'transparent',
                  borderRadius: 8,
                },
              }}
            >
              <Pagination
                current={currentPage}
                onChange={setCurrentPage}
                total={totalEntries}
                pageSize={PAGE_SIZE}
                size="small"
                showSizeChanger={false}
              />
            </ConfigProvider>
          </div>
        </>
      )}
    </div>
  );
};