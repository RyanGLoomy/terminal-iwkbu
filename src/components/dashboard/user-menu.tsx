"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, User, Loader2 } from "lucide-react";
import {
   Avatar,
   AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, type RoleType } from "@/config/roles";
import { createClient } from "@/lib/supabase/client";
import { clearPinSession } from "@/lib/supabase/queries/operasional.client";
import { useState } from "react";

interface UserMenuProps {
   userName: string;
   userRole: RoleType;
}

function getInitials(name: string) {
   const parts = name.split(/[\s@.]+/).filter(Boolean);
   if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
   }
   return name.slice(0, 2).toUpperCase();
}

export function UserMenu({ userName, userRole }: UserMenuProps) {
   const router = useRouter();
   const [loggingOut, setLoggingOut] = useState(false);
   const [exitingPetugas, setExitingPetugas] = useState(false);

   const handleLogout = async () => {
      setLoggingOut(true);
      try {
         await fetch("/api/auth/logout", { method: "POST" });
      } catch {
         const supabase = createClient();
         await supabase.auth.signOut();
      }
      window.location.href = "/login";
   };

   const handleExitPetugas = async () => {
      setExitingPetugas(true);
      try {
         await clearPinSession();
      } catch {
      }
      window.location.href = "/loket/pin";
   };

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-2">
               <Avatar className="size-7">
                  <AvatarFallback className="bg-brand-sky/15 text-xs font-semibold text-brand-sky">
                     {getInitials(userName)}
                  </AvatarFallback>
               </Avatar>
               <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                  {userName}
               </span>
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
               <div className="flex flex-col space-y-1">
                  <p className="truncate text-sm font-medium leading-none">
                     {userName}
                  </p>
                  <p className="text-xs leading-none text-base-content/70">
                     {userRole === ROLES.PO ? "Perusahaan Otobus" :
                      userRole === ROLES.PETUGAS_LOKET ? "Loket Terminal" :
                      userRole === ROLES.ADMIN_TERMINAL ? "Admin Terminal" :
                      "Staf IW"}
                  </p>
               </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
               <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 size-4" aria-hidden="true" />
                  Profil
               </Link>
            </DropdownMenuItem>
            {userRole === ROLES.PETUGAS_LOKET && (
               <DropdownMenuItem
                  onClick={handleExitPetugas}
                  disabled={exitingPetugas}
                  className="cursor-pointer"
               >
                  {exitingPetugas ? (
                     <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
                  ) : (
                     <KeyRound className="mr-2 size-4" aria-hidden="true" />
                  )}
                  Keluar Sesi Petugas
               </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
               onClick={handleLogout}
               disabled={loggingOut}
               className="cursor-pointer text-error focus:text-error"
            >
               {loggingOut ? (
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
               ) : (
                  <LogOut className="mr-2 size-4" aria-hidden="true" />
               )}
               Keluar
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
