"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * A slim top progress bar that animates on every page navigation,
 * giving the user immediate visual feedback that the page is loading.
 */
export function PageProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Start a new progress animation
    setVisible(true);
    setProgress(15);

    // Quickly jump to 40%, then slowly to 85%
    timerRef.current = setTimeout(() => setProgress(40), 100);
    const t2 = setTimeout(() => setProgress(65), 400);
    const t3 = setTimeout(() => setProgress(85), 900);

    return () => {
      clearTimeout(timerRef.current!);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  // When progress hits 85, finish it
  useEffect(() => {
    if (progress === 85) {
      const t = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [progress]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] h-[3px] pointer-events-none"
      style={{
        background: "transparent",
      }}
    >
      <div
        className="h-full bg-gradient-to-r from-[#ffb800] via-[#0050d5] to-[#ffb800] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "150ms" : progress === 40 ? "300ms" : "800ms",
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
