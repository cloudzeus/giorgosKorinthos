import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, getDict } from "@/lib/i18n";
import { concierge } from "@/lib/site";
import { PageIntro } from "@/components/site/parts";
import ConciergePanel from "@/components/site/ConciergePanel";

// The calendar starts from today, so the page cannot be cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/concierge">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return { title: t.contact.concierge.eyebrow, description: t.contact.concierge.lead, alternates: alternates("/concierge", locale) };
}

export default async function ConciergePage({ params }: PageProps<"/[locale]/concierge">) {
  if (!concierge.companyId) notFound();
  const { locale, t } = await getDict((await params).locale);
  const c = t.contact.concierge;
  return (
    <>
      <PageIntro eyebrow={c.eyebrow} lines={c.lines} lead={c.lead} />
      <section className="ep-container" style={{ paddingBottom: "var(--section)" }}>
        <ConciergePanel
          strings={c}
          labels={{ prev: t.bookflow.prev, next: t.bookflow.next }}
          hotelName="Ephyria Lux"
          locale={locale}
          today={new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Athens" }).format(new Date())}
        />
      </section>
    </>
  );
}
