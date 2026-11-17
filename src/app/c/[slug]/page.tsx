// A coaching centre's own tutor: students enter the centre's join code and
// ask questions that are answered only from that centre's notes.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CentreChat from "@/components/CentreChat";
import { centreName } from "@/lib/centre-name";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = await centreName((await params).slug);
  // Centre pages are for that centre's students, not for search engines.
  return { title: name ?? "Not found", robots: { index: false, follow: false } };
}

export default async function CentrePage({ params }: Props) {
  const { slug } = await params;
  const name = await centreName(slug);
  if (!name) notFound();
  return <CentreChat slug={slug} name={name} />;
}
