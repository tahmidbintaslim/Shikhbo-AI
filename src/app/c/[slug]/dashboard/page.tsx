// The centre owner's view: what students asked this week, which notes they
// asked about most, what the notes did not answer, and the notes themselves.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CentreDashboard from "@/components/CentreDashboard";
import { centreName } from "@/lib/centre-name";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = await centreName((await params).slug);
  return { title: name ? `${name} ড্যাশবোর্ড` : "Not found", robots: { index: false, follow: false } };
}

export default async function CentreDashboardPage({ params }: Props) {
  const { slug } = await params;
  const name = await centreName(slug);
  if (!name) notFound();
  return <CentreDashboard slug={slug} name={name} />;
}
