import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface ClassState {
  classId: bigint | null;
  className: string;
  classYear: string;
}

interface ClassContextValue extends ClassState {
  login: (classId: bigint, className: string, classYear: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const ClassContext = createContext<ClassContextValue | null>(null);

const SESSION_KEY = "lectronote_class";

function loadFromSession(): ClassState {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { classId: null, className: "", classYear: "" };
    const parsed = JSON.parse(raw);
    return {
      classId: parsed.classId ? BigInt(parsed.classId) : null,
      className: parsed.className ?? "",
      classYear: parsed.classYear ?? "",
    };
  } catch {
    return { classId: null, className: "", classYear: "" };
  }
}

export function ClassProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClassState>(loadFromSession);

  useEffect(() => {
    if (state.classId !== null) {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          classId: state.classId.toString(),
          className: state.className,
          classYear: state.classYear,
        }),
      );
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }, [state]);

  const login = (classId: bigint, className: string, classYear: string) => {
    setState({ classId, className, classYear });
  };

  const logout = () => {
    setState({ classId: null, className: "", classYear: "" });
  };

  return (
    <ClassContext.Provider
      value={{
        ...state,
        login,
        logout,
        isLoggedIn: state.classId !== null,
      }}
    >
      {children}
    </ClassContext.Provider>
  );
}

export function useClass() {
  const ctx = useContext(ClassContext);
  if (!ctx) throw new Error("useClass must be used within ClassProvider");
  return ctx;
}
