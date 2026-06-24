export const ROLES = {
   PO: "po",
   PETUGAS_LOKET: "loket",
   ADMIN_TERMINAL: "admin-terminal",
   STAF_IW: "staf-iw",
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

// Route yang bisa diakses setiap role
export const ROLE_ROUTES: Record<RoleType, string[]> = {
   [ROLES.PO]: ["/po", "/po/temuan", "/po/rekonsiliasi", "/profile"],
   [ROLES.PETUGAS_LOKET]: [
      "/loket",
      "/loket/pin",
      "/loket/pencatatan",
      "/loket/riwayat",
      "/profile",
   ],
   [ROLES.ADMIN_TERMINAL]: [
       "/admin-terminal",
       "/admin-terminal/petugas",
       "/admin-terminal/rekap",
       "/admin-terminal/sesi",
       "/admin-terminal/laporan",
       "/admin-terminal/master-data",
       "/profile",
    ],
   [ROLES.STAF_IW]: [
      "/staf-iw",
      "/staf-iw/akun",
      "/staf-iw/rekonsiliasi",
      "/staf-iw/iwkbu-sync",
      "/staf-iw/master-data",
      "/staf-iw/audit-trail",
      "/staf-iw/temuan",
      "/profile",
   ],
};

// Route publik (tidak perlu login)
export const PUBLIC_ROUTES = [
   "/login",
   "/registrasi-po",
   "/error",
   "/lupa-password",
   "/reset-password",
   "/api/auth/callback",
];

// Dashboard default setiap role
export const DEFAULT_ROUTES: Record<RoleType, string> = {
   [ROLES.PO]: "/po",
   [ROLES.PETUGAS_LOKET]: "/loket",
   [ROLES.ADMIN_TERMINAL]: "/admin-terminal",
   [ROLES.STAF_IW]: "/staf-iw",
};

// Display name untuk UI
export const ROLE_DISPLAY_NAMES: Record<RoleType, string> = {
   [ROLES.PO]: "Perusahaan Otobus",
   [ROLES.PETUGAS_LOKET]: "Loket Terminal",
   [ROLES.ADMIN_TERMINAL]: "Admin Terminal",
   [ROLES.STAF_IW]: "Staf IW",
};
