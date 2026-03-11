import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface CalendarProps {
  selectedDate: string | null; // YYYYMMDD
  onSelectDate: (date: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dateToYYYYMMDD(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}${mm}${dd}`;
}

function getTodayYYYYMMDD(): string {
  const now = new Date();
  return dateToYYYYMMDD(now.getFullYear(), now.getMonth(), now.getDate());
}

export function Calendar({ selectedDate, onSelectDate }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const todayStr = getTodayYYYYMMDD();

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={prevMonth}
          data-ocid="calendar.pagination_prev"
          aria-label="Previous month"
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-display font-semibold text-base text-foreground">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          data-ocid="calendar.pagination_next"
          aria-label="Next month"
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            // biome-ignore lint/suspicious/noArrayIndexKey: empty calendar cells are positional placeholders, not reorderable items
            return <div key={`empty-${idx}`} />;
          }

          const dateStr = dateToYYYYMMDD(viewYear, viewMonth, day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const isFuture = dateStr > todayStr;

          return (
            <button
              type="button"
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              data-ocid={`calendar.item.${day}`}
              aria-label={`${day} ${MONTHS[viewMonth]} ${viewYear}${isToday ? " (Today)" : ""}`}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "relative flex items-center justify-center h-9 w-full rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isToday && !isSelected && "calendar-today font-bold shadow-sm",
                isSelected && "calendar-selected ring-2 ring-primary/50",
                !isToday &&
                  !isSelected &&
                  !isFuture &&
                  "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                !isToday &&
                  !isSelected &&
                  isFuture &&
                  "text-muted-foreground/50 cursor-pointer hover:bg-accent/50",
                isSelected &&
                  isToday &&
                  "calendar-today ring-2 ring-primary/50 font-bold",
              )}
            >
              {day}
              {isToday && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-current opacity-70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
