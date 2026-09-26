import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ZankyoStar } from "@/components/ZankyoStar";
import { useCustomerStore, useCustomerToken } from "@/stores/customerStore";

type AuthSearch = { next?: string | undefined };

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    next: typeof s["next"] === "string" && s["next"].startsWith("/") && !s["next"].startsWith("//") ? s["next"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "description", content: "Sign in or create your ZANKYO account to track orders and save addresses." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in to your ZANKYO account." },
    ],
  }),
  component: AuthPage,
});

const inputCls = "w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const token = useCustomerToken();
  const { login, register, recover } = useCustomerStore();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) navigate({ to: (next ?? "/account") as "/account", replace: true });
  }, [token, next, navigate]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      if (mode === "signup") {
        await register({ firstName: form.firstName.trim(), lastName: form.lastName.trim(), email, password: form.password });
        toast.success("Welcome to ZANKYO!");
      } else if (mode === "signin") {
        await login(email, form.password);
        toast.success("Welcome back!");
      } else {
        await recover(email);
        toast.success("If that email has an account, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-center text-4xl">
        {mode === "signup" ? "Create account" : mode === "forgot" ? "Reset password" : "Sign in"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">Track orders, save addresses and keep your saved items.</p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        {mode === "signup" && (
          <div className="grid grid-cols-2 gap-3">
            <input required value={form.firstName} onChange={set("firstName")} placeholder="First name" className={inputCls} />
            <input value={form.lastName} onChange={set("lastName")} placeholder="Last name" className={inputCls} />
          </div>
        )}
        <input type="email" required value={form.email} onChange={set("email")} placeholder="Email" autoComplete="email" className={inputCls} />
        {mode !== "forgot" && (
          <input type="password" required minLength={mode === "signup" ? 5 : 1} value={form.password} onChange={set("password")} placeholder="Password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"} className={inputCls} />
        )}
        <button disabled={busy} className="zk-label w-full rounded-full bg-foreground py-3 text-xs text-background disabled:opacity-50">
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>
      </form>
      <div className="mt-5 space-y-2 text-center text-sm text-muted-foreground">
        {mode === "signin" && (
          <>
            <button type="button" onClick={() => setMode("forgot")} className="block w-full hover:text-foreground">Forgot password?</button>
            <button type="button" onClick={() => setMode("signup")} className="block w-full hover:text-foreground">New here? <u>Create an account</u></button>
          </>
        )}
        {mode !== "signin" && (
          <button type="button" onClick={() => setMode("signin")} className="block w-full hover:text-foreground">Already have an account? <u>Sign in</u></button>
        )}
      </div>
    </div>
  );
}
