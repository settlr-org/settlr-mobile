import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { User, authenticate, logout, restoreUser } from "./api";

type SessionContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (
    mode: "login" | "register",
    values: { name?: string; email: string; password: string },
  ) => Promise<void>;
  signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    restoreUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);
  const signIn = async (
    mode: "login" | "register",
    values: { name?: string; email: string; password: string },
  ) => {
    const session = await authenticate(mode, values);
    setUser(session.user ?? (await restoreUser()));
  };
  const signOut = async () => {
    await logout();
    setUser(null);
  };
  return (
    <SessionContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
