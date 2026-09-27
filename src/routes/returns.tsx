import { createFileRoute } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Return & Refund Policy — ZANKYO" },
      { name: "description", content: "Read ZANKYO's 7-day return, exchange, and refund policy for orders delivered in India." },
      { property: "og:title", content: "Return & Refund Policy — ZANKYO" },
      { property: "og:description", content: "ZANKYO's return eligibility, request process, exchanges, and refunds for Indian orders." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/returns" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/returns" }],
  }),
  component: ReturnsPage,
});

const listClass = "list-disc space-y-2 pl-5";

function ReturnsPage() {
  return (
    <PolicyPage
      eyebrow="Customer Care"
      title="Return & Refund Policy"
      summary="We want you to feel confident about your purchase. This policy explains our standard return, exchange, and refund process."
      facts={[
        { label: "Brand", value: "ZANKYO" },
        { label: "Return Window", value: "7 days" },
        { label: "Initial Market", value: "India" },
        { label: "Effective Date", value: "Receipt date" },
      ]}
      sections={[
        { title: "Our Return Commitment", content: <><p>If you receive a defective, damaged, incorrect, or otherwise eligible product, please contact us so we can review your request and help with an appropriate resolution.</p><p>This policy describes our standard return, exchange, and refund process. It does not limit any consumer rights or remedies that apply under Indian law.</p></> },
        { title: "Return Period", content: <><p>We offer a standard return window of 7 days from the date of delivery, subject to the conditions below.</p><p>Please contact us within the applicable return period and provide your order details so we can assess your request.</p><p>Requests submitted after the return window may not be eligible under our standard policy, except where a longer period or remedy is required by applicable law.</p></> },
        { title: "Return Eligibility", content: <><p>To be eligible for a standard return, items should meet the following conditions:</p><ul className={listClass}><li>Proof of purchase is required.</li><li>Items must be unworn and unused.</li><li>Original tags must remain attached.</li><li>Original packaging should be retained and returned where applicable.</li><li>Products should be in their original condition.</li></ul><p>For hygiene, safety, or product-specific reasons, certain items may be subject to additional return restrictions where permitted by law and clearly disclosed before purchase.</p></> },
        { title: "Defective or Incorrect Items", content: <><p>We accept eligible claims involving defective or incorrect items. Examples may include:</p><ul className={listClass}><li>A product that arrives with a manufacturing defect.</li><li>A product that is materially different from the item ordered.</li><li>An incorrect size, color, or product sent by us.</li></ul><p>Please contact us as soon as reasonably possible after delivery, preferably with photographs or videos showing the issue.</p><p>For eligible defective or incorrect-item claims, ZANKYO will cover the applicable return shipping costs.</p><p>We will review the reported issue and communicate the available resolution, which may include a replacement, exchange, repair where appropriate, or refund, subject to applicable law.</p></> },
        { title: "Non-Defective Returns", content: <><p>For a standard return that is not related to a defect or an error on our part, eligibility will depend on the return conditions in this policy and any applicable legal requirements.</p><p>The customer may be responsible for return shipping costs unless ZANKYO confirms otherwise or applicable law requires us to cover those costs.</p><p>Any non-refundable charges, exclusions, or return costs will be communicated clearly where applicable and will not override mandatory consumer rights.</p></> },
        { title: "How to Request a Return", content: <ol className="list-decimal space-y-2 pl-5"><li>Contact us at <a href="mailto:help@zankyo.in" className="font-semibold text-foreground underline underline-offset-4">help@zankyo.in</a>.</li><li>Include your order number and the reason for the return.</li><li>Provide photographs or other information if requested to assess a defect or incorrect item.</li><li>Wait for our return instructions before shipping the product back.</li><li>Pack the item securely with its original tags and packaging where required.</li></ol> },
        { title: "Exchange Policy", content: <><p>Exchanges are available, subject to product availability, eligibility, and applicable law.</p><p>If the requested replacement is unavailable, we will communicate the available options.</p><p>For defective or incorrect items, ZANKYO will coordinate the appropriate resolution and cover applicable return shipping costs as stated in this policy.</p></> },
        { title: "Refunds", content: <><p>For an approved refund, we intend to process the refund within 3–10 days after the return has been received and assessed, or after the refund has otherwise been approved, as applicable.</p><p>Refunds will generally be issued to the original payment method. The time taken for the refund to appear in your account may depend on your bank, card issuer, payment gateway, or other payment service provider.</p><p>For Cash on Delivery (COD) orders, there may not be an original electronic payment method to which a refund can be sent. In such cases, we will contact you to arrange an appropriate refund method, subject to applicable law and verification requirements.</p></> },
        { title: "Shipping Charges for Returns", content: <><p>For eligible defective or incorrect products, ZANKYO will cover the applicable return shipping costs.</p><p>For other returns, return shipping costs may be the customer's responsibility unless ZANKYO confirms otherwise or applicable law requires a different arrangement.</p></> },
        { title: "Damaged or Incorrect Delivery", content: <><p>If your order arrives damaged or contains an incorrect product, please contact us promptly at <a href="mailto:help@zankyo.in" className="font-semibold text-foreground underline underline-offset-4">help@zankyo.in</a>.</p><p>We recommend keeping the product, packaging, and delivery-related evidence until our support team has reviewed your request.</p></> },
        { title: "Items Not Eligible Under the Standard Policy", content: <><p>The following may make an item ineligible for a standard return:</p><ul className={listClass}><li>Items that have been worn or used.</li><li>Items without their original tags, where tags are required.</li><li>Items that are damaged through customer misuse or improper handling.</li><li>Items returned outside the applicable return period.</li></ul><p>These conditions are subject to any mandatory rights and exceptions under applicable law.</p></> },
        { title: "Policy Updates", content: <><p>ZANKYO may update this policy to reflect changes in our business, products, payment systems, or legal requirements.</p><p>The version published on this page will apply subject to applicable law and the terms communicated at the time of purchase.</p></> },
        { title: "Contact Us", content: <p>For return, exchange, and refund requests:<br /><br />ZANKYO ONLINE SHOPPING<br />Email: <a href="mailto:help@zankyo.in" className="font-semibold text-foreground underline underline-offset-4">help@zankyo.in</a><br />Shipping Origin: Punjab, Jalandhar, India<br />Initial Market: India only</p> },
      ]}
    />
  );
}