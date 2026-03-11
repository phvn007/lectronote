import type { CourseRecord } from "@/backend.d.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdmin } from "@/context/AdminContext";
import { useDeleteCourse, useGetAllCourses } from "@/hooks/useQueries";
import { encodeClassId, hardDeleteClass } from "@/utils/classRegistry";
import { useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function AdminPage() {
  const navigate = useNavigate();
  const {
    isAdminLoggedIn,
    loggedInEmail,
    adminLogout,
    addAdmin,
    removeAdmin,
    getAdmins,
  } = useAdmin();

  // ── Backend course data ─────────────────────────────────────────
  const coursesQuery = useGetAllCourses();
  const deleteMutation = useDeleteCourse();

  // ── Delete dialog state ─────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<CourseRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Admin management state ──────────────────────────────────────
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminList, setAdminList] = useState<Array<{ email: string }>>([]);

  // Refresh admin list from context
  const refreshAdminList = useCallback(() => {
    setAdminList(getAdmins());
  }, [getAdmins]);

  useEffect(() => {
    if (!isAdminLoggedIn) {
      navigate({ to: "/" });
      return;
    }
    refreshAdminList();
  }, [isAdminLoggedIn, navigate, refreshAdminList]);

  if (!isAdminLoggedIn) return null;

  // ── Handlers ────────────────────────────────────────────────────

  const handleDeleteClick = (record: CourseRecord) => {
    setDeleteTarget(record);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const displayId = encodeClassId(deleteTarget.id);
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        hardDeleteClass(displayId);
        setDialogOpen(false);
        setDeleteTarget(null);
        toast.success(`Class "${deleteTarget.name}" deleted permanently.`);
      },
      onError: () => {
        setDialogOpen(false);
        setDeleteTarget(null);
        toast.error("Failed to delete class. Please try again.");
      },
    });
  };

  const handleDeleteCancel = () => {
    setDialogOpen(false);
    setDeleteTarget(null);
  };

  const handleLogout = () => {
    adminLogout();
    navigate({ to: "/" });
  };

  const handleAddAdmin = () => {
    const emailTrimmed = newAdminEmail.trim();
    const passTrimmed = newAdminPassword.trim();
    if (!emailTrimmed || !passTrimmed) {
      toast.error("Email and password are required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    const success = addAdmin(emailTrimmed, passTrimmed);
    if (success) {
      setNewAdminEmail("");
      setNewAdminPassword("");
      refreshAdminList();
      toast.success(`Admin "${emailTrimmed}" added successfully.`);
    } else {
      toast.error("An admin with this email already exists.");
    }
  };

  const handleRemoveAdmin = (email: string) => {
    if (adminList.length <= 1) {
      toast.error("Cannot remove the last admin account.");
      return;
    }
    removeAdmin(email);
    refreshAdminList();
    toast.success(`Admin "${email}" removed.`);
  };

  const courses = coursesQuery.data ?? [];

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      data-ocid="admin.page"
    >
      {/* ── Admin Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border/60 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/assets/generated/lectronote-logo-transparent.dim_200x200.png"
                alt="LectroNote"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-display font-bold text-lg text-foreground">
                Lect<span className="text-primary">ro</span>Note
              </span>
              <Badge
                variant="secondary"
                className="hidden sm:flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 font-semibold px-2 py-0.5 text-xs"
              >
                <img
                  src="/assets/generated/admin-shield-logo-transparent.dim_200x200.png"
                  alt="Admin"
                  className="h-3.5 w-3.5 object-contain"
                />
                Admin
              </Badge>
            </div>
          </div>

          {/* Right: admin badge + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Admin Panel
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-ocid="admin.logout.button"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 space-y-8">
        {/* Page Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-4"
        >
          <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-xs">
            <img
              src="/assets/generated/admin-shield-logo-transparent.dim_200x200.png"
              alt="Admin Panel"
              className="h-9 w-9 object-contain"
            />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground leading-tight">
              Class Management
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View and manage all registered classes across all browsers
            </p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex gap-4 flex-wrap"
        >
          <div className="bg-card border border-border/60 rounded-xl px-5 py-4 shadow-card flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-foreground">
                {coursesQuery.isLoading ? (
                  <Skeleton className="h-7 w-8 inline-block" />
                ) : (
                  courses.length
                )}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Active Classes
              </p>
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-xl px-5 py-4 shadow-card flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-foreground">
                {adminList.length}
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                Admin Accounts
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Classes Table ──────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-card border border-border/60 rounded-2xl shadow-card overflow-hidden"
          data-ocid="admin.class.table"
        >
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="font-display font-semibold text-base text-foreground">
              Registered Classes
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All classes registered across all devices
            </p>
          </div>

          {coursesQuery.isLoading ? (
            <div
              className="p-5 space-y-3"
              data-ocid="admin.classes.loading_state"
            >
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : coursesQuery.isError ? (
            <div
              className="flex flex-col items-center gap-3 py-12 text-center px-6"
              data-ocid="admin.classes.error_state"
            >
              <p className="text-sm text-destructive font-medium">
                Failed to load classes. Please refresh.
              </p>
            </div>
          ) : courses.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 py-16 text-center px-6"
              data-ocid="admin.classes.empty_state"
            >
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-display font-semibold text-foreground">
                  No classes registered yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Classes will appear here once teachers register them.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                      #
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                      Class Name
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                      Year
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-xs uppercase tracking-wide">
                      Class ID
                    </TableHead>
                    <TableHead className="font-semibold text-foreground/70 text-xs uppercase tracking-wide text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((record, idx) => {
                    const displayId = encodeClassId(record.id);
                    const isDeleting =
                      deleteMutation.isPending &&
                      deleteTarget?.id === record.id;
                    return (
                      <TableRow
                        key={record.id.toString()}
                        className="group hover:bg-muted/30 transition-colors"
                        data-ocid={`admin.class.row.${idx + 1}`}
                      >
                        <TableCell className="text-muted-foreground text-sm w-10">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {record.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {record.year}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs tracking-wider"
                          >
                            {displayId}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(record)}
                            disabled={isDeleting || deleteMutation.isPending}
                            className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            data-ocid={`admin.class.delete_button.${idx + 1}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline text-xs">
                              {isDeleting ? "Deleting..." : "Delete"}
                            </span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.section>

        {/* ── Admin Access Management ────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.22 }}
          data-ocid="admin.access.section"
        >
          <Card className="border-border/60 shadow-card">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="font-display text-base">
                    Admin Access Management
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Add or remove admin accounts. At least one admin must
                    remain.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Admin Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Add New Admin
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-admin-email"
                      className="text-xs font-medium"
                    >
                      Email Address
                    </Label>
                    <Input
                      id="new-admin-email"
                      type="email"
                      placeholder="admin@example.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      data-ocid="admin.new_admin_email.input"
                      className="h-10"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-admin-password"
                      className="text-xs font-medium"
                    >
                      Password
                    </Label>
                    <Input
                      id="new-admin-password"
                      type="password"
                      placeholder="Set a password"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      data-ocid="admin.new_admin_password.input"
                      className="h-10"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddAdmin}
                  size="sm"
                  className="gap-2"
                  data-ocid="admin.add_admin.button"
                >
                  <UserPlus className="h-4 w-4" />
                  Add Admin
                </Button>
              </div>

              <Separator />

              {/* Current Admins List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  Current Admins
                </h3>
                {adminList.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground py-4 text-center"
                    data-ocid="admin.admins.empty_state"
                  >
                    No admins found.
                  </p>
                ) : (
                  <div className="space-y-2" data-ocid="admin.admins.list">
                    {adminList.map((admin, idx) => {
                      const isSelf =
                        admin.email.trim().toLowerCase() ===
                        loggedInEmail.trim().toLowerCase();
                      const isOnlyAdmin = adminList.length <= 1;
                      const canRemove = !isSelf && !isOnlyAdmin;
                      return (
                        <div
                          key={admin.email}
                          className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-2.5"
                          data-ocid={`admin.admins.item.${idx + 1}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-7 w-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                            </div>
                            <span className="text-sm font-medium text-foreground truncate">
                              {admin.email}
                            </span>
                            {isSelf && (
                              <Badge
                                variant="secondary"
                                className="text-xs shrink-0 bg-primary/10 text-primary border-primary/20"
                              >
                                You
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdmin(admin.email)}
                            disabled={!canRemove}
                            className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                            title={
                              isSelf
                                ? "Cannot remove yourself"
                                : isOnlyAdmin
                                  ? "Cannot remove the last admin"
                                  : `Remove ${admin.email}`
                            }
                            data-ocid={`admin.admins.delete_button.${idx + 1}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
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

      {/* ── Delete Confirmation Dialog ─────────────────────────── */}
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
      >
        <AlertDialogContent data-ocid="admin.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the class{" "}
              <strong>{deleteTarget?.name}</strong> (ID:{" "}
              <code className="font-mono text-xs">
                {deleteTarget ? encodeClassId(deleteTarget.id) : ""}
              </code>
              ) and all its recorded periods from the backend. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={handleDeleteCancel}
              disabled={deleteMutation.isPending}
              data-ocid="admin.delete.cancel_button"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="admin.delete.confirm_button"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete Class"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
