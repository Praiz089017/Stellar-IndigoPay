import { useEffect } from "react";

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
}

export function useShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        !target ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        
        let modifierMatch = false;
        if (shortcut.meta && shortcut.ctrl) {
          modifierMatch = e.ctrlKey && e.metaKey;
        } else if (shortcut.meta) {
          modifierMatch = e.metaKey || e.ctrlKey; // Cmd on Mac, Ctrl on Win/Linux
        } else if (shortcut.ctrl) {
          modifierMatch = e.ctrlKey || e.metaKey; // Ctrl on Win/Linux, Cmd on Mac
        } else {
          modifierMatch = !e.ctrlKey && !e.metaKey;
        }

        if (keyMatch && modifierMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
