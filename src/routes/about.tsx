import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — ZANKYO" },
      { name: "description", content: "Meet ZANKYO, a contemporary Indian streetwear brand built around creativity, self-expression, and Gen Z culture." },
      { property: "og:title", content: "About — ZANKYO" },
      { property: "og:description", content: "Contemporary streetwear built around creativity, self-expression, and a new generation." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://zankyo.in/about" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://zankyo.in/about" }],
  }),
  component: About,
});

function About() {
  return (
    <article>
      <header className="border-b border-border px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="zk-label text-xs text-muted-foreground">About ZANKYO</p>
          <h1 className="zk-display mt-3 max-w-4xl text-5xl leading-none sm:text-7xl">More Than Just Clothes.</h1>
          <div className="mt-7 max-w-3xl space-y-4 text-lg leading-8 text-muted-foreground">
            <p>ZANKYO is a contemporary fashion brand built around creativity, self-expression, and the evolving style of a new generation.</p>
            <p>We believe fashion is more than what you wear. It is how you express your identity, your energy, and your story.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl divide-y divide-border px-4 sm:px-6">
        <AboutSection number="01" title="Our Story">
          <p>As digital fashion continues to evolve, we set out to create an online shopping experience that bridges the gap between digital culture and the real-world style expectations of Gen Z.</p>
          <p>ZANKYO ONLINE SHOPPING was born from a drive to make bold, contemporary streetwear accessible, creative, and relevant. Today, we bring together distinctive streetwear, modern silhouettes, and fashion-forward pieces under one roof.</p>
        </AboutSection>
        <AboutSection number="02" title="Our Mission">
          <p>Our mission is to make fashion discovery more creative and accessible for young adults. We craft and curate pieces that empower our community to explore their personal style, experiment with new looks, and express themselves without limits.</p>
        </AboutSection>
        <AboutSection number="03" title="Our Core Value: Creativity">
          <p>Creativity is at the heart of ZANKYO. We believe there is no single way to dress, express yourself, or define your aesthetic. Our drops are inspired by individuality, experimentation, and the freedom to own your look.</p>
        </AboutSection>
        <AboutSection number="04" title="What We Offer">
          <p>Our live catalog and seasonal drops feature:</p>
          <ul className="grid list-disc gap-2 pl-5 sm:grid-cols-2">
            <li>Graphic &amp; Fitted T-Shirts</li>
            <li>Baggy / Wide-Leg Jeans &amp; Trousers</li>
            <li>Hoodies &amp; Sweatshirts</li>
            <li>Jackets &amp; Boxy Shirts</li>
            <li>Caps &amp; Headwear</li>
            <li>Shoes &amp; Footwear</li>
            <li>Statement Accessories</li>
          </ul>
          <p>Our collection direction blends contemporary streetwear, Y2K and grunge influences, oversized silhouettes, and expressive Gen Z styling. Each drop is released in curated quantities based on our active assortment and vault inventory.</p>
        </AboutSection>
        <AboutSection number="05" title="Who We Design For">
          <p>ZANKYO is designed for young adults—particularly those aged 18–30—who treat clothing as an extension of their identity. Rather than locking into a single rigid aesthetic, we create space for different personalities, moods, and ways of dressing.</p>
        </AboutSection>
        <AboutSection number="06" title="Our Location & Dispatch">
          <p>ZANKYO ONLINE SHOPPING operates and ships pan-India.</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="font-semibold text-foreground">Shipping Origin</dt><dd>Jalandhar, Punjab, India</dd></div>
            <div><dt className="font-semibold text-foreground">Active Market</dt><dd>Pan-India Dispatch (with global expansion on the horizon)</dd></div>
          </dl>
        </AboutSection>
        <AboutSection number="07" title="Our Vision">
          <p>We are building ZANKYO into a defining streetwear destination where raw creativity meets everyday wearability—listening to our community, evolving with every drop, and delivering a seamless digital shopping experience.</p>
          <p className="zk-display text-2xl text-foreground">ZANKYO — Wear Your Story.</p>
        </AboutSection>
        <AboutSection number="08" title="Contact Us">
          <p>Have a question about an order, a drop suggestion, or want to collaborate with us? Reach out directly:</p>
          <p><a href="mailto:help@zankyo.in" className="font-semibold text-foreground underline underline-offset-4">help@zankyo.in</a></p>
          <p>Brand: ZANKYO<br />Business Name: ZANKYO ONLINE SHOPPING<br />Dispatch Hub: Jalandhar, Punjab, India</p>
        </AboutSection>
      </div>

      <div className="border-t border-border px-4 py-12 text-center sm:px-6">
        <Link to="/shop" className="zk-label inline-flex rounded-full bg-foreground px-7 py-3 text-xs text-background">Shop now</Link>
      </div>
    </article>
  );
}

function AboutSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 py-10 md:grid-cols-[4rem_1fr] md:gap-8">
      <span className="zk-display text-3xl text-muted-foreground" aria-hidden="true">{number}</span>
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-base leading-7 text-muted-foreground">{children}</div>
      </div>
    </section>
  );
}
