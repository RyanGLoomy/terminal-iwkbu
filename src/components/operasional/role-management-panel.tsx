"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { ROLE_DISPLAY_NAMES } from "@/config/roles";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";

interface UserProfile {
   id: string;
   email: string;
   full_name: string | null;
   is_active: boolean;
   terminal_id: string | null;
   user_roles:
      | {
           role:
              | {
                   id: string;
                   name: string;
                }
              | null;
        }
      | {
           role: {
              id: string;
              name: string;
           };
        }[]
      | null;
}

function getRoleName(user: UserProfile): string | null {
   const ur = user.user_roles;
   if (Array.isArray(ur)) {
      return ur[0]?.role?.name ?? null;
   }
   return ur?.role?.name ?? null;
}

const ROLE_OPTIONS = ["po", "loket", "admin-terminal", "staf-iw"];

export function RoleManagementPanel() {
   const [users, setUsers] = useState<UserProfile[]>([]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState<string | null>(null);

   const loadUsers = useCallback(async () => {
      try {
         const res = await fetch("/api/staf-iw/users");
         const payload = await res.json();
         if (res.ok) {
            setUsers(payload.data ?? []);
         }
      } catch {
         toast.error("Gagal memuat data user");
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      loadUsers();
   }, [loadUsers]);

   async function handleRoleChange(
      userId: string,
      email: string,
      oldRole: string | null,
      newRole: string,
   ) {
      if (oldRole === newRole) return;

      setSaving(userId);
      try {
         const res = await fetch(`/api/staf-iw/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole, old_role: oldRole }),
         });

         if (res.ok) {
            toast.success(`Role ${email} diubah menjadi ${ROLE_DISPLAY_NAMES[newRole as keyof typeof ROLE_DISPLAY_NAMES] ?? newRole}`);
            await loadUsers();
         } else {
            const payload = await res.json();
            toast.error(payload?.message ?? "Gagal mengubah role");
         }
      } finally {
         setSaving(null);
      }
   }

   return (
      <Card className="border-border">
         <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
               <Users className="h-4 w-4 text-primary" />
               Manajemen Role User
            </CardTitle>
         </CardHeader>
         <CardContent>
            {loading ? (
               <p className="text-sm text-muted-foreground text-center py-6">
                  Memuat data...
               </p>
            ) : users.length === 0 ? (
               <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada user terdaftar
               </p>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                           <th className="pb-2 pr-4 font-medium">Email</th>
                           <th className="pb-2 pr-4 font-medium">Nama</th>
                           <th className="pb-2 pr-4 font-medium">Role</th>
                           <th className="pb-2 pr-4 font-medium">Status</th>
                        </tr>
                     </thead>
                     <tbody>
                        {users.map((user) => {
                           const currentRole = getRoleName(user);
                           const normalizedRole = currentRole?.replace(/_/g, "-");
                           return (
                              <tr
                                 key={user.id}
                                 className="border-b border-border last:border-0"
                              >
                                 <td className="py-2.5 pr-4">
                                    <span className="font-medium">
                                       {user.email}
                                    </span>
                                 </td>
                                 <td className="py-2.5 pr-4 text-muted-foreground">
                                    {user.full_name || "-"}
                                 </td>
                                 <td className="py-2.5 pr-4">
                                     <Select
                                        value={normalizedRole ?? "none"}
                                        disabled={saving === user.id}
                                        onValueChange={(v) =>
                                           handleRoleChange(
                                              user.id,
                                              user.email,
                                              normalizedRole ?? null,
                                              v === "none" ? "" : v,
                                           )
                                        }
                                     >
                                        <SelectTrigger className="h-8 w-[140px] text-xs">
                                           <SelectValue placeholder="Belum ada role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                           <SelectItem value="none" disabled>
                                              Belum ada role
                                           </SelectItem>
                                           {ROLE_OPTIONS.map((r) => (
                                              <SelectItem key={r} value={r}>
                                                 {ROLE_DISPLAY_NAMES[r as keyof typeof ROLE_DISPLAY_NAMES] ?? r}
                                              </SelectItem>
                                           ))}
                                        </SelectContent>
                                     </Select>
                                 </td>
                                 <td className="py-2.5 pr-4">
                                    <Badge
                                       className={`text-[11px] ${
                                          user.is_active
                                             ? "bg-emerald-50 text-brand-green dark:bg-green-950/50 dark:text-green-300 dark:border-green-800"
                                             : "bg-red-50 text-destructive border border-red-200/60 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800"
                                       }`}
                                    >
                                       {user.is_active ? "Aktif" : "Nonaktif"}
                                    </Badge>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            )}
         </CardContent>
      </Card>
   );
}
