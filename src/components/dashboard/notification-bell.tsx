"use client";

import { useState, useEffect, useRef } from "react";
import { formatDateTimeCustom } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Check } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { PushToggle } from "@/components/dashboard/push-toggle";

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

   function handleClickLink(link: string | null, id: string, isRead: boolean) {
      if (!isRead) markSingleRead(id);
      if (link) {
         router.push(link);
         setOpen(false);
      }
   }

   async function markSingleRead(id: string) {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) =>
         prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
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
             <div className="absolute right-0 top-full mt-2 w-[22rem] max-h-[28rem] overflow-y-auto rounded-xl border border-base-300 bg-base-100 shadow-lg z-50">
                <div className="sticky top-0 flex items-center justify-between border-b border-base-300 bg-base-100/95 backdrop-blur px-4 py-3">
                   <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">Notifikasi</span>
                      {unreadCount > 0 && (
                         <Badge className="bg-error text-error-content text-[10px]">
                            {unreadCount} baru
                         </Badge>
                      )}
                   </div>
                   <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                         <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={markAllRead}
                         >
                            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Tandai semua dibaca
                         </Button>
                      )}
                   </div>
                </div>
                 {notifications.length === 0 ? (
                    <EmptyState title="Tidak ada notifikasi" icon={Bell} className="border-0 py-6" />
                 ) : (
                   <div className="divide-y divide-base-300" role="list">
                      {notifications.map((n) => {
                         const typeStyles: Record<string, { icon: string; color: string }> = {
                            success: { icon: "✓", color: "bg-success/15 text-success" },
                            error: { icon: "!", color: "bg-error/15 text-error" },
                            warning: { icon: "⚠", color: "bg-warning/15 text-warning" },
                            info: { icon: "ℹ", color: "bg-info/15 text-info" },
                         };
                         const ts = typeStyles[n.type] ?? typeStyles.info;
                         return (
                           <div
                              key={n.id}
                              role="listitem"
                              className={`group relative cursor-pointer px-4 py-3 transition-colors ${
                                 !n.is_read ? "bg-primary/5" : ""
                              } hover:bg-base-200/60`}
                              onClick={() => handleClickLink(n.link, n.id, n.is_read)}
                           >
                              <div className="flex items-start gap-2.5">
                                 {!n.is_read ? (
                                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                                 ) : (
                                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ts.color}`}>
                                       {ts.icon}
                                    </span>
                                 )}
                                 <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-1">
                                       <p className={`text-sm truncate ${!n.is_read ? "font-semibold" : "font-medium"}`}>
                                          {n.title}
                                       </p>
                                       {!n.is_read && (
                                          <button
                                             type="button"
                                             className="shrink-0 rounded-md p-1 text-base-content/40 opacity-0 transition-opacity hover:bg-base-300 hover:text-base-content group-hover:opacity-100"
                                             onClick={(e) => { e.stopPropagation(); markSingleRead(n.id); }}
                                             aria-label="Tandai dibaca"
                                          >
                                             <Check className="h-3.5 w-3.5" />
                                          </button>
                                       )}
                                    </div>
                                    <p className="text-xs text-base-content/70 line-clamp-2 mt-0.5">
                                       {n.message}
                                    </p>
                                    <p className="text-[11px] text-base-content/60 tabular-nums mt-1">
                                       {formatDateTimeCustom(n.created_at, {
                                          day: "numeric",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                       })}
                                    </p>
                                 </div>
                              </div>
                           </div>
                         );
                      })}
                    </div>
                 )}

                 {/* Push notification toggle */}
                 <div className="border-t border-base-300 p-2">
                    <PushToggle />
                 </div>
              </div>
           )}
       </div>
    );
}
