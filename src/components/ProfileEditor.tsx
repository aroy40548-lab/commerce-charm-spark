import { useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { normalizeUsername, usernameOk } from "@/lib/reels";
import { checkUsername, createAvatarUpload, getMyProfile, saveMyProfile } from "@/lib/profile.functions";

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["my-profile", user?.id], enabled: !!user, queryFn: () => getMyProfile(), staleTime: 60_000 });
}

/** Name, username, bio and photo form. `required` hides the cancel option. */
export function ProfileForm({ required, onSaved, onCancel }: { required?: boolean; onSaved?: (username: string) => void; onCancel?: () => void }) {
  const me = useMyProfile();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<{ path: string; preview: string } | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me.data) return;
    setName(me.data.fullName); setUsername(me.data.username); setBio(me.data.bio);
  }, [me.data]);

  useEffect(() => {
    const u = normalizeUsername(username);
    if (!u) { setStatus("idle"); return; }
    if (!usernameOk(u)) { setStatus("invalid"); return; }
    if (u === me.data?.username) { setStatus("ok"); return; }
    setStatus("checking");
    const t = setTimeout(async () => {
      try { const r = await checkUsername({ data: { username: u } }); setStatus(r.ok ? "ok" : r.reason === "taken" ? "taken" : "invalid"); }
      catch { setStatus("idle"); }
    }, 400);
    return () => clearTimeout(t);
  }, [username, me.data?.username]);

  const pickPhoto = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("Photo must be under 5MB"); return; }
    const type = f.type as "image/jpeg" | "image/png" | "image/webp";
    if (!["image/jpeg", "image/png", "image/webp"].includes(type)) { toast.error("Use a JPG, PNG or WebP photo"); return; }
    try {
      const { path, token } = await createAvatarUpload({ data: { type } });
      const { error } = await supabase.storage.from("reels").uploadToSignedUrl(path, token, f, { contentType: type });
      if (error) throw error;
      setAvatar({ path, preview: URL.createObjectURL(f) });
    } catch { toast.error("Couldn't upload the photo"); }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "taken" || status === "invalid") return;
    setBusy(true);
    try {
      const r = await saveMyProfile({ data: { fullName: name, username, bio, ...(avatar ? { avatarPath: avatar.path } : {}) } });
      await qc.invalidateQueries({ queryKey: ["my-profile"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile saved");
      onSaved?.(r.username);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't save"); }
    finally { setBusy(false); }
  };

  if (me.isLoading) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />;
  const photo = avatar?.preview ?? me.data?.avatarUrl ?? null;
  const field = "min-h-12 w-full border border-border bg-background px-4 text-base outline-none focus:border-foreground sm:text-sm";

  return (
    <form onSubmit={save} className="space-y-4">
      <label className="mx-auto grid h-20 w-20 cursor-pointer place-items-center overflow-hidden rounded-full border border-border bg-muted" aria-label="Profile photo">
        {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6 text-muted-foreground" />}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </label>
      <div>
        <label className="zk-label text-[10px] text-muted-foreground" htmlFor="pf-name">Name</label>
        <input id="pf-name" required minLength={2} maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
      </div>
      <div>
        <label className="zk-label text-[10px] text-muted-foreground" htmlFor="pf-user">Username</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
          <input id="pf-user" required value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))} maxLength={20} placeholder="username" autoCapitalize="none" className={`${field} pl-8`} />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {status === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {status === "ok" && <Check className="h-4 w-4 text-green-600" />}
            {(status === "taken" || status === "invalid") && <X className="h-4 w-4 text-destructive" />}
          </span>
        </div>
        <p className={`mt-1 text-[11px] ${status === "taken" || status === "invalid" ? "text-destructive" : "text-muted-foreground"}`}>
          {status === "taken" ? "That username is taken" : status === "invalid" ? "3–20 characters: lowercase letters, numbers, . or _" : "Shown on your reels. Must be unique."}
        </p>
      </div>
      <div>
        <label className="zk-label text-[10px] text-muted-foreground" htmlFor="pf-bio">Bio (optional)</label>
        <textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={150} rows={2} className={`${field} py-3`} placeholder="A line about you" />
      </div>
      <button disabled={busy || status === "taken" || status === "invalid" || status === "checking"} className="zk-label flex min-h-12 w-full items-center justify-center gap-2 bg-foreground text-xs text-background disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {required ? "Continue" : "Save profile"}
      </button>
      {!required && onCancel && <button type="button" onClick={onCancel} className="w-full text-xs text-muted-foreground">Cancel</button>}
    </form>
  );
}

/** Signed-in customers must set a name and username before using the store. */
export function ProfileSetupGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const me = useMyProfile();
  const open = !!user && !!me.data && !me.data.complete && !pathname.startsWith("/admin");
  return (
    <Dialog open={open}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md [&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogTitle className="zk-display text-3xl">Set up your profile</DialogTitle>
        <DialogDescription>Pick your name and a unique username. Your username shows on reels; your name shows on comments. Your email stays private.</DialogDescription>
        <ProfileForm required />
      </DialogContent>
    </Dialog>
  );
}
