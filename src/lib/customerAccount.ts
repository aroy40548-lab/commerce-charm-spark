// Shopify Customer Account API (headless, public client with PKCE).
// The Client ID comes from Shopify admin → Headless → Customer Account API.
export const SHOPIFY_SHOP_ID = "84384776449";
export const SHOPIFY_CUSTOMER_CLIENT_ID = "32b0fc4e-0ce1-4a9e-b680-3af2cc77ad17";
export const CUSTOMER_API_VERSION = "2025-07";

const AUTH_BASE = `https://shopify.com/authentication/${SHOPIFY_SHOP_ID}`;
export const CUSTOMER_GRAPHQL_URL = `https://shopify.com/${SHOPIFY_SHOP_ID}/account/customer/api/${CUSTOMER_API_VERSION}/graphql`;

export const customerLoginConfigured = () => SHOPIFY_CUSTOMER_CLIENT_ID.length > 0;
const redirectUri = () => `${window.location.origin}/account/callback`;

function b64url(bytes: Uint8Array) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomString(len = 48) {
  return b64url(crypto.getRandomValues(new Uint8Array(len)));
}
async function challenge(verifier: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(hash));
}

export async function startCustomerLogin(returnTo = "/account") {
  const verifier = randomString();
  const state = randomString(16);
  const nonce = randomString(16);
  sessionStorage.setItem("zk-pkce", JSON.stringify({ verifier, state, nonce, returnTo }));
  const url = new URL(`${AUTH_BASE}/oauth/authorize`);
  url.search = new URLSearchParams({
    scope: "openid email customer-account-api:full",
    client_id: SHOPIFY_CUSTOMER_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
    nonce,
    code_challenge: await challenge(verifier),
    code_challenge_method: "S256",
  }).toString();
  window.location.assign(url.toString());
}

export interface CustomerTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string | undefined;
  expiresAt: number;
}

function toTokens(j: any): CustomerTokens {
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    idToken: j.id_token,
    expiresAt: Date.now() + (Number(j.expires_in) || 3600) * 1000,
  };
}

export async function finishCustomerLogin(code: string, state: string) {
  const saved = JSON.parse(sessionStorage.getItem("zk-pkce") ?? "null");
  sessionStorage.removeItem("zk-pkce");
  if (!saved || saved.state !== state) throw new Error("Sign-in expired, please try again.");
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: SHOPIFY_CUSTOMER_CLIENT_ID,
      redirect_uri: redirectUri(),
      code,
      code_verifier: saved.verifier,
    }),
  });
  if (!res.ok) throw new Error("Sign-in failed, please try again.");
  return { tokens: toTokens(await res.json()), returnTo: (saved.returnTo as string) || "/account" };
}

export async function refreshCustomerTokens(refreshToken: string) {
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: SHOPIFY_CUSTOMER_CLIENT_ID, refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Session expired");
  return toTokens(await res.json());
}

export function customerLogoutUrl(idToken?: string) {
  const url = new URL(`${AUTH_BASE}/logout`);
  if (idToken) url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", window.location.origin);
  return url.toString();
}

export async function customerQuery<T = any>(accessToken: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(CUSTOMER_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

export const CUSTOMER_PROFILE_QUERY = `query { customer { id firstName lastName emailAddress { emailAddress } } }`;

export const CUSTOMER_ORDERS_QUERY = `query {
  customer {
    orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
      nodes {
        id name processedAt financialStatus fulfillmentStatus statusPageUrl
        totalPrice { amount currencyCode }
        lineItems(first: 20) { nodes { title variantTitle quantity image { url } } }
        fulfillments(first: 5) { nodes { status trackingInformation { number url company } } }
      }
    }
  }
}`;
