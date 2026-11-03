"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const INTERACTIVE_SELECTOR = "a[href], button:not(:disabled), [role='button']:not([aria-disabled='true']), input[type='button'], input[type='submit'], input[type='reset'], input[type='checkbox'], input[type='radio'], summary, select, label[for]";
const TEXT_SELECTOR = "input:not([type='button']):not([type='submit']):not([type='checkbox']):not([type='radio']), textarea, [contenteditable='true']";

export function PublicCursor() {
  const [ready, setReady] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (!ready) return;

    const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!hasFinePointer) return;

    const cursor = cursorRef.current;
    if (!cursor) return;

    document.body.classList.add("public-cursor-enabled");

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.classList.add("is-visible");
    };

    const handleOver = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      cursor.classList.toggle("is-interactive", Boolean(event.target.closest(INTERACTIVE_SELECTOR)));
      cursor.classList.toggle("is-input", Boolean(event.target.closest(TEXT_SELECTOR)));
    };

    const handleOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) cursor.classList.remove("is-visible");
    };

    const handleDown = () => cursor.classList.add("is-pressed");
    const handleUp = () => cursor.classList.remove("is-pressed");

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerover", handleOver);
    document.addEventListener("pointerout", handleOut);
    document.addEventListener("pointerdown", handleDown);
    document.addEventListener("pointerup", handleUp);

    return () => {
      document.body.classList.remove("public-cursor-enabled");
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerover", handleOver);
      document.removeEventListener("pointerout", handleOut);
      document.removeEventListener("pointerdown", handleDown);
      document.removeEventListener("pointerup", handleUp);
    };
  }, [ready]);

  if (!ready || typeof document === "undefined") return null;

  return createPortal(
    <div ref={cursorRef} className="public-cursor" aria-hidden="true">
      <svg viewBox="0 0 34 40" className="public-cursor__arrow">
        <path
          d="M3.5 2.5 30.5 20 18.6 22.8l7 12.3-5.7 3.1-7-12.2-7.7 9.4L3.5 2.5Z"
          fill="#FFC107"
          stroke="#0033A0"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="m8 9 1.2 16.8 3.4-4.2 6.2 1.2L8 9Z" fill="#FFFDF5" opacity=".9" />
      </svg>
      <svg viewBox="0 0 36 40" className="public-cursor__hand">
        <path
          d="M11.2 18.3V8.1a3 3 0 0 1 6 0v8.2-3.1a2.8 2.8 0 0 1 5.6 0v2.1a2.7 2.7 0 0 1 5.4 0v3a2.6 2.6 0 0 1 5.2.2v7.2c0 6.4-4.9 11.3-11.1 11.3h-2.2c-3.1 0-5.9-1.5-7.6-4.1l-6.1-9a2.8 2.8 0 0 1 4.6-3.2l2.9 3.3v-5.7Z"
          fill="#fffdf5"
          stroke="#0033A0"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M11.2 8.1a3 3 0 0 1 6 0v4.1h-6V8.1Z" fill="#FFC107" />
      </svg>
    </div>,
    document.body
  );
}
