"use client";

import { useState } from "react";
import { GamePlayer } from "../types";
import { ConfettiEffect } from "./ConfettiEffect";
import { AnimalAvatarBadge, CheckIcon, FlameIcon, TrophyIcon } from "./GameIcons";

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
  const teamScore = players.reduce((total, player) => total + player.score, 0);

  return (
    <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/80 bg-gradient-to-br from-[#f5fbff] via-white to-[#fff9e9] p-3 shadow-[0_24px_65px_rgba(17,55,92,.2)] sm:p-5 lg:p-6">
      <ConfettiEffect count={100} />
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-amber-200/30 blur-2xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-sky-200/35 blur-2xl" />

      <div className="relative z-10 space-y-4">
        <header className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#063b83] via-[#075b9f] to-[#087f83] px-5 py-5 text-center text-white shadow-lg sm:px-8 sm:py-6">
          <span aria-hidden="true" className="absolute -right-5 -top-8 text-8xl opacity-15">🌟</span>
          <span aria-hidden="true" className="absolute bottom-1 left-5 text-4xl opacity-30">✨</span>
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-100/70 bg-amber-100 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-amber-900 shadow-sm sm:text-xs">
              <TrophyIcon className="h-4 w-4 text-amber-700" /> Trail complete!
            </span>
            <h1 className="mt-2 font-[family-name:var(--font-fredoka)] text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Everyone is a champion!
            </h1>
            <p className="mx-auto mt-1 max-w-2xl text-sm font-semibold text-sky-50/95 sm:text-base">
              You all finished every step of the Number Trail together!
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold text-white">🪨 {roundsTotal} trail steps</span>
              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold text-white">🐾 {players.length} explorer{players.length === 1 ? "" : "s"}</span>
              <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-bold text-white">⭐ {teamScore} team stars</span>
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.05fr)_minmax(260px,.95fr)]">
          <article className="relative overflow-hidden rounded-[26px] border-2 border-amber-300 bg-gradient-to-br from-[#fff6d8] via-[#ffedb4] to-[#ffe298] p-4 shadow-md sm:p-5">
            <span aria-hidden="true" className="pointer-events-none absolute -right-2 -top-4 text-7xl opacity-25">🏆</span>
            <span className="inline-flex rounded-full bg-amber-700 px-3 py-1 text-[10px] font-black uppercase tracking-[.14em] text-white shadow-sm">🏆 Trailblazer champion crew</span>
            <h2 className="mt-2 font-[family-name:var(--font-fredoka)] text-2xl font-black leading-tight text-[#58320a] sm:text-3xl">You reached the treasure together!</h2>
            <div className="relative mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 sm:justify-start">
              {players.map((player, index) => (
                <div key={`${player.studentId ?? player.name}-${index}`} className="flex min-w-[74px] flex-col items-center gap-1">
                  <span className="rounded-[22px] bg-white/70 p-1.5 shadow-sm ring-2 ring-white/80">
                    <AnimalAvatarBadge
                      name={player.petName || player.name}
                      color={player.color}
                      bgLight={player.bgLight}
                      borderColor={player.borderColor}
                      className="h-14 w-14 sm:h-16 sm:w-16"
                    />
                  </span>
                  <span className="max-w-24 truncate text-xs font-black text-amber-950">{player.name}</span>
                  <span className="text-[9px] font-black uppercase tracking-wide text-amber-800">Champion</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="flex flex-col justify-center rounded-[26px] border border-sky-200 bg-white/90 p-4 shadow-sm sm:p-5">
            <h2 className="flex items-center gap-2 font-[family-name:var(--font-fredoka)] text-xl font-black text-[#123f72]">
              <span>🌈</span> A team adventure!
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">Every explorer made it all the way. Celebrate the great teamwork!</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-sky-50 p-3 text-center"><span className="block text-2xl">🪨</span><span className="mt-1 block text-xs font-black text-sky-900">{roundsTotal} steps each</span></div>
              <div className="rounded-2xl bg-amber-50 p-3 text-center"><span className="block text-2xl">⭐</span><span className="mt-1 block text-xs font-black text-amber-900">{teamScore} team stars</span></div>
            </div>
          </aside>
        </div>

        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/95 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50 px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-[.13em] text-[#123f72]">Team trail scorecard</h2>
            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-500 shadow-sm">Great effort, everyone!</span>
          </div>
          <div className="divide-y divide-slate-100">
            {players.map((player, index) => (
              <div key={`${player.studentId ?? player.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-left sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
                  <AnimalAvatarBadge
                    name={player.petName || player.name}
                    color={player.color}
                    bgLight={player.bgLight}
                    borderColor={player.borderColor}
                    className="h-10 w-10 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-800">{player.name}</span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                      <span>{player.correctCount} correct</span><span>·</span><span>{player.mistakesCount} hints</span>
                      {player.maxStreak > 1 && <><span>·</span><span className="inline-flex items-center gap-0.5 font-bold text-amber-600"><FlameIcon className="h-3 w-3" />{player.maxStreak} streak</span></>}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-800 sm:inline-flex">Champion</span>
                  <span className="text-sm font-black text-[#123f72] sm:text-base">{player.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-sky-200 bg-white/85 p-4 shadow-sm sm:p-5">
          <label htmlFor="teacher-notes" className="mb-1.5 block text-[10px] font-black uppercase tracking-[.13em] text-[#123f72]">Playgroup notes <span className="font-semibold normal-case tracking-normal text-slate-400">(optional)</span></label>
          <textarea
            id="teacher-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What did the children enjoy or learn on the trail?"
            className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100"
            rows={2}
            disabled={hasSaved}
          />
          <div className="mt-3 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <span className={`text-xs font-bold ${hasSaved ? "text-emerald-700" : "text-slate-500"}`}>
              {hasSaved ? "✓ Session saved — your playgroup’s progress is recorded." : "Save this adventure to remember your playgroup’s progress."}
            </span>
            <button
              type="button"
              onClick={() => onSaveSession(notes)}
              disabled={isSaving || hasSaved}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black shadow-sm transition ${hasSaved ? "cursor-default bg-emerald-600 text-white" : "bg-[#073d82] text-white hover:bg-[#052e63] active:scale-[.98]"}`}
            >
              {isSaving ? "Saving…" : hasSaved ? <><CheckIcon className="h-4 w-4" /> Saved</> : "Save session"}
            </button>
          </div>
        </section>

        <div className="flex flex-wrap justify-center gap-3 pt-1">
          <button type="button" onClick={onPlayAgain} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 px-6 py-3 text-sm font-black text-amber-950 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
            <span>🔁</span> Play again
          </button>
          <button type="button" onClick={onNewGameSetup} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-sky-200 bg-white px-6 py-3 text-sm font-black text-[#073d82] shadow-sm transition hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50 active:translate-y-0">
            <span>🧭</span> New adventure
          </button>
        </div>
      </div>
    </section>
  );
}
