import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({
   className,
   ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
   return (
      <TabsPrimitive.List
         data-slot="tabs-list"
         className={cn(
            "bg-muted text-muted-foreground inline-flex h-9 items-center justify-center rounded-lg p-1",
            className,
         )}
         {...props}
      />
   );
}

function TabsTrigger({
   className,
   ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
   return (
      <TabsPrimitive.Trigger
         data-slot="tabs-trigger"
         className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            "text-muted-foreground hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-border",
            className,
         )}
         {...props}
      />
   );
}

function TabsContent({
   className,
   ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
   return (
      <TabsPrimitive.Content
         data-slot="tabs-content"
         className={cn("mt-2 focus-visible:outline-none", className)}
         {...props}
      />
   );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
