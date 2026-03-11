import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdmin } from "@/context/AdminContext";
import { useClass } from "@/context/ClassContext";
import { useLoginCourse, useRegisterCourse } from "@/hooks/useQueries";
import {
  addToRegistry,
  decodeClassId,
  encodeClassId,
} from "@/utils/classRegistry";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  Copy,
  Loader2,
  Shield,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useClass();
  const { adminLogin } = useAdmin();

  // Login state
  const [loginClassId, setLoginClassId] = useState("");
  const [loginError, setLoginError] = useState("");

  // Register state
  const [className, setClassName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [studyingYear, setStudyingYear] = useState("");
  const [registeredId, setRegisteredId] = useState<bigint | null>(null);
  const [registeredDisplayId, setRegisteredDisplayId] = useState("");
  const [copied, setCopied] = useState(false);

  // Admin login state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const loginMutation = useLoginCourse();
  const registerMutation = useRegisterCourse();

  // ─── Class Login ───────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const trimmed = loginClassId.trim().toUpperCase();
    if (!trimmed) {
      setLoginError("Please enter a Class ID");
      return;
    }

    let classId: bigint;
    try {
      classId = decodeClassId(trimmed);
    } catch {
      setLoginError(
        "Invalid Class ID format. Please enter your 8-character alphanumeric Class ID.",
      );
      return;
    }

    loginMutation.mutate(classId, {
      onSuccess: (record) => {
        login(record.id, record.name, record.year);
        navigate({ to: "/dashboard" });
      },
      onError: () => {
        setLoginError("Invalid Class ID. Please check and try again.");
      },
    });
  };

  // ─── Class Registration ────────────────────────────────────

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = className.trim();
    const trimmedYear = classYear.trim();

    if (!trimmedName || !trimmedYear || !studyingYear) {
      toast.error("Please fill in all fields");
      return;
    }

    const combinedYear = `${trimmedYear} · ${studyingYear}`;

    // Backend will reject duplicates -- no local check needed
    registerMutation.mutate(
      { name: trimmedName, year: combinedYear },
      {
        onSuccess: (newId) => {
          const displayId = encodeClassId(newId);
          addToRegistry({
            backendId: newId.toString(),
            displayId,
            name: trimmedName,
            year: combinedYear,
            createdAt: Date.now(),
          });
          setRegisteredId(newId);
          setRegisteredDisplayId(displayId);
          toast.success("Class registered successfully!");
        },
        onError: (err) => {
          const msg = err?.message ?? "";
          if (msg.includes("already exists")) {
            toast.error(
              "A class with this name and year is already registered.",
            );
          } else {
            toast.error("Failed to register class. Please try again.");
          }
        },
      },
    );
  };

  const copyClassId = async () => {
    if (!registeredDisplayId) return;
    await navigator.clipboard.writeText(registeredDisplayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Class ID copied to clipboard!");
  };

  // ─── Admin Login ───────────────────────────────────────────

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    // Simulate slight async for UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    const success = adminLogin(adminEmail.trim(), adminPassword);
    setAdminLoading(false);

    if (success) {
      navigate({ to: "/admin" });
    } else {
      setAdminError("Invalid admin credentials.");
    }
  };

  return (
    <div className="min-h-screen gradient-mesh flex flex-col">
      {/* Header */}
      <header className="pt-10 pb-6 flex flex-col items-center gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <div className="relative">
            <img
              src="/assets/generated/lectronote-logo-transparent.dim_200x200.png"
              alt="LectroNote"
              className="h-16 w-16 object-contain"
            />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Lect<span className="text-primary">ro</span>Note
            </h1>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Class Session Tracker
            </p>
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <Tabs defaultValue="login" className="w-full">
            <TabsList
              className="grid w-full grid-cols-3 mb-6 h-11"
              data-ocid="auth.tab"
            >
              <TabsTrigger
                value="login"
                className="font-medium text-xs sm:text-sm"
                data-ocid="auth.login.tab"
              >
                <BookOpen className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">Login</span>
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="font-medium text-xs sm:text-sm"
                data-ocid="auth.register.tab"
              >
                <Zap className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">Register</span>
                <span className="sm:hidden">Register</span>
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="font-medium text-xs sm:text-sm"
                data-ocid="auth.admin.tab"
              >
                <Shield className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="hidden sm:inline">Admin</span>
                <span className="sm:hidden">Admin</span>
              </TabsTrigger>
            </TabsList>

            {/* ── Login Tab ── */}
            <TabsContent value="login" className="animate-slide-up">
              <Card className="shadow-elevated border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-xl">
                    Welcome Back
                  </CardTitle>
                  <CardDescription>
                    Enter your Class ID to access your dashboard and session
                    records.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="classId">Class ID</Label>
                      <Input
                        id="classId"
                        type="text"
                        placeholder="Enter your 8-character Class ID (e.g. AB12CD34)"
                        value={loginClassId}
                        onChange={(e) => {
                          setLoginClassId(e.target.value);
                          setLoginError("");
                        }}
                        data-ocid="login.input"
                        className="h-11 font-mono text-base tracking-wider"
                        autoComplete="off"
                        disabled={loginMutation.isPending}
                        maxLength={8}
                      />
                    </div>

                    {loginError && (
                      <Alert
                        variant="destructive"
                        data-ocid="login.error_state"
                      >
                        <AlertDescription>{loginError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold"
                      disabled={loginMutation.isPending}
                      data-ocid="login.submit_button"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Login to Class"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Register Tab ── */}
            <TabsContent value="register" className="animate-slide-up">
              <Card className="shadow-elevated border-border/60">
                <CardHeader className="pb-4">
                  <CardTitle className="font-display text-xl">
                    Register New Class
                  </CardTitle>
                  <CardDescription>
                    Create a new class to start tracking sessions. A unique
                    Class ID will be generated.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {registeredId !== null ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                      data-ocid="register.success_state"
                    >
                      <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 text-center space-y-3">
                        <CheckCircle2 className="h-10 w-10 text-primary mx-auto" />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Your Class ID
                          </p>
                          <p className="font-mono font-bold text-3xl text-foreground tracking-[0.2em]">
                            {registeredDisplayId}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Save this ID to log in to your class later.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyClassId}
                          data-ocid="register.copy.button"
                          className="gap-2"
                        >
                          {copied ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy Class ID
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="text-center space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Class{" "}
                          <Badge variant="secondary" className="font-medium">
                            {className}
                          </Badge>{" "}
                          ({classYear}) is ready!
                        </p>
                      </div>

                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          if (registeredId !== null) {
                            login(registeredId, className, classYear);
                            navigate({ to: "/dashboard" });
                          }
                        }}
                        data-ocid="register.goto_dashboard.button"
                      >
                        Go to Dashboard
                      </Button>

                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setRegisteredId(null);
                          setRegisteredDisplayId("");
                          setClassName("");
                          setClassYear("");
                          setStudyingYear("");
                          registerMutation.reset();
                        }}
                        data-ocid="register.reset.button"
                      >
                        Register Another Class
                      </Button>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-className">Class Name</Label>
                        <Input
                          id="reg-className"
                          type="text"
                          placeholder="e.g. Computer Science 101"
                          value={className}
                          onChange={(e) => setClassName(e.target.value)}
                          data-ocid="register.name.input"
                          className="h-11"
                          disabled={registerMutation.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-year">Academic Year</Label>
                        <Input
                          id="reg-year"
                          type="text"
                          placeholder="e.g. 2025–2026"
                          value={classYear}
                          onChange={(e) => setClassYear(e.target.value)}
                          data-ocid="register.year.input"
                          className="h-11"
                          disabled={registerMutation.isPending}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-studying-year">Studying Year</Label>
                        <Select
                          value={studyingYear}
                          onValueChange={setStudyingYear}
                          disabled={registerMutation.isPending}
                        >
                          <SelectTrigger
                            id="reg-studying-year"
                            className="h-11"
                            data-ocid="register.studying_year.select"
                          >
                            <SelectValue placeholder="Select year of study" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st Year">1st Year</SelectItem>
                            <SelectItem value="2nd Year">2nd Year</SelectItem>
                            <SelectItem value="3rd Year">3rd Year</SelectItem>
                            <SelectItem value="4th Year">4th Year</SelectItem>
                            <SelectItem value="5th Year">5th Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {registerMutation.isError && (
                        <Alert
                          variant="destructive"
                          data-ocid="register.error_state"
                        >
                          <AlertDescription>
                            {registerMutation.error?.message?.includes(
                              "already exists",
                            )
                              ? "A class with this name and year is already registered."
                              : "Registration failed. Please try again."}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        className="w-full h-11 font-semibold"
                        disabled={registerMutation.isPending}
                        data-ocid="register.submit_button"
                      >
                        {registerMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Class...
                          </>
                        ) : (
                          "Create & Get Class ID"
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Admin Login Tab ── */}
            <TabsContent value="admin" className="animate-slide-up">
              <Card className="shadow-elevated border-border/60">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                      <img
                        src="/assets/generated/admin-shield-logo-transparent.dim_200x200.png"
                        alt="Admin"
                        className="h-6 w-6 object-contain"
                      />
                    </div>
                    <CardTitle className="font-display text-xl">
                      Admin Login
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Restricted access. Admin credentials required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        placeholder="admin@example.com"
                        value={adminEmail}
                        onChange={(e) => {
                          setAdminEmail(e.target.value);
                          setAdminError("");
                        }}
                        data-ocid="admin_login.email.input"
                        className="h-11"
                        autoComplete="email"
                        disabled={adminLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="Enter admin password"
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          setAdminError("");
                        }}
                        data-ocid="admin_login.password.input"
                        className="h-11"
                        autoComplete="current-password"
                        disabled={adminLoading}
                      />
                    </div>

                    {adminError && (
                      <Alert
                        variant="destructive"
                        data-ocid="admin_login.error_state"
                      >
                        <AlertDescription>{adminError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={adminLoading}
                      data-ocid="admin_login.submit_button"
                    >
                      {adminLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Login as Admin
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
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
