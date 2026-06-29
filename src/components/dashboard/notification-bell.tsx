"use client";

import { useState, useEffect, useRef } from "react";
import { formatDateTimeCustom } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Notification {
   id: string;
   title: string;
   message: string;
   type: string;
   link: string | null;
   is_read: boolean;
   created_at: string;
}

export function NotificationBell() {
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
   const [open, setOpen] = useState(false);
   const dropdownRef = useRef<HTMLDivElement>(null);
   const bellWrapRef = useRef<HTMLSpanElement>(null);
   const router = useRouter();

   const loadNotifications = async () => {
      try {
         const supabase = createClient();
         const {
            data: { user },
         } = await supabase.auth.getUser();
         if (!user) return;

         const { data, error } = await supabase
            .from("notifications")
            .select("id, title, message, type, link, is_read, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(20);

         if (error || !data) return;

         const items = data as Notification[];
         setNotifications(items);
         setUnreadCount(items.filter((n) => !n.is_read).length);
      } catch {
         return;
      }
   };

   useEffect(() => {
      const supabase = createClient();
      let channel: ReturnType<typeof supabase.channel> | null = null;
      let active = true;

      loadNotifications();

      // Hanya langganan INSERT notifikasi MILIK USER INI (bukan broadcast semua user).
      supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
         const user = res.data.user;
         if (!user || !active) return;
         channel = supabase
            .channel(`notif:${user.id}:${Math.random().toString(36).slice(2)}`)
            .on(
               "postgres_changes",
               {
                  event: "INSERT",
                  schema: "public",
                  table: "notifications",
                  filter: `user_id=eq.${user.id}`,
               },
               (payload: { new: Notification | null }) => {
                  const newRow = payload.new;
                  if (!newRow) {
                     loadNotifications();
                     return;
                  }
                  setNotifications((prev) =>
                     prev.some((n) => n.id === newRow.id)
                        ? prev
                        : [newRow, ...prev].slice(0, 20),
                  );
                  if (!newRow.is_read) setUnreadCount((prev) => prev + 1);
               },
            )
            .subscribe();
      });

      return () => {
         active = false;
         if (channel) supabase.removeChannel(channel);
      };
   }, [loadNotifications]);

   useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
         if (
            dropdownRef.current &&
            !dropdownRef.current.contains(e.target as Node)
         ) {
            setOpen(false);
         }
      }
      function handleKeydown(e: KeyboardEvent) {
         if (e.key === "Escape" && open) {
            setOpen(false);
            const btn = bellWrapRef.current?.querySelector("button");
            btn?.focus();
         }
      }
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeydown);
      return () => {
         document.removeEventListener("mousedown", handleClickOutside);
         document.removeEventListener("keydown", handleKeydown);
      };
   }, [open]);

   async function markAllRead() {
      const supabase = createClient();
      const unreadIds = notifications
         .filter((n) => !n.is_read)
         .map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
         .from("notifications")
         .update({ is_read: true })
         .in("id", unreadIds);

      if (error) return;

      setUnreadCount(0);
      setNotifications((prev) =>
         prev.map((n) => ({ ...n, is_read: true })),
      );
   }

   function handleClickLink(link: string | null) {
      if (link) {
         router.push(link);
         setOpen(false);
      }
   }

   return (
      <div className="relative" ref={dropdownRef}>
         <span ref={bellWrapRef} className="contents">
            <Button
               variant="ghost"
               size="sm"
               className="relative h-9 w-9 p-0"
               aria-label="Notifikasi"
               aria-haspopup="dialog"
               aria-expanded={open}
               onClick={() => setOpen((v) => !v)}
            >
               <Bell className="h-4 w-4" aria-hidden="true" />
               {unreadCount > 0 && (
                  <span
                     className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-error-content"
                     aria-hidden="true"
                  >
                     {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
               )}
            </Button>
         </span>
         <span className="sr-only" aria-live="polite">
            {unreadCount > 0 ? `${unreadCount} notifikasi belum dibaca` : "Tidak ada notifikasi belum dibaca"}
         </span>

         {open && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-sm z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                   <span className="text-sm font-semibold">Notifikasi</span>
                   {unreadCount > 0 && (
                      <Button
                         variant="ghost"
                         size="sm"
                         className="h-7 text-xs"
                         onClick={markAllRead}
                      >
                         <CheckCheck className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                         Tandai dibaca
                      </Button>
                   )}
                </div>
                 {notifications.length === 0 ? (
                    <EmptyState title="Tidak ada notifikasi" icon={Bell} className="border-0 py-6" />
                 ) : (
                   <div className="divide-y divide-base-300" role="list">
                      {notifications.map((n) => (
                         <button
                            key={n.id}
                            type="button"
                            role="listitem"
                            className={`w-full text-left px-4 py-3 hover:bg-base-200/60 transition-colors ${
                               !n.is_read ? "bg-primary/10" : ""
                            }`}
                            onClick={() => handleClickLink(n.link)}
                         >
                            <div className="flex items-start gap-2">
                               {!n.is_read && (
                                  <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
                               )}
                               <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate">
                                     {n.title}
                                  </p>
                                  <p className="text-xs text-base-content/70 line-clamp-2 mt-0.5">
                                     {n.message}
                                  </p>
                                  <p className="text-[10px] text-base-content/50 mt-1 tabular-nums">
                                      {formatDateTimeCustom(n.created_at, {
                                         day: "numeric",
                                         month: "short",
                                         hour: "2-digit",
                                         minute: "2-digit",
                                      })}
                                  </p>
                               </div>
                            </div>
                         </button>
                      ))}
                   </div>
                )}
            </div>
         )}
      </div>
   );
}
