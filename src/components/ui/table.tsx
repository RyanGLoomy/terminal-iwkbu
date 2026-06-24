import * as React from "react";

import { cn } from "@/lib/utils";

type TableProps = React.ComponentProps<"table"> & {
   caption?: React.ReactNode;
};

function Table({ className, caption, children, ...props }: TableProps) {
   return (
      <div
         data-slot="table"
         className="relative w-full overflow-auto rounded-2xl border border-border/80 bg-card shadow-elevation-2"
      >
         <table
              className={cn("w-full caption-bottom text-sm", className)}
              {...props}
           >
            {caption ? <caption className="sr-only">{caption}</caption> : null}
            {children}
         </table>
      </div>
   );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
   return <thead className={cn("[&_tr]:border-b-0", className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
   return (
      <tbody
         className={cn("[&_tr:last-child]:border-0", className)}
         {...props}
      />
   );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
   return (
      <tfoot
         className={cn(
             "border-t bg-muted/70 font-semibold [&>tr]:last:border-b-0",
             className,
          )}
         {...props}
      />
   );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
   return (
      <tr
         className={cn(
             "border-b border-border/70 transition-colors hover:bg-secondary/60 data-[state=selected]:bg-secondary",
             className,
          )}
         {...props}
      />
   );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
   return (
      <th
         className={cn(
             "h-12 bg-brand-navy px-4 text-left align-middle text-[11px] font800 uppercase tracking-[0.11em] text-white first:rounded-tl-2xl last:rounded-tr-2xl [&:has([role=checkbox])]:pr-0 dark:bg-brand-panel",
             className,
          )}
         {...props}
      />
   );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
   return (
      <td
         className={cn(
             "px-4 py-3 align-middle text-sm text-foreground/90 [&:has([role=checkbox])]:pr-0",
             className,
          )}
         {...props}
      />
   );
}

function TableCaption({
   className,
   ...props
}: React.ComponentProps<"caption">) {
   return (
      <caption
         className={cn("text-muted-foreground mt-4 text-sm", className)}
         {...props}
      />
   );
}

export {
   Table,
   TableHeader,
   TableBody,
   TableFooter,
   TableHead,
   TableRow,
   TableCell,
   TableCaption,
};
