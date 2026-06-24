"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
   const router = useRouter();

   const loadNotifications = useCallback(async () => {
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
   }, []);

   useEffect(() => {
      loadNotifications();

      const supabase = createClient();
      const channelName = `notifications:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const channel = supabase
         .channel(channelName)
         .on(
            "postgres_changes",
            {
               event: "INSERT",
               schema: "public",
               table: "notifications",
            },
            () => {
               loadNotifications();
            },
         )
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
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
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

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
         <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 p-0"
            onClick={() => setOpen((v) => !v)}
         >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
               <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
               </span>
            )}
         </Button>

         {open && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border bg-card shadow-lg z-50">
               <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">Notifikasi</span>
                  {unreadCount > 0 && (
                     <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={markAllRead}
                     >
                        <CheckCheck className="h-3.5 w-3.5 mr-1" />
                        Tandai dibaca
                     </Button>
                  )}
               </div>
                {notifications.length === 0 ? (
                   <EmptyState title="Tidak ada notifikasi" icon={Bell} className="border-0 py-6" />
                ) : (
                  <div className="divide-y divide-border">
                     {notifications.map((n) => (
                        <button
                           key={n.id}
                           className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                              !n.is_read ? "bg-primary/10" : ""
                           }`}
                           onClick={() => handleClickLink(n.link)}
                        >
                           <div className="flex items-start gap-2">
                              {!n.is_read && (
                                 <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                 <p className="text-sm font-medium truncate">
                                    {n.title}
                                 </p>
                                 <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {n.message}
                                 </p>
                                 <p className="text-[10px] text-muted-foreground/70 mt-1">
                                    {new Date(n.created_at).toLocaleString(
                                       "id-ID",
                                       {
                                          day: "numeric",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                       },
                                    )}
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
