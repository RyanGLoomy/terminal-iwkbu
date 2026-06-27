import * as React from "react";

/**
 * Menjalankan handler ketika pointer/mouse ditekan di luar elemen ref.
 * Digunakan komponen overlay (DropdownMenu) sebagai pengganti klik-luar Radix.
 */
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true,
) {
  React.useEffect(() => {
    if (!enabled) return;
    function listener(event: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler(event);
    }
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler, enabled]);
}
