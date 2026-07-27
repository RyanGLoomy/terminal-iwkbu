"use client";
import { useEffect, useState, useCallback } from "react";
import { IconBell, IconBellOff, IconLoader2 } from "@tabler/icons-react";
import { isPushAvailable, subscribeToPush, unsubscribeFromPush, isPushSubscribed } from "@/lib/push/push.client";
import { toast } from "sonner";

export function PushToggle() {
   const [available, setAvailable] = useState(false);
   const [subscribed, setSubscribed] = useState(false);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (!isPushAvailable()) return;
      setAvailable(true);
      isPushSubscribed().then(setSubscribed);
   }, []);

   const handleToggle = useCallback(async () => {
      setLoading(true);
      try {
         if (subscribed) {
            await unsubscribeFromPush();
            setSubscribed(false);
            toast.success("Notifikasi push dinonaktifkan");
         } else {
            const sub = await subscribeToPush();
            if (sub) {
               setSubscribed(true);
               toast.success("Notifikasi push diaktifkan");
            } else {
               toast.error("Izin notifikasi ditolak atau tidak didukung");
            }
         }
      } catch {
         toast.error("Gagal mengubah pengaturan notifikasi");
      } finally {
         setLoading(false);
      }
   }, [subscribed]);

   if (!available) return null;

   return (
      <button
         type="button"
         onClick={handleToggle}
         disabled={loading}
         className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-base-content/70 transition-colors hover:bg-base-200/50 disabled:opacity-50"
      >
         {loading ? (
            <IconLoader2 className="size-4 animate-spin" />
         ) : subscribed ? (
            <IconBell className="size-4 text-success" />
         ) : (
            <IconBellOff className="size-4 text-base-content/40" />
         )}
         {subscribed ? "Notifikasi Push Aktif" : "Aktifkan Notifikasi Push"}
      </button>
   );
}
