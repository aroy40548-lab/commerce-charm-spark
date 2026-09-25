import { storefrontApiRequest } from "@/lib/shopify";

type UserError = { field?: string[] | null; message: string };

function firstError(errs?: UserError[] | null) {
  return errs && errs.length > 0 ? errs[0]!.message : null;
}

export interface MailingAddress {
  id: string;
  firstName: string | null;
  lastName: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  country: string | null;
  phone: string | null;
}

export interface CustomerOrder {
  id: string;
  orderNumber: number;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  totalPrice: { amount: string; currencyCode: string };
  lineItems: { edges: Array<{ node: { title: string; quantity: number } }> };
}

export interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  defaultAddress: { id: string } | null;
  addresses: { edges: Array<{ node: MailingAddress }> };
  orders: { edges: Array<{ node: CustomerOrder }> };
}

const ADDRESS_FIELDS = `id firstName lastName address1 address2 city province zip country phone`;

export async function customerRegister(input: { firstName: string; lastName: string; email: string; password: string }) {
  const data = await storefrontApiRequest(
    `mutation($input: CustomerCreateInput!) { customerCreate(input: $input) { customer { id } customerUserErrors { field message } } }`,
    { input: { ...input, acceptsMarketing: false } },
  );
  const err = firstError(data?.data?.customerCreate?.customerUserErrors);
  if (err) throw new Error(err);
}

export async function customerLogin(email: string, password: string) {
  const data = await storefrontApiRequest(
    `mutation($input: CustomerAccessTokenCreateInput!) { customerAccessTokenCreate(input: $input) { customerAccessToken { accessToken expiresAt } customerUserErrors { field message } } }`,
    { input: { email, password } },
  );
  const r = data?.data?.customerAccessTokenCreate;
  const err = firstError(r?.customerUserErrors);
  if (err) throw new Error(err === "Unidentified customer" ? "Wrong email or password" : err);
  if (!r?.customerAccessToken) throw new Error("Wrong email or password");
  return r.customerAccessToken as { accessToken: string; expiresAt: string };
}

export async function customerLogout(token: string) {
  await storefrontApiRequest(
    `mutation($t: String!) { customerAccessTokenDelete(customerAccessToken: $t) { deletedAccessToken } }`,
    { t: token },
  ).catch(() => undefined);
}

export async function customerRecover(email: string) {
  const data = await storefrontApiRequest(
    `mutation($email: String!) { customerRecover(email: $email) { customerUserErrors { field message } } }`,
    { email },
  );
  const err = firstError(data?.data?.customerRecover?.customerUserErrors);
  if (err) throw new Error(err);
}

export async function fetchCustomer(token: string): Promise<Customer | null> {
  const data = await storefrontApiRequest(
    `query($t: String!) {
      customer(customerAccessToken: $t) {
        id firstName lastName email phone
        defaultAddress { id }
        addresses(first: 20) { edges { node { ${ADDRESS_FIELDS} } } }
        orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
          edges { node {
            id orderNumber processedAt financialStatus fulfillmentStatus
            totalPrice { amount currencyCode }
            lineItems(first: 20) { edges { node { title quantity } } }
          } }
        }
      }
    }`,
    { t: token },
  );
  return data?.data?.customer ?? null;
}

export type AddressInput = Omit<MailingAddress, "id">;

export async function addressCreate(token: string, address: AddressInput) {
  const data = await storefrontApiRequest(
    `mutation($t: String!, $a: MailingAddressInput!) { customerAddressCreate(customerAccessToken: $t, address: $a) { customerAddress { id } customerUserErrors { message } } }`,
    { t: token, a: address },
  );
  const err = firstError(data?.data?.customerAddressCreate?.customerUserErrors);
  if (err) throw new Error(err);
}

export async function addressUpdate(token: string, id: string, address: AddressInput) {
  const data = await storefrontApiRequest(
    `mutation($t: String!, $id: ID!, $a: MailingAddressInput!) { customerAddressUpdate(customerAccessToken: $t, id: $id, address: $a) { customerAddress { id } customerUserErrors { message } } }`,
    { t: token, id, a: address },
  );
  const err = firstError(data?.data?.customerAddressUpdate?.customerUserErrors);
  if (err) throw new Error(err);
}

export async function addressDelete(token: string, id: string) {
  const data = await storefrontApiRequest(
    `mutation($t: String!, $id: ID!) { customerAddressDelete(customerAccessToken: $t, id: $id) { deletedCustomerAddressId customerUserErrors { message } } }`,
    { t: token, id },
  );
  const err = firstError(data?.data?.customerAddressDelete?.customerUserErrors);
  if (err) throw new Error(err);
}

export async function cartAttachCustomer(cartId: string, token: string, email?: string) {
  await storefrontApiRequest(
    `mutation($id: ID!, $b: CartBuyerIdentityInput!) { cartBuyerIdentityUpdate(cartId: $id, buyerIdentity: $b) { cart { id } userErrors { message } } }`,
    { id: cartId, b: { customerAccessToken: token, ...(email ? { email } : {}), countryCode: "IN" } },
  ).catch(() => undefined);
}
