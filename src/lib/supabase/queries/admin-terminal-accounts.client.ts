export type AdminTerminalAccountRow = {
   id: string;
   email: string;
   full_name: string | null;
   is_active: boolean | null;
   terminal_id: string | null;
   created_at: string;
   terminal: { id: string; kode: string; nama: string } | null;
   user_roles: { role_id: string; role: { name: string } | null }[] | null;
};

type CreateAdminTerminalPayload = {
   full_name: string;
   role?: "admin-terminal" | "staf-iw";
   terminal_id?: string;
   email?: string;
   password?: string;
};

type UpdateAdminTerminalPayload = {
   id: string;
   full_name?: string;
   is_active?: boolean;
   password?: string;
   reset_password?: boolean;
};

async function parseJson(response: Response, fallbackMessage: string) {
   const contentType = response.headers.get("content-type") ?? "";
   if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(text || fallbackMessage);
   }
   const body = await response.json();
   if (!response.ok) {
      throw new Error(body?.message ?? fallbackMessage);
   }
   return body;
}

export async function listAdminTerminalAccounts() {
   const response = await fetch("/api/staf-iw/admin-terminal", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
   });
   const body = await parseJson(response, "Gagal memuat akun admin terminal");
   return (body.data ?? []) as AdminTerminalAccountRow[];
}

export async function createAdminTerminalAccount(
   payload: CreateAdminTerminalPayload,
) {
   const response = await fetch("/api/staf-iw/admin-terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
   });
   const body = await parseJson(response, "Gagal membuat akun admin terminal");
   return body as { email?: string; password: string | null; user_id: string };
}

export async function updateAdminTerminalAccount(
   payload: UpdateAdminTerminalPayload,
) {
   const response = await fetch("/api/staf-iw/admin-terminal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
   });
   const body = await parseJson(response, "Gagal memperbarui akun admin terminal");
   return body as { password: string | null };
}
