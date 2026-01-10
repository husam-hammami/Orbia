import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks,
  format,
  parseISO,
  isValid
} from "date-fns";

export type DateScopeMode = "monthly" | "weekly" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateScope {
  mode: DateScopeMode;
  range: DateRange;
  label: string;
  shortLabel: string;
}

interface UseDateScopeReturn {
  scope: DateScope;
  mode: DateScopeMode;
  setMode: (mode: DateScopeMode) => void;
  goNext: () => void;
  goPrev: () => void;
  goToday: () => void;
  setCustomRange: (start: Date, end: Date) => void;
  isInRange: (date: Date) => boolean;
}

const getMonthRange = (anchor: Date): DateRange => ({
  start: startOfMonth(anchor),
  end: endOfMonth(anchor)
});

const getWeekRange = (anchor: Date): DateRange => ({
  start: startOfWeek(anchor, { weekStartsOn: 1 }),
  end: endOfWeek(anchor, { weekStartsOn: 1 })
});

const formatRangeLabel = (range: DateRange, mode: DateScopeMode): string => {
  if (mode === "monthly") {
    return format(range.start, "MMMM yyyy");
  }
  if (mode === "weekly") {
    const sameMonth = range.start.getMonth() === range.end.getMonth();
    if (sameMonth) {
      return `${format(range.start, "MMM d")} – ${format(range.end, "d, yyyy")}`;
    }
    return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`;
  }
  const sameYear = range.start.getFullYear() === range.end.getFullYear();
  if (sameYear) {
    return `${format(range.start, "MMM d")} – ${format(range.end, "MMM d, yyyy")}`;
  }
  return `${format(range.start, "MMM d, yyyy")} – ${format(range.end, "MMM d, yyyy")}`;
};

const formatShortLabel = (range: DateRange, mode: DateScopeMode): string => {
  if (mode === "monthly") {
    return format(range.start, "MMM yyyy");
  }
  if (mode === "weekly") {
    return `Week of ${format(range.start, "MMM d")}`;
  }
  return `${format(range.start, "M/d")} – ${format(range.end, "M/d")}`;
};

export function useDateScope(defaultMode: DateScopeMode = "monthly"): UseDateScopeReturn {
  const [location, setLocation] = useLocation();
  
  const [mode, setModeState] = useState<DateScopeMode>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("scope");
      if (urlMode === "monthly" || urlMode === "weekly" || urlMode === "custom") {
        return urlMode;
      }
      const stored = localStorage.getItem("finance_scope_mode");
      if (stored === "monthly" || stored === "weekly" || stored === "custom") {
        return stored as DateScopeMode;
      }
    }
    return defaultMode;
  });

  const [anchor, setAnchor] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const startParam = params.get("start");
      if (startParam) {
        const parsed = parseISO(startParam);
        if (isValid(parsed)) return parsed;
      }
    }
    return new Date();
  });

  const [customEnd, setCustomEnd] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const endParam = params.get("end");
      if (endParam) {
        const parsed = parseISO(endParam);
        if (isValid(parsed)) return parsed;
      }
    }
    return new Date();
  });

  const range = useMemo((): DateRange => {
    if (mode === "monthly") {
      return getMonthRange(anchor);
    }
    if (mode === "weekly") {
      return getWeekRange(anchor);
    }
    return { start: anchor, end: customEnd };
  }, [mode, anchor, customEnd]);

  const scope = useMemo((): DateScope => ({
    mode,
    range,
    label: formatRangeLabel(range, mode),
    shortLabel: formatShortLabel(range, mode)
  }), [mode, range]);

  const setMode = useCallback((newMode: DateScopeMode) => {
    setModeState(newMode);
    localStorage.setItem("finance_scope_mode", newMode);
    if (newMode !== "custom") {
      setAnchor(new Date());
    }
  }, []);

  const goNext = useCallback(() => {
    if (mode === "monthly") {
      setAnchor(prev => addMonths(prev, 1));
    } else if (mode === "weekly") {
      setAnchor(prev => addWeeks(prev, 1));
    }
  }, [mode]);

  const goPrev = useCallback(() => {
    if (mode === "monthly") {
      setAnchor(prev => subMonths(prev, 1));
    } else if (mode === "weekly") {
      setAnchor(prev => subWeeks(prev, 1));
    }
  }, [mode]);

  const goToday = useCallback(() => {
    setAnchor(new Date());
  }, []);

  const setCustomRange = useCallback((start: Date, end: Date) => {
    setModeState("custom");
    setAnchor(start);
    setCustomEnd(end);
    localStorage.setItem("finance_scope_mode", "custom");
  }, []);

  const isInRange = useCallback((date: Date): boolean => {
    const d = new Date(date);
    return d >= range.start && d <= range.end;
  }, [range]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("scope", mode);
    params.set("start", format(anchor, "yyyy-MM-dd"));
    if (mode === "custom") {
      params.set("end", format(customEnd, "yyyy-MM-dd"));
    }
  }, [mode, anchor, customEnd]);

  return {
    scope,
    mode,
    setMode,
    goNext,
    goPrev,
    goToday,
    setCustomRange,
    isInRange
  };
}
