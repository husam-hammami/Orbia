import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateScopeMode, DateScope } from "@/hooks/use-date-scope";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface DateScopeControlProps {
  scope: DateScope;
  mode: DateScopeMode;
  onModeChange: (mode: DateScopeMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onCustomRange: (start: Date, end: Date) => void;
  className?: string;
}

export function DateScopeControl({
  scope,
  mode,
  onModeChange,
  onPrev,
  onNext,
  onToday,
  onCustomRange,
  className
}: DateScopeControlProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: scope.range.start,
    to: scope.range.end
  });

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      onCustomRange(range.from, range.to);
      setCalendarOpen(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="inline-flex rounded-lg border bg-muted/50 p-1">
        <button
          onClick={() => onModeChange("monthly")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            mode === "monthly"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => onModeChange("weekly")}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            mode === "weekly"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Weekly
        </button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1",
                mode === "custom"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Custom
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={scope.range.start}
              selected={dateRange}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
              className="rounded-md border-0"
            />
            {dateRange?.from && dateRange?.to && (
              <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {mode !== "custom" && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onToday}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="text-sm font-medium text-muted-foreground ml-2">
        {scope.label}
      </div>
    </div>
  );
}
