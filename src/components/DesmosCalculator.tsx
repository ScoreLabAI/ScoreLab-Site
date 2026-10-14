import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, X } from "lucide-react";

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

// Desmos public demo API key (used in their official docs/examples)
const DESMOS_API_KEY = "dcb31709b452b1cf9dc26972add0fda6";
const DESMOS_SRC = `https://www.desmos.com/api/v1.10/calculator.js?apiKey=${DESMOS_API_KEY}`;

let loaderPromise: Promise<void> | null = null;
function loadDesmos(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Desmos) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${DESMOS_SRC}"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Desmos")));
      return;
    }
    const s = document.createElement("script");
    s.src = DESMOS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Desmos"));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

export function DesmosCalculator() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const calcRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadDesmos()
      .then(() => {
        if (cancelled || !containerRef.current || !window.Desmos) return;
        calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
          keypad: true,
          expressions: true,
          settingsMenu: true,
          border: false,
        });
      })
      .catch(() => {
        /* ignore — button stays usable */
      });
    return () => {
      cancelled = true;
      if (calcRef.current) {
        calcRef.current.destroy();
        calcRef.current = null;
      }
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-4 right-4 z-40 shadow-md"
      >
        <Calculator className="mr-2 h-4 w-4" />
        {open ? "Hide" : "Calculator"}
      </Button>

      {open && (
        <div className="fixed bottom-20 right-4 z-40 w-[min(560px,calc(100vw-2rem))] h-[min(520px,70vh)] rounded-lg border bg-card shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2 bg-secondary/40">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calculator className="h-4 w-4" /> Desmos Graphing Calculator
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-secondary"
              aria-label="Close calculator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={containerRef} className="flex-1" />
        </div>
      )}
    </>
  );
}
