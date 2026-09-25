import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ZankyoStar } from "@/components/ZankyoStar";
import { useCustomerStore } from "@/stores/customerStore";
import { customerRecover } from "@/lib/shopifyCustomer";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ZANKYO" },
      { name: "description", content: "Sign in or create your ZANKYO account to track orders and save addresses." },
      { property: "og:title", content: "Sign in — ZANKYO" },
      { property: "og:description", content: "Sign in or create your ZANKYO account." },
    ],
  }),
  component: AuthPage,
});

const inputCls =
  "w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground";

function AuthPage() {
  const navigate = useNavigate();
  const login = useCustomerStore((s) => s.login);
  const register = useCustomerStore((s) => s.register);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        await register({ firstName, lastName, email, password });
        toast.success("Account created — welcome to ZANKYO!");
        navigate({ to: "/account" });
      } else if (mode === "signin") {
        await login(email, password);
        toast.success("Welcome back!");
        navigate({ to: "/account" });
      } else {
        await customerRecover(email);
        toast.success("If that email has an account, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Reset password";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <ZankyoStar className="mx-auto h-8 w-8" />
      <h1 className="zk-display mt-4 text-center text-4xl">{title}</h1>

      <form onSubmit={submit} className="mt-8 space-y-3">
        {mode === "signup" && (
          <div className="flex gap-3">
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={inputCls} />
            <input required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={inputCls} />
          </div>
        )}
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputCls} />
        {mode !== "forgot" && (
          <input type="password" required minLength={5} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={inputCls} />
        )}
        <button disabled={busy} className="zk-label w-full rounded-full bg-foreground py-3 text-xs text-background disabled:opacity-50">
          {busy ? "Please wait…" : title}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
        {mode === "signin" && (
          <>
            <button onClick={() => setMode("forgot")} className="block w-full hover:text-foreground">Forgot password?</button>
            <button onClick={() => setMode("signup")} className="hover:text-foreground">New here? <u>Create an account</u></button>
          </>
        )}
        {mode !== "signin" && (
          <button onClick={() => setMode("signin")} className="hover:text-foreground">Already have an account? <u>Sign in</u></button>
        )}
      </div>
    </div>
  );
}
