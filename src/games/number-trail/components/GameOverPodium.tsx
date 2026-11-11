"use client";

import { useState } from "react";
import { GamePlayer } from "../types";
import { ConfettiEffect } from "./ConfettiEffect";
import {
  TrophyIcon,
  StarIcon,
  FlameIcon,
  AnimalAvatarBadge,
  CheckIcon,
} from "./GameIcons";

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
    <div className="relative w-full rounded-[36px] border border-[#dbe4f1] bg-white p-6 sm:p-10 shadow-lg text-center overflow-hidden">
      <ConfettiEffect count={120} />

      {/* Header banner */}
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#fef3c7] border border-[#f59e0b]/30 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-[#b45309]">
          <TrophyIcon className="h-4 w-4 text-amber-600" />
          <span>Trail Completed!</span>
        </span>
        <h1 className="mt-3 font-[family-name:var(--font-fredoka)] text-4xl sm:text-5xl lg:text-6xl font-black text-[#002f76]">
          Victory Celebration!
        </h1>
        <p className="mt-2 text-sm sm:text-base font-semibold text-[#57719b]">
          Everyone did an extraordinary job counting on the Number Trail!
        </p>
      </div>

      {/* Podium Display (1st, 2nd, 3rd) */}
      <div className="relative z-10 mt-10 flex justify-center items-end gap-3 sm:gap-8 min-h-[240px]">
        {/* 2nd Place */}
        {players[1] && (
          <div className="flex flex-col items-center w-32 sm:w-44 animate-fade-in-up">
            <AnimalAvatarBadge
              name={players[1].petName || players[1].name}
              color={players[1].color}
              bgLight={players[1].bgLight}
              borderColor={players[1].borderColor}
              className="h-16 w-16 mb-2 shadow-md"
            />
            <span className="text-sm font-black text-[#1e293b] truncate max-w-full">
              {players[1].name}
            </span>
            <span className="text-xs font-bold text-[#64748b]">
              {players[1].score} pts
            </span>
            <div className="mt-3 w-full h-28 rounded-t-3xl border-t-4 border-slate-300 bg-slate-100 flex flex-col items-center justify-center shadow-inner">
              <span className="text-3xl font-black text-slate-500">2</span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Silver
              </span>
            </div>
          </div>
        )}

        {/* 1st Place (Champion) */}
        {winner && (
          <div className="flex flex-col items-center w-36 sm:w-52 animate-bounce">
            <AnimalAvatarBadge
              name={winner.petName || winner.name}
              color={winner.color}
              bgLight={winner.bgLight}
              borderColor={winner.borderColor}
              className="h-20 w-20 mb-2 shadow-lg ring-4 ring-amber-300"
            />
            <span className="text-base sm:text-lg font-black text-[#002f76] truncate max-w-full">
              {winner.name}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#d97706]">
              <StarIcon className="h-3.5 w-3.5" />
              <span>{winner.score} pts</span>
            </span>
            <div className="mt-3 w-full h-40 rounded-t-3xl border-t-4 border-[#f59e0b] bg-gradient-to-b from-[#fef3c7] to-[#fde68a] flex flex-col items-center justify-center shadow-md">
              <TrophyIcon className="h-7 w-7 text-[#b45309] mb-0.5" />
              <span className="text-3xl font-black text-[#b45309]">1</span>
              <span className="text-xs font-black text-[#b45309] uppercase tracking-wider">
                Champion
              </span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {players[2] && (
          <div className="flex flex-col items-center w-32 sm:w-44 animate-fade-in-up">
            <AnimalAvatarBadge
              name={players[2].petName || players[2].name}
              color={players[2].color}
              bgLight={players[2].bgLight}
              borderColor={players[2].borderColor}
              className="h-16 w-16 mb-2 shadow-md"
            />
            <span className="text-sm font-black text-[#1e293b] truncate max-w-full">
              {players[2].name}
            </span>
            <span className="text-xs font-bold text-[#64748b]">
              {players[2].score} pts
            </span>
            <div className="mt-3 w-full h-22 rounded-t-3xl border-t-4 border-amber-600/40 bg-amber-50/80 flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-amber-800">3</span>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Bronze
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Full Leaderboard Table (Full Width) */}
      <div className="relative z-10 mt-10 rounded-3xl border border-[#e2e8f0] bg-white overflow-hidden shadow-xs">
        <div className="bg-[#f8fafc] px-6 py-3.5 border-b border-[#e2e8f0] text-left">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#002f76]">
            Round Summary ({roundsTotal} Steps)
          </h3>
        </div>
        <div className="divide-y divide-[#f1f5f9]">
          {players.map((p, idx) => (
            <div
              key={p.name + idx}
              className="flex items-center justify-between px-6 py-3.5 text-left"
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1f5f9] text-xs font-black text-[#475569]">
                  {p.rank || idx + 1}
                </span>
                <AnimalAvatarBadge
                  name={p.petName || p.name}
                  color={p.color}
                  bgLight={p.bgLight}
                  borderColor={p.borderColor}
                  className="h-10 w-10"
                />
                <div>
                  <span className="block font-black text-[#1e293b] text-sm">
                    {p.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#64748b]">
                    <span>{p.correctCount} correct</span>
                    <span>•</span>
                    <span>{p.mistakesCount} hints</span>
                    {p.maxStreak > 1 && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5 text-amber-600 font-bold">
                          <FlameIcon className="h-3 w-3" />
                          <span>{p.maxStreak} streak</span>
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-[#002f76]">
                  {p.score} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Teacher Notes & Save Session Section (Full Width) */}
      <div className="relative z-10 mt-6 rounded-3xl border border-[#dbe4f1] bg-[#f8fafc] p-6 text-left">
        <label
          htmlFor="teacher-notes"
          className="block text-xs font-black uppercase tracking-wider text-[#002f76] mb-1.5"
        >
          Teacher / Admin Notes (Optional)
        </label>
        <textarea
          id="teacher-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Children showed great confidence with 1-to-1 counting. Excellent team spirit!"
          className="w-full rounded-2xl border border-[#cbd5e1] bg-white p-3.5 text-xs text-[#1e293b] focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/20"
          rows={2}
          disabled={hasSaved}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#64748b]">
            {hasSaved
              ? "✓ Session recorded in database!"
              : "Save this session to track your playgroup’s progress."}
          </span>
          <button
            type="button"
            onClick={() => onSaveSession(notes)}
            disabled={isSaving || hasSaved}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider shadow-xs transition ${
              hasSaved
                ? "bg-emerald-600 text-white cursor-default"
                : "bg-[#002f76] text-white hover:bg-[#002358] active:scale-95"
            }`}
          >
            {isSaving ? (
              "Saving..."
            ) : hasSaved ? (
              <>
                <CheckIcon className="h-4 w-4" />
                <span>Saved to Database</span>
              </>
            ) : (
              "Save Game Session"
            )}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#ffbf1f] px-7 py-3.5 text-sm font-black text-[#173764] shadow-md transition hover:bg-[#ffd04a] active:scale-95"
        >
          Play Again (Same Explorers)
        </button>
        <button
          type="button"
          onClick={onNewGameSetup}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-[#cbd5e1] bg-white px-7 py-3.5 text-sm font-black text-[#002f76] shadow-xs transition hover:bg-[#f8fafc] active:scale-95"
        >
          Change Players / Settings
        </button>
      </div>
    </div>
  );
}
