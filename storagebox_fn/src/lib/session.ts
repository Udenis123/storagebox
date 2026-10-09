import type { Profile, Session } from "./types";

const SESSION_KEY = "storagebox.session";
type Listener = () => void;

const listeners = new Set<Listener>();

function load(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let current: Session | null = load();

const emit = (): void => listeners.forEach((listener) => listener());

/** Tiny external store so React (via useSyncExternalStore) and the API client share one session. */
export const sessionStore = {
  get: (): Session | null => current,
  set(next: Session | null): void {
    current = next;
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
    emit();
  },
  updateTokens(tokens: Pick<Session, "accessToken" | "refreshToken">): void {
    if (current) this.set({ ...current, ...tokens });
  },
  updateUser(user: Profile): void {
    if (current) this.set({ ...current, user });
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

window.addEventListener("storage", (event) => {
  if (event.key !== SESSION_KEY) return;
  current = load();
  emit();
});

export const DASHBOARD_HOME = "/overview";
export const ADMIN_HOME = "/admin";

export const homePathFor = (user: Pick<Profile, "role"> | null): string => (user?.role === "ADMIN" ? ADMIN_HOME : DASHBOARD_HOME);

/** Only same-origin paths are allowed as post-login destinations. */
export function safeReturnPath(value: string | null | undefined): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

export const loginPathFor = (returnTo: string): string => `/login?callbackUrl=${encodeURIComponent(returnTo)}`;
