import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AuthenticationResult,
  User,
  authenticate,
  authenticateWithGoogle,
  logout,
  restoreUser,
} from "./api";

type SessionContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (
    mode: "login" | "register",
    values: { name?: string; email: string; password: string },
  ) => Promise<AuthenticationResult>;
  signOut: () => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  refresh: () => Promise<void>;
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
    const result = await authenticate(mode, values);
    if ("verification_required" in result) return result;
    setUser(result.user ?? (await restoreUser()));
    return result;
  };
  const signOut = async () => {
    await logout();
    setUser(null);
  };
  const signInWithGoogle = async (idToken: string) => {
    const result = await authenticateWithGoogle(idToken);
    setUser(result.user ?? (await restoreUser()));
  };
  const refresh = async () => {
    setUser(await restoreUser());
  };
  return (
    <SessionContext.Provider
      value={{ user, loading, signIn, signInWithGoogle, signOut, refresh }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
