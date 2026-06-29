export function resolveTerminalId(params: {
   role: string;
   actorTerminalId?: string | null;
   requestedTerminalId?: string | null;
}) {
   if (params.role === "admin-terminal") {
      if (!params.actorTerminalId) {
         return { message: "Terminal tidak ditemukan", status: 400 } as const;
      }

      if (
         params.requestedTerminalId &&
         params.requestedTerminalId !== params.actorTerminalId
      ) {
         return { message: "Forbidden", status: 403 } as const;
      }

      return { terminalId: params.actorTerminalId } as const;
   }

   if (!params.requestedTerminalId) {
      return { message: "Terminal tidak ditemukan", status: 400 } as const;
   }

   return { terminalId: params.requestedTerminalId } as const;
}
