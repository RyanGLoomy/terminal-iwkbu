"use client";

import * as React from "react";
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
   trigger?: React.ReactNode;
   title: string;
   description: string;
   confirmLabel?: string;
   cancelLabel?: string;
   destructive?: boolean;
   onConfirm: () => void | Promise<void>;
}

function ConfirmDialog({
   open,
   onOpenChange,
   trigger,
   title,
   description,
   confirmLabel = "Konfirmasi",
   cancelLabel = "Batal",
   destructive = false,
   onConfirm,
}: ConfirmDialogProps) {
   const [loading, setLoading] = React.useState(false);

   const handleConfirm = async () => {
      setLoading(true);
      try {
         await onConfirm();
         onOpenChange?.(false);
      } finally {
         setLoading(false);
      }
   };

   const content = (
      <AlertDialogContent>
         <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
               onClick={(e) => {
                  e.preventDefault();
                  handleConfirm();
               }}
               disabled={loading}
               className={cn(
                  destructive &&
                     cn(buttonVariants({ variant: "destructive" })),
               )}
            >
               {loading ? "Memproses..." : confirmLabel}
            </AlertDialogAction>
         </AlertDialogFooter>
      </AlertDialogContent>
   );

   if (trigger) {
      return (
         <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
            {content}
         </AlertDialog>
      );
   }

   return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
         {content}
      </AlertDialog>
   );
}

export { ConfirmDialog };
