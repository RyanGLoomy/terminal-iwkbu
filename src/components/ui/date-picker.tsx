import * as React from "react";
import { Input } from "@/components/ui/input";

type DatePickerProps = Omit<
   React.ComponentProps<typeof Input>,
   "type" | "value" | "onChange"
> & {
   value: string;
   onChange: (value: string) => void;
};

export function DatePicker({ value, onChange, ...props }: DatePickerProps) {
   return (
      <Input
         type="date"
         value={value}
         onChange={(event) => onChange(event.target.value)}
         {...props}
      />
   );
}
