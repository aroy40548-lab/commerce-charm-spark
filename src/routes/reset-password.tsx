import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — ZANKYO" },
      { name: "description", content: "Choose a new password for your ZANKYO account." },
      { property: "og:title", content: "Set new password — ZANKYO" },
      { property: "og:description", content: "Choose a new password for your ZANKYO account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="zk-display text-center text-4xl">New password</h1>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm outline-none focus:border-foreground"
        />
        <button disabled={busy} className="zk-label w-full rounded-full bg-foreground py-3 text-xs text-background">
          Update password
        </button>
      </form>
    </div>
  );
}
