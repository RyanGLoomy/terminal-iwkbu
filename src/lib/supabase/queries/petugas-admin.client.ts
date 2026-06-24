export type PetugasRow = {
   id: string;
   email: string;
   full_name: string | null;
   is_active: boolean | null;
   terminal_id: string | null;
   created_at: string;
};

type CreatePetugasPayload = {
   label: string;
   terminal_id?: string;
   email?: string;
   password?: string;
};

type UpdatePetugasPayload = {
   id: string;
   full_name?: string;
   is_active?: boolean;
   password?: string;
   reset_password?: boolean;
};

export async function listPetugas(terminalId?: string) {
   const searchParams = new URLSearchParams();
   if (terminalId) searchParams.set("terminal_id", terminalId);
   const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

   const response = await fetch(`/api/admin/petugas${suffix}`, {
      method: "GET",
      headers: {
         "Content-Type": "application/json",
      },
   });

   const contentType = response.headers.get("content-type") ?? "";
   if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(text || "Response bukan JSON");
   }

   const body = await response.json();
   if (!response.ok) {
      throw new Error(body?.message ?? "Gagal memuat petugas");
   }
   return (body.data ?? []) as PetugasRow[];
}

export async function createPetugas(payload: CreatePetugasPayload) {
   const response = await fetch("/api/admin/petugas", {
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });

   const contentType = response.headers.get("content-type") ?? "";
   if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(text || "Response bukan JSON");
   }

   const body = await response.json();
   if (!response.ok) {
      throw new Error(body?.message ?? "Gagal membuat akun petugas");
   }

   return body as { email: string; password: string | null; user_id: string };
}

export async function updatePetugas(payload: UpdatePetugasPayload) {
   const response = await fetch("/api/admin/petugas", {
      method: "PATCH",
      headers: {
         "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
   });

   const contentType = response.headers.get("content-type") ?? "";
   if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(text || "Response bukan JSON");
   }

   const body = await response.json();
   if (!response.ok) {
      throw new Error(body?.message ?? "Gagal memperbarui akun loket");
   }

   return body as { data: PetugasRow | null; password: string | null };
}
