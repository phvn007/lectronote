import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminEntry {
  email: string;
  password: string;
}

interface AdminContextValue {
  isAdminLoggedIn: boolean;
  loggedInEmail: string;
  adminLogin: (email: string, password: string) => boolean;
  adminLogout: () => void;
  addAdmin: (email: string, password: string) => boolean;
  removeAdmin: (email: string) => void;
  getAdmins: () => Array<{ email: string }>;
}

// ─── Storage keys ────────────────────────────────────────────────────────────

const ADMINS_KEY = "lectronote_admins";
const ADMIN_SESSION_KEY = "lectronote_admin";

const DEFAULT_ADMINS: AdminEntry[] = [
  { email: "phvnaidu007@gmail.com", password: "Phvn@007" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadAdmins(): AdminEntry[] {
  try {
    const raw = localStorage.getItem(ADMINS_KEY);
    if (!raw) {
      localStorage.setItem(ADMINS_KEY, JSON.stringify(DEFAULT_ADMINS));
      return DEFAULT_ADMINS;
    }
    return JSON.parse(raw) as AdminEntry[];
  } catch {
    return DEFAULT_ADMINS;
  }
}

function saveAdmins(admins: AdminEntry[]): void {
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
}

function loadAdminSession(): { loggedIn: boolean; email: string } {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return { loggedIn: false, email: "" };
    const parsed = JSON.parse(raw);
    return {
      loggedIn: parsed.loggedIn === true,
      email: parsed.email ?? "",
    };
  } catch {
    return { loggedIn: false, email: "" };
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const session = loadAdminSession();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(
    session.loggedIn,
  );
  const [loggedInEmail, setLoggedInEmail] = useState<string>(session.email);

  const adminLogin = useCallback((email: string, password: string): boolean => {
    const admins = loadAdmins();
    const match = admins.find(
      (a) =>
        a.email.trim().toLowerCase() === email.trim().toLowerCase() &&
        a.password === password,
    );
    if (match) {
      sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({ loggedIn: true, email: match.email }),
      );
      setIsAdminLoggedIn(true);
      setLoggedInEmail(match.email);
      return true;
    }
    return false;
  }, []);

  const adminLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdminLoggedIn(false);
    setLoggedInEmail("");
  }, []);

  const addAdmin = useCallback((email: string, password: string): boolean => {
    const admins = loadAdmins();
    const exists = admins.some(
      (a) => a.email.trim().toLowerCase() === email.trim().toLowerCase(),
    );
    if (exists) return false;
    const updated = [...admins, { email: email.trim(), password }];
    saveAdmins(updated);
    return true;
  }, []);

  const removeAdmin = useCallback((email: string): void => {
    const admins = loadAdmins();
    if (admins.length <= 1) return; // always keep at least 1
    const updated = admins.filter(
      (a) => a.email.trim().toLowerCase() !== email.trim().toLowerCase(),
    );
    saveAdmins(updated);
  }, []);

  const getAdmins = useCallback((): Array<{ email: string }> => {
    return loadAdmins().map((a) => ({ email: a.email }));
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAdminLoggedIn,
        loggedInEmail,
        adminLogin,
        adminLogout,
        addAdmin,
        removeAdmin,
        getAdmins,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
