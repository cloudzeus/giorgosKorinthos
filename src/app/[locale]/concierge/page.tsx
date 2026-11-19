import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { alternates, getDict } from "@/lib/i18n";
import { concierge } from "@/lib/site";
import { PageIntro } from "@/components/site/parts";
import ConciergePanel from "@/components/site/ConciergePanel";
import ConciergeCall from "@/components/site/ConciergeCall";

// The calendar starts from today, so the page cannot be cached.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/concierge">): Promise<Metadata> {
  const { locale, t } = await getDict((await params).locale);
  return { title: t.contact.concierge.eyebrow, description: t.contact.concierge.lead, alternates: alternates("/concierge", locale) };
}

export default async function ConciergePage({ params, searchParams }: PageProps<"/[locale]/concierge">) {
  if (!concierge.companyId) notFound();
  const { locale, t } = await getDict((await params).locale);
  const c = t.contact.concierge;
  // ?room=appt-… is the join link from the confirmation email: the call opens in a modal over this page.
  const room = String((await searchParams).room ?? "");
  return (
    <>
      {/^appt-[a-z0-9-]{6,64}$/i.test(room) ? <ConciergeCall room={room} title={c.eyebrow} closeLabel={t.gallery.close} hotelName="Ephyria Lux" backHref={`/${locale}/concierge`} /> : null}
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
