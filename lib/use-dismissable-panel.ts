"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Real popover keyboard/focus behavior for the app's inline expanding panels
 *  (ExportMenu, ShareButton) -- neither had this before: Escape closes,
 *  clicking outside closes, and focus returns to the trigger on close so a
 *  keyboard user isn't dropped back at the top of the page. */
export function useDismissablePanel(
  open: boolean,
  onClose: () => void,
): { panelRef: RefObject<HTMLDivElement | null>; triggerRef: RefObject<HTMLButtonElement | null> } {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function handlePointerDown(e: PointerEvent) {
      if (panelRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onClose]);

  return { panelRef, triggerRef };
}
