"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

/**
 * Scroll-triggered fade/slide-in for the home page (see ARCHITECTURE.md) —
 * a tiny IntersectionObserver wrapper, not a library. Defaults to fully
 * visible (server-rendered, no-JS-safe); only elements that are below the
 * fold *at hydration time* get hidden-then-revealed as the user scrolls to
 * them, so there's never a flash of invisible content for anything already
 * in view. Respects `prefers-reduced-motion` via the same
 * `.animate-fade-up` guard `globals.css` defines for the payment page.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"visible" | "hidden" | "revealing">("visible");

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight;
    if (alreadyInView) return; // stays "visible" — no animation, no risk of a flash

    setState("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("revealing");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(state === "hidden" && "opacity-0", state === "revealing" && "animate-fade-up", className)}
      style={state === "revealing" ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
