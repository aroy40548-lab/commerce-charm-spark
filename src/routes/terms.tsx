import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicyPage } from "@/components/PolicyPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — ZANKYO" },
      { name: "description", content: "Terms governing use of the ZANKYO website and purchases from ZANKYO ONLINE SHOPPING in India." },
      { property: "og:title", content: "Terms & Conditions — ZANKYO" },
      { property: "og:description", content: "Read the terms governing ZANKYO website use, orders, payments, shipping, and customer accounts." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/terms" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/terms" }],
  }),
  component: TermsPage,
});

const listClass = "list-disc space-y-2 pl-5";

function TermsPage() {
  return (
    <PolicyPage
      eyebrow="Legal"
      title="Terms & Conditions"
      summary="These Terms govern your access to and use of the ZANKYO website, online shopping services, and purchases offered through our platform."
      facts={[
        { label: "Brand", value: "ZANKYO" },
        { label: "Legal / Trading Name", value: "ZANKYO ONLINE SHOPPING" },
        { label: "Business Location", value: "India" },
        { label: "Effective Date", value: "26/09/2026" },
      ]}
      sections={[
        { title: "Introduction", content: <><p>Welcome to ZANKYO.</p><p>ZANKYO is an emerging fashion brand focused on contemporary streetwear, creative styling, and fashion inspired by Gen Z culture.</p><p>By accessing our website or placing an order, you acknowledge that you have read and understood these Terms. If you do not agree with any part of these Terms, please do not use our website or purchase our products.</p><p>These Terms are subject to applicable laws and consumer rights in India.</p></> },
        { title: "Business Information", content: <><p>ZANKYO is the brand name used for our online fashion business.</p><p>Business name: ZANKYO ONLINE SHOPPING<br />Business location: India<br />Initial shipping market: India only<br />Shipping origin: Punjab, Jalandhar, India</p></> },
        { title: "Eligibility", content: <><p>You may use our website if you are legally permitted to enter into a purchase agreement under applicable law.</p><p>Customers under 18 years of age may use our services and place orders only with the permission and involvement of a parent or legal guardian.</p><p>By placing an order, you confirm that the information you provide is accurate and that you have the necessary authority to make the purchase.</p></> },
        { title: "Products and Product Information", content: <><p>ZANKYO offers fashion products that may include:</p><ul className={listClass}><li>Accessories</li><li>Shoes</li><li>Caps &amp; Headwear</li><li>Jackets</li><li>Hoodies</li><li>Baggy / Wide-leg Jeans</li><li>Graphic T-shirts</li><li>And more</li></ul><p>We aim to display accurate product descriptions, images, sizes, colors, and pricing. However, colors may vary slightly depending on your device screen, lighting, and photography conditions.</p><p>Product availability, pricing, and descriptions may change without prior notice, subject to applicable law and any rights you may have after placing an order.</p></> },
        { title: "Orders and Acceptance", content: <><p>When you place an order, you are submitting a request to purchase the selected products.</p><p>An order confirmation does not necessarily mean that the order has been finally accepted if additional verification is required.</p><p>We reserve the right to contact you to verify order details or to address issues such as product availability, pricing errors, or suspected fraudulent transactions, subject to applicable law.</p><p>If we cannot fulfill an accepted order, we will communicate with you and provide any refund required under applicable law.</p></> },
        { title: "Pricing and Payments", content: <><p>Prices will be displayed on the website in the applicable currency before checkout.</p><p>We plan to support the following payment methods in India:</p><ul className={listClass}><li>UPI</li><li>Credit / Debit Cards</li><li>Net Banking</li><li>Cash on Delivery (COD), where available</li></ul><p>Payment processing may be handled by third-party payment service providers. Their terms and security procedures may also apply.</p><p>We will not knowingly misrepresent the price or payment conditions of a product.</p></> },
        { title: "Shipping and Delivery", content: <><p>Shipping origin: Punjab, Jalandhar, India<br />Initial delivery area: India only<br />Estimated delivery time: 3–7 days</p><p>Shipping charges: Free shipping for Lovely Professional University or nearby area only, or charges subject to location.</p><p>We will provide available shipping and delivery information during the ordering process. Delivery estimates are not guarantees and may be affected by circumstances beyond our reasonable control, including logistics disruptions, extreme weather, or other unforeseen events.</p><p>If a delivery issue occurs, please contact us at <a href="mailto:help@zankyo.in" className="font-semibold text-foreground underline underline-offset-4">help@zankyo.in</a>.</p><p>Any mandatory consumer rights relating to delivery delays or non-delivery remain unaffected by these Terms.</p></> },
        { title: "Returns, Exchanges, and Refunds", content: <><p>Our Return Policy forms part of these Terms. Customers may be eligible to return or exchange products under the conditions and time limits set out in our Return Policy.</p><p>Please review the <Link to="/returns" className="font-semibold text-foreground underline underline-offset-4">Return &amp; Refund Policy</Link> before making a purchase.</p><p>Nothing in these Terms is intended to exclude or restrict rights that cannot lawfully be excluded under applicable Indian law.</p></> },
        { title: "Intellectual Property", content: <><p>Unless otherwise stated, the ZANKYO brand name, logos, website design, original graphics, written content, photographs, and other original materials displayed on our website are owned by or used with permission by ZANKYO.</p><p>You may not reproduce, distribute, modify, publicly display, or commercially use our content without prior written permission, except where permitted by law.</p><p>Third-party trademarks, logos, and product references remain the property of their respective owners.</p></> },
        { title: "User Accounts", content: <><p>If you create an account on our website, you are responsible for providing accurate information and taking reasonable steps to protect your login credentials.</p><p>You should notify us if you believe your account has been accessed without authorization.</p><p>We may process account and order information as described in our Privacy Policy.</p></> },
        { title: "Prohibited Use", content: <><p>You agree not to:</p><ul className={listClass}><li>Use the website for unlawful purposes.</li><li>Attempt to interfere with website security or operation.</li><li>Submit false, fraudulent, or misleading order information.</li><li>Copy or misuse our original content without authorization.</li><li>Use the website in a manner that violates applicable law.</li></ul></> },
        { title: "Website Availability", content: <><p>We aim to keep our website accessible and functioning reliably. However, we do not guarantee uninterrupted access or that every feature will always be available.</p><p>We may temporarily suspend or modify website features for maintenance, updates, security, or other legitimate reasons.</p></> },
        { title: "Limitation of Liability", content: <><p>To the extent permitted by applicable law, ZANKYO will not be responsible for losses that are not reasonably foreseeable or that arise from circumstances beyond our reasonable control.</p><p>Nothing in these Terms limits liability or consumer rights where such limitation is prohibited by law, including applicable rights relating to defective products, misleading representations, or other statutory protections.</p></> },
        { title: "Changes to These Terms", content: <><p>We may update these Terms from time to time to reflect changes in our business, website, or legal requirements.</p><p>The updated version will be published on this page with a revised effective date where appropriate.</p><p>Your continued use of the website after an update does not remove any rights you may have under applicable law.</p></> },
        { title: "Governing Law and Jurisdiction", content: <><p>These Terms are intended to be governed by the applicable laws of India.</p><p>Any dispute will be subject to the jurisdiction of the appropriate authorities and courts as determined under applicable law.</p><p>Nothing in this clause prevents a consumer from exercising any mandatory rights or remedies available under Indian law.</p></> },
        { title: "Contact Us", content: <p>For questions about these Terms, orders, or customer support, please contact:<br /><br />ZANKYO ONLINE SHOPPING<br />Email: <a href="mailto:help@zankyo.in" className="font-semibold text-foreground underline underline-offset-4">help@zankyo.in</a><br />Business Location: India<br />Shipping Origin: Punjab, Jalandhar, India</p> },
      ]}
    />
  );
}