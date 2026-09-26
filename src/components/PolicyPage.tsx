import type { ReactNode } from "react";

interface PolicySection {
  title: string;
  content: ReactNode;
}

interface PolicyPageProps {
  eyebrow: string;
  title: string;
  summary: string;
  facts: Array<{ label: string; value: string }>;
  sections: PolicySection[];
}

export function PolicyPage({ eyebrow, title, summary, facts, sections }: PolicyPageProps) {
  return (
    <article className="mx-auto w-full max-w-5xl overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
      <header className="border-b border-border pb-10">
        <p className="zk-label text-xs text-muted-foreground">{eyebrow}</p>
        <h1 className="zk-display mt-3 max-w-4xl break-words text-4xl leading-none sm:text-7xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">{summary}</p>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="bg-background p-4">
              <dt className="zk-label text-[10px] text-muted-foreground">{fact.label}</dt>
              <dd className="mt-2 text-sm font-medium text-foreground">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="divide-y divide-border">
        {sections.map((section, index) => (
          <section key={section.title} className="grid gap-4 py-8 md:grid-cols-[4rem_1fr] md:gap-8">
            <span className="zk-display text-3xl text-muted-foreground" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground sm:text-2xl">{section.title}</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
                {section.content}
              </div>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
