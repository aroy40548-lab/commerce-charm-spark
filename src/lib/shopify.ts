import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "shopflow-suite-r7tnw-wrwxaq1e.myshopify.com";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;
export const SHOPIFY_STOREFRONT_TOKEN = "59b969eacdcd2ba980e671a74f59a0a1";

type UserError = { field?: string[] | null; message: string; code?: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function storefrontApiRequest(query: string, variables: Record<string, unknown> = {}): Promise<any> {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (response.status === 402) {
    if (typeof window !== "undefined") {
      toast.error("Shopify: Payment required", { description: "The Shopify store needs an active plan. Visit admin.shopify.com to upgrade." });
    }
    return;
  }
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  if (data.errors) throw new Error(`Error calling Shopify: ${data.errors.map((e: { message: string }) => e.message).join(", ")}`);
  return data;
}

export function firstUserError(errors: UserError[] | undefined) {
  return errors && errors.length ? errors[0]!.message : null;
}

// ---------- Products ----------
export const PRODUCT_FIELDS = `
  id title description handle productType tags
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 20) { edges { node { url altText } } }
  variants(first: 20) { edges { node { id title availableForSale price { amount currencyCode } compareAtPrice { amount currencyCode } selectedOptions { name value } } } }
  options { name values }
`;

export const PRODUCTS_QUERY = `query GetProducts($first: Int!, $query: String) {
  products(first: $first, query: $query, sortKey: CREATED_AT) { edges { node { ${PRODUCT_FIELDS} } } }
}`;

export const PRODUCT_BY_HANDLE_QUERY = `query GetProduct($handle: String!) {
  product(handle: $handle) { ${PRODUCT_FIELDS} }
}`;

export const COLLECTIONS_QUERY = `query GetCollections {
  collections(first: 50, sortKey: UPDATED_AT) { edges { node {
    id handle title image { url }
    products(first: 250) { edges { node { id images(first: 1) { edges { node { url } } } } } }
  } } }
}`;

// ---------- Cart ----------
export const CART_QUERY = `query cart($id: ID!) { cart(id: $id) { id totalQuantity } }`;
const CART_LINES = `lines(first: 100) { edges { node { id merchandise { ... on ProductVariant { id } } } } }`;
export const CART_CREATE_MUTATION = `mutation cartCreate($input: CartInput!) {
  cartCreate(input: $input) { cart { id checkoutUrl ${CART_LINES} } userErrors { field message } }
}`;
export const CART_LINES_ADD_MUTATION = `mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) { cart { id ${CART_LINES} } userErrors { field message } }
}`;
export const CART_LINES_UPDATE_MUTATION = `mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { id } userErrors { field message } }
}`;
export const CART_LINES_REMOVE_MUTATION = `mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { id } userErrors { field message } }
}`;
export const CART_BUYER_IDENTITY_MUTATION = `mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
  cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) { cart { id checkoutUrl } userErrors { field message } }
}`;

export function formatCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    // Checkout must run on the store's own domain, not the custom storefront
    // domain (zankyo.in serves this Lovable app and would 404 the cart path).
    url.host = SHOPIFY_STORE_PERMANENT_DOMAIN;
    url.protocol = "https:";
    url.searchParams.set("channel", "online_store");
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

export function isCartNotFoundError(userErrors: UserError[]): boolean {
  return userErrors.some((e) => /cart not found|does not exist/i.test(e.message));
}

// ---------- Customers ----------
export const CUSTOMER_CREATE = `mutation customerCreate($input: CustomerCreateInput!) {
  customerCreate(input: $input) { customer { id } customerUserErrors { field message code } }
}`;
export const CUSTOMER_TOKEN_CREATE = `mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
  customerAccessTokenCreate(input: $input) { customerAccessToken { accessToken expiresAt } customerUserErrors { field message code } }
}`;
export const CUSTOMER_TOKEN_DELETE = `mutation customerAccessTokenDelete($customerAccessToken: String!) {
  customerAccessTokenDelete(customerAccessToken: $customerAccessToken) { deletedAccessToken }
}`;
export const CUSTOMER_RECOVER = `mutation customerRecover($email: String!) {
  customerRecover(email: $email) { customerUserErrors { field message code } }
}`;
export const CUSTOMER_ID_QUERY = `query customerId($token: String!) { customer(customerAccessToken: $token) { id email } }`;

export const CUSTOMER_QUERY = `query customer($token: String!) {
  customer(customerAccessToken: $token) {
    id firstName lastName email phone
    defaultAddress { id }
    addresses(first: 20) { edges { node { id firstName lastName address1 address2 city province zip country phone } } }
    orders(first: 50, sortKey: PROCESSED_AT, reverse: true) { edges { node {
      id name orderNumber processedAt financialStatus fulfillmentStatus canceledAt statusUrl
      currentTotalPrice { amount currencyCode }
      lineItems(first: 20) { edges { node { title quantity variant { title image { url } } } } }
      successfulFulfillments(first: 5) { trackingCompany trackingInfo(first: 3) { number url } }
    } } }
  }
}`;

export const ADDRESS_CREATE = `mutation customerAddressCreate($token: String!, $address: MailingAddressInput!) {
  customerAddressCreate(customerAccessToken: $token, address: $address) { customerAddress { id } customerUserErrors { field message } }
}`;
export const ADDRESS_UPDATE = `mutation customerAddressUpdate($token: String!, $id: ID!, $address: MailingAddressInput!) {
  customerAddressUpdate(customerAccessToken: $token, id: $id, address: $address) { customerAddress { id } customerUserErrors { field message } }
}`;
export const ADDRESS_DELETE = `mutation customerAddressDelete($token: String!, $id: ID!) {
  customerAddressDelete(customerAccessToken: $token, id: $id) { deletedCustomerAddressId customerUserErrors { field message } }
}`;
export const ADDRESS_DEFAULT = `mutation customerDefaultAddressUpdate($token: String!, $id: ID!) {
  customerDefaultAddressUpdate(customerAccessToken: $token, addressId: $id) { customer { id } customerUserErrors { field message } }
}`;
