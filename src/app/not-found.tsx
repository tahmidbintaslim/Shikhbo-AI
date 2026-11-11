import Link from "next/link";

export default function NotFound() {
  return (
    <main className="khata-page max-w-xl pt-16">
      <h1>এই পাতাটি খাতায় নেই।</h1>
      <p className="text-pencil">This page does not exist. Check the link, or go back to the first page.</p>
      <Link href="/" className="khata-btn khata-btn-fill khata-btn-tall mt-8 no-underline">
        প্রথম পাতায় যাও
      </Link>
    </main>
  );
}
