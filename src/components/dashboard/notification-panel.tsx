"use client";

import { useState, useEffect } from "react";
import { formatDateTimeCustom } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconChecks, IconCheck, IconBell } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Notification {
   id: string;
   title: string;
   message: string;
   type: string;
   link: string | null;
   is_read: boolean;
   created_at: string;
}

const TYPE_STYLES: Record<string, { icon: string; color: string }> = {
   success: { icon: "✓", color: "bg-success/15 text-success" },
   error: { icon: "!", color: "bg-error/15 text-error" },
   warning: { icon: "⚠", color: "bg-warning/15 text-warning" },
   info: { icon: "ℹ", color: "bg-info/15 text-info" },
};

export function NotificationPanel() {
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [unreadCount, setUnreadCount] = useState(0);
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
            .limit(10);

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

      supabase.auth.getUser().then((res: { data: { user: { id: string } | null } }) => {
         const user = res.data.user;
         if (!user || !active) return;
         channel = supabase
            .channel(`notif-panel:${user.id}:${Math.random().toString(36).slice(2)}`)
            .on(
               "postgres_changes",
               {
                  event: "*",
                  schema: "public",
                  table: "notifications",
                  filter: `user_id=eq.${user.id}`,
               },
               (payload: { eventType: string; new: Notification | null }) => {
                  const row = payload.new;
                  if (payload.eventType === "INSERT" && row) {
                     setNotifications((prev) =>
                        prev.some((n) => n.id === row.id)
                           ? prev
                           : [row, ...prev].slice(0, 10),
                     );
                     if (!row.is_read) setUnreadCount((prev) => prev + 1);
                     return;
                  }
                  if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
                     loadNotifications();
                  }
               },
            )
            .subscribe();
      });

      return () => {
         active = false;
         if (channel) supabase.removeChannel(channel);
      };
   }, []);

   async function markAllRead() {
      const supabase = createClient();
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
         .from("notifications")
         .update({ is_read: true })
         .in("id", unreadIds);

      if (error) return;

      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
   }

   async function markSingleRead(id: string) {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) =>
         prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
   }

   function handleClick(n: Notification) {
      if (!n.is_read) markSingleRead(n.id);
      if (n.link) router.push(n.link);
   }

   return (
      <Card className="border-base-300">
         <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
               <IconBell className="h-4 w-4" aria-hidden="true" />
               Notifikasi
                {unreadCount > 0 && (
                   <Badge className="bg-red-500 text-white dark:bg-red-400 dark:text-red-950 text-[10px]">
                      {unreadCount} baru
                   </Badge>
                )}
            </CardTitle>
            {unreadCount > 0 && (
               <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={markAllRead}
               >
                  <IconChecks className="h-3.5 w-3.5" aria-hidden="true" />
                  Tandai semua dibaca
               </Button>
            )}
         </CardHeader>
         <CardContent className="pt-0">
            {notifications.length === 0 ? (
               <p className="py-4 text-center text-sm text-base-content/50">
                  Tidak ada notifikasi
               </p>
            ) : (
               <div className="divide-y divide-base-300" role="list">
                  {notifications.map((n) => {
                     const ts = TYPE_STYLES[n.type] ?? TYPE_STYLES.info;
                     return (
                        <div
                           key={n.id}
                           role="listitem"
                           className={cn(
                              "group relative cursor-pointer py-3 transition-colors",
                              !n.is_read ? "bg-primary/5" : "",
                              "hover:bg-base-200/60 -mx-2 px-2 rounded-lg",
                           )}
                           onClick={() => handleClick(n)}
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
                                          <IconCheck className="h-3.5 w-3.5" />
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
         </CardContent>
      </Card>
   );
}
