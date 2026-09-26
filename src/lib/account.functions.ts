import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_.]{3,20}$/, "Username must be 3–20 letters, numbers, _ or .");

function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

async function passwordSignIn(email: string, password: string) {
  const { data, error } = await publicClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error("Wrong username or password");
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
}

export const checkUsername = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const parsed = usernameSchema.safeParse(data.username);
    if (!parsed.success) return { available: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("profiles").select("id").ilike("username", parsed.data).maybeSingle();
    return { available: !row };
  });

export const signUpWithUsername = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      username: usernameSchema,
      email: z.string().trim().toLowerCase().email().max(255),
      password: z.string().min(8, "Password must be at least 8 characters").max(72),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin.from("profiles").select("id").ilike("username", data.username).maybeSingle();
    if (taken) throw new Error("That username is taken — try another one");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw new Error("An account with this email already exists");
      if (/profiles_username/i.test(error.message)) throw new Error("That username is taken — try another one");
      throw new Error("Could not create account");
    }
    return passwordSignIn(data.email, data.password);
  });

export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ username: z.string().trim().toLowerCase().min(1).max(40), password: z.string().min(1).max(72) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("profiles").select("email").ilike("username", data.username).maybeSingle();
    if (!row?.email) throw new Error("Wrong username or password");
    return passwordSignIn(row.email, data.password);
  });
