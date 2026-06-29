import { redirect } from "next/navigation";
import { getAuthenticatedActor } from "@/lib/auth/server-actor";
import { createClient } from "@/lib/supabase/server";
import { ROLE_DISPLAY_NAMES, type RoleType } from "@/config/roles";
import {
   getRoleNameFromProfile,
   normalizeRoleName,
} from "@/lib/supabase/role-utils";
import { ProfileForm, type ProfileData } from "@/components/profile/profile-form";

// Server component untuk read path: fetch profil di server -> tidak ada spinner
// client-side & loading.tsx (route boundary) jadi reachable. Form interaktif
// (password/PIN/name) hidup di <ProfileForm> (client) yang menerima initialProfile.
export default async function ProfilePage() {
   const actor = await getAuthenticatedActor();
   if (!actor) redirect("/login");

   const supabase = await createClient();
   const { data, error } = await supabase
      .from("profiles")
      .select(
         "id, full_name, email, terminal_id, user_roles!inner(role:roles(name))",
      )
      .eq("id", actor.user.id)
      .single();

   if (error || !data) {
      redirect("/error");
   }

   const normalizedRole = normalizeRoleName(getRoleNameFromProfile(data)) ?? null;
   const initialProfile: ProfileData = {
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      terminal_id: data.terminal_id,
      role: normalizedRole,
      roleName: normalizedRole
         ? (ROLE_DISPLAY_NAMES[normalizedRole as RoleType] ?? normalizedRole)
         : null,
   };

   return <ProfileForm initialProfile={initialProfile} />;
}
