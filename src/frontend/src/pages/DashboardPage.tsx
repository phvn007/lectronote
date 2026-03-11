import { Calendar } from "@/components/Calendar";
import { PeriodCard } from "@/components/PeriodCard";
import { RecordClassDialog } from "@/components/RecordClassDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useClass } from "@/context/ClassContext";
import { useGetPeriodsForDate } from "@/hooks/useQueries";
import { encodeClassId } from "@/utils/classRegistry";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  Clock,
  LogOut,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

function getTodayYYYYMMDD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDisplayDate(dateStr: string): string {
  // dateStr: YYYYMMDD
  const year = Number.parseInt(dateStr.slice(0, 4));
  const month = Number.parseInt(dateStr.slice(4, 6)) - 1;
  const day = Number.parseInt(dateStr.slice(6, 8));
  const d = new Date(year, month, day);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { classId, className, classYear, isLoggedIn, logout } = useClass();
  const todayStr = getTodayYYYYMMDD();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate({ to: "/" });
    }
  }, [isLoggedIn, navigate]);

  const isToday = selectedDate === todayStr;
  const isFuture = selectedDate > todayStr;
  const isPast = selectedDate < todayStr;

  const periodsQuery = useGetPeriodsForDate(
    isToday || isPast ? classId : null,
    selectedDate,
  );

  if (!isLoggedIn || !classId) return null;

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen gradient-mesh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/generated/lectronote-logo-transparent.dim_200x200.png"
              alt="LectroNote"
              className="h-8 w-8 object-contain"
            />
            <span className="font-display font-bold text-lg text-foreground hidden sm:block">
              Lect<span className="text-primary">ro</span>Note
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2 text-muted-foreground hover:text-foreground"
            data-ocid="dashboard.logout.button"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Class Info */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border/60 rounded-xl p-5 shadow-card"
          data-ocid="dashboard.class.card"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground leading-tight truncate">
                {className}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary" className="font-medium text-xs">
                  Academic Year: {classYear}
                </Badge>
                <Badge
                  variant="outline"
                  className="font-mono text-xs tracking-wider"
                >
                  ID: {encodeClassId(classId)}
                </Badge>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Calendar */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="bg-card border border-border/60 rounded-xl p-5 shadow-card"
          data-ocid="dashboard.calendar.section"
        >
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display font-semibold text-base text-foreground">
              Session Calendar
            </h2>
          </div>
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </motion.section>

        {/* Date Content */}
        <motion.section
          key={selectedDate}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          data-ocid="dashboard.date.section"
        >
          {/* Selected Date Header */}
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-muted-foreground">
              {formatDisplayDate(selectedDate)}
            </p>
            {isToday && <Badge className="text-xs font-semibold">Today</Badge>}
          </div>

          <Separator className="mb-5" />

          {/* Today — Record Option + Recorded Periods */}
          {isToday && (
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="rounded-full bg-primary/10 p-4 mb-1">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground">
                  Ready to Record?
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Add a period entry for today's class with bilingual summaries.
                </p>
                <RecordClassDialog
                  classId={classId}
                  date={selectedDate}
                  displayDate={formatDisplayDate(selectedDate)}
                />
              </div>

              {/* Today's recorded periods */}
              {periodsQuery.isLoading && (
                <div
                  className="space-y-3"
                  data-ocid="dashboard.today_periods.loading_state"
                >
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              )}

              {periodsQuery.isSuccess && periodsQuery.data.length > 0 && (
                <div
                  className="space-y-3"
                  data-ocid="dashboard.today_periods.list"
                >
                  <p className="text-sm font-medium text-foreground">
                    Today's recorded sessions ({periodsQuery.data.length} period
                    {periodsQuery.data.length !== 1 ? "s" : ""})
                  </p>
                  {periodsQuery.data
                    .slice()
                    .sort(
                      (a, b) => Number(a.periodNumber) - Number(b.periodNumber),
                    )
                    .map((period, idx) => (
                      <PeriodCard
                        key={period.id.toString()}
                        period={period}
                        index={idx + 1}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Future Date — Warning */}
          {isFuture && (
            <Alert data-ocid="dashboard.future.error_state">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No classes can be recorded for future dates.
              </AlertDescription>
            </Alert>
          )}

          {/* Past Date — Show Periods */}
          {isPast && (
            <div>
              {periodsQuery.isLoading && (
                <div
                  className="space-y-3"
                  data-ocid="dashboard.periods.loading_state"
                >
                  <Skeleton className="h-28 w-full rounded-xl" />
                  <Skeleton className="h-28 w-full rounded-xl" />
                </div>
              )}

              {periodsQuery.isError && (
                <Alert
                  variant="destructive"
                  data-ocid="dashboard.periods.error_state"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load periods. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              {periodsQuery.isSuccess && periodsQuery.data.length === 0 && (
                <div
                  className="flex flex-col items-center gap-2 py-8 text-center"
                  data-ocid="dashboard.periods.empty_state"
                >
                  <div className="rounded-full bg-muted p-3 mb-1">
                    <CalendarDays className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">
                    No sessions recorded
                  </p>
                  <p className="text-sm text-muted-foreground">
                    No periods were recorded for this date.
                  </p>
                </div>
              )}

              {periodsQuery.isSuccess && periodsQuery.data.length > 0 && (
                <div className="space-y-3" data-ocid="dashboard.periods.list">
                  <p className="text-sm text-muted-foreground mb-4">
                    {periodsQuery.data.length} period
                    {periodsQuery.data.length !== 1 ? "s" : ""} recorded
                  </p>
                  {periodsQuery.data
                    .slice()
                    .sort(
                      (a, b) => Number(a.periodNumber) - Number(b.periodNumber),
                    )
                    .map((period, idx) => (
                      <PeriodCard
                        key={period.id.toString()}
                        period={period}
                        index={idx + 1}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border/40">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
