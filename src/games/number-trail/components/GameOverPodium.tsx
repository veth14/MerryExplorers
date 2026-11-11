"use client";

import { useState } from "react";
import { GamePlayer } from "../types";
import { ConfettiEffect } from "./ConfettiEffect";

type GameOverPodiumProps = {
  players: GamePlayer[];
  roundsTotal: number;
  onPlayAgain: () => void;
  onNewGameSetup: () => void;
  onSaveSession: (notes: string) => Promise<boolean>;
  isSaving?: boolean;
  hasSaved?: boolean;
};

export function GameOverPodium({
  players,
  roundsTotal,
  onPlayAgain,
  onNewGameSetup,
  onSaveSession,
  isSaving = false,
  hasSaved = false,
}: GameOverPodiumProps) {
  const [notes, setNotes] = useState("");
  const winner = players[0];

  return (
    <div className="relative w-full max-w-4xl mx-auto rounded-[32px] border-2 border-[#dbe4f1] bg-white p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,47,118,0.1)] text-center overflow-hidden">
      {/* Confetti blast */}
      <ConfettiEffect count={120} />

      {/* Header banner */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fef3c7] border border-[#f59e0b]/30 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#b45309]">
          🏆 Trail Completed! 🏆
        </span>
        <h1 className="mt-3 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl font-black text-[#002f76]">
          Victory Celebration!
        </h1>
        <p className="mt-2 text-sm sm:text-base font-semibold text-[#57719b]">
          Everyone did an extraordinary job counting on the Number Trail!
        </p>
      </div>

      {/* Podium Display (1st, 2nd, 3rd) */}
      <div className="relative z-10 mt-8 flex justify-center items-end gap-3 sm:gap-6 min-h-[220px]">
        {/* 2nd Place (if at least 2 players) */}
        {players[1] && (
          <div className="flex flex-col items-center w-28 sm:w-36 animate-fade-in-up">
            <span className="text-3xl sm:text-4xl mb-1">{players[1].avatar}</span>
            <span className="text-xs sm:text-sm font-black text-[#1e293b] truncate max-w-full">
              {players[1].name}
            </span>
            <span className="text-[11px] font-bold text-[#64748b]">
              {players[1].score} pts
            </span>
            <div className="mt-2 w-full h-24 rounded-t-2xl border-t-4 border-slate-300 bg-slate-100 flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-slate-500">2</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Silver</span>
            </div>
          </div>
        )}

        {/* 1st Place (Winner) */}
        {winner && (
          <div className="flex flex-col items-center w-32 sm:w-44 animate-bounce">
            <span className="text-5xl sm:text-6xl mb-2">{winner.avatar}</span>
            <span className="text-sm sm:text-base font-black text-[#002f76] truncate max-w-full">
              {winner.name}
            </span>
            <span className="text-xs font-extrabold text-[#d97706]">
              ⭐ {winner.score} pts
            </span>
            <div className="mt-2 w-full h-36 rounded-t-2xl border-t-4 border-[#f59e0b] bg-gradient-to-b from-[#fef3c7] to-[#fde68a] flex flex-col items-center justify-center shadow-md">
              <span className="text-4xl font-black text-[#b45309]">1</span>
              <span className="text-xs font-black text-[#b45309] uppercase tracking-wider">
                👑 Champion
              </span>
            </div>
          </div>
        )}

        {/* 3rd Place (if at least 3 players) */}
        {players[2] && (
          <div className="flex flex-col items-center w-28 sm:w-36 animate-fade-in-up">
            <span className="text-3xl sm:text-4xl mb-1">{players[2].avatar}</span>
            <span className="text-xs sm:text-sm font-black text-[#1e293b] truncate max-w-full">
              {players[2].name}
            </span>
            <span className="text-[11px] font-bold text-[#64748b]">
              {players[2].score} pts
            </span>
            <div className="mt-2 w-full h-18 rounded-t-2xl border-t-4 border-amber-600/40 bg-amber-50 flex flex-col items-center justify-center shadow-inner">
              <span className="text-xl font-black text-amber-800">3</span>
              <span className="text-[10px] font-bold text-amber-800 uppercase">Bronze</span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table */}
      <div className="relative z-10 mt-8 rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden shadow-sm">
        <div className="bg-[#f8fafc] px-4 py-3 border-b border-[#e2e8f0] text-left">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76]">
            Round Summary ({roundsTotal} Steps)
          </h3>
        </div>
        <div className="divide-y divide-[#f1f5f9]">
          {players.map((p, idx) => (
            <div
              key={p.name + idx}
              className="flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f5f9] text-xs font-black text-[#475569]">
                  {p.rank || idx + 1}
                </span>
                <span className="text-2xl">{p.avatar}</span>
                <div>
                  <span className="block font-black text-[#1e293b] text-sm">
                    {p.name}
                  </span>
                  <span className="text-xs text-[#64748b]">
                    {p.correctCount} correct • {p.mistakesCount} hints • {p.maxStreak} max streak
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-[#002f76]">
                  {p.score} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Notes & Save Session Section */}
      <div className="relative z-10 mt-6 rounded-2xl border border-[#dbe4f1] bg-[#f8fafc] p-4 text-left">
        <label
          htmlFor="teacher-notes"
          className="block text-xs font-black uppercase tracking-wider text-[#002f76] mb-1"
        >
          Teacher / Admin Notes (Optional)
        </label>
        <textarea
          id="teacher-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Mia excelled at counting by 2s; Leo needed gentle encouragement with sequence questions."
          className="w-full rounded-xl border border-[#cbd5e1] bg-white p-3 text-xs text-[#1e293b] focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20"
          rows={2}
          disabled={hasSaved}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[#64748b]">
            {hasSaved
              ? "✓ Session recorded in database!"
              : "Save this session to track student progress."}
          </span>
          <button
            type="button"
            onClick={() => onSaveSession(notes)}
            disabled={isSaving || hasSaved}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider shadow-sm transition ${
              hasSaved
                ? "bg-emerald-600 text-white cursor-default"
                : "bg-[#002f76] text-white hover:bg-[#002358] active:scale-95"
            }`}
          >
            {isSaving ? "Saving..." : hasSaved ? "✓ Saved" : "💾 Save Game Session"}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#ffbf1f] px-6 py-3 text-sm font-black text-[#173764] shadow-md transition hover:bg-[#ffd04a] active:scale-95"
        >
          🔄 Play Again (Same Explorers)
        </button>
        <button
          type="button"
          onClick={onNewGameSetup}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-[#cbd5e1] bg-white px-6 py-3 text-sm font-black text-[#002f76] shadow-sm transition hover:bg-[#f8fafc] active:scale-95"
        >
          ⚙️ Change Players / Modes
        </button>
      </div>
    </div>
  );
}

