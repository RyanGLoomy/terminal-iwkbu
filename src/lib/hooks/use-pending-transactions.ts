"use client";

import { useState, useEffect, useCallback } from "react";
import { useOnlineStatus } from "./use-online-status";

export interface PendingTransaction {
   id: string;
   type: "masuk" | "keluar";
   data: Record<string, unknown>;
   timestamp: number;
}

const STORAGE_KEY = "pending-transactions";

function readQueue(): PendingTransaction[] {
   try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PendingTransaction[]) : [];
   } catch {
      return [];
   }
}

function writeQueue(items: PendingTransaction[]) {
   localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Manages a localStorage-backed queue of transactions that failed due to
 * network errors. On reconnect, the hook auto-replays pending transactions
 * via the provided `replay` callback.
 */
export function usePendingTransactions(
   replay: (tx: PendingTransaction) => Promise<boolean>,
) {
   const [pending, setPending] = useState<PendingTransaction[]>([]);
   const { isOnline } = useOnlineStatus();
   const [replaying, setReplaying] = useState(false);

   useEffect(() => {
      setPending(readQueue());
   }, []);

   const enqueue = useCallback((tx: PendingTransaction) => {
      setPending((prev) => {
         const next = [...prev, tx];
         writeQueue(next);
         return next;
      });
   }, []);

   const remove = useCallback((id: string) => {
      setPending((prev) => {
         const next = prev.filter((t) => t.id !== id);
         writeQueue(next);
         return next;
      });
   }, []);

   // Auto-replay on reconnect
   useEffect(() => {
      if (!isOnline || pending.length === 0 || replaying) return;
      let cancelled = false;

      const flush = async () => {
         setReplaying(true);
         const queue = readQueue();
         for (const tx of queue) {
            if (cancelled) break;
            const ok = await replay(tx);
            if (ok) {
               remove(tx.id);
            }
         }
         setReplaying(false);
      };

      flush();
      return () => {
         cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isOnline, pending.length]);

   return { pending, enqueue, remove, replaying };
}
