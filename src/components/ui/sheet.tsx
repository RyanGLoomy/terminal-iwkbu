"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

function SheetOverlay({
   className,
   ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
   return (
      <DialogPrimitive.Overlay
         data-slot="sheet-overlay"
         className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className,
         )}
         {...props}
      />
   );
}

function SheetContent({
   className,
   children,
   side = "right",
   ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
   side?: "top" | "bottom" | "left" | "right";
}) {
   return (
      <SheetPortal>
         <SheetOverlay />
         <DialogPrimitive.Content
            data-slot="sheet-content"
            className={cn(
               "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
               side === "top" &&
                  "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
               side === "bottom" &&
                  "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
               side === "left" &&
                  "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
               side === "right" &&
                  "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
               className,
            )}
            {...props}
         >
            {children}
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none">
               <X className="size-4" />
               <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
         </DialogPrimitive.Content>
      </SheetPortal>
   );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
   return (
      <div
         data-slot="sheet-header"
         className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
         {...props}
      />
   );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
   return (
      <div
         data-slot="sheet-footer"
         className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className,
         )}
         {...props}
      />
   );
}

function SheetTitle({
   className,
   ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
   return (
      <DialogPrimitive.Title
         data-slot="sheet-title"
         className={cn("text-lg font-semibold text-foreground", className)}
         {...props}
      />
   );
}

function SheetDescription({
   className,
   ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
   return (
      <DialogPrimitive.Description
         data-slot="sheet-description"
         className={cn("text-sm text-muted-foreground", className)}
         {...props}
      />
   );
}

export {
   Sheet,
   SheetPortal,
   SheetOverlay,
   SheetTrigger,
   SheetClose,
   SheetContent,
   SheetHeader,
   SheetFooter,
   SheetTitle,
   SheetDescription,
};
