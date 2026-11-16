import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell shell-narrow py-24">
      <h1>এই পাতাটি খুঁজে পাওয়া যায়নি।</h1>
      <p className="muted mt-4">This page does not exist. Check the link, or go back to the first page.</p>
      <Link href="/" className="btn btn-primary mt-8">
        প্রথম পাতায় যাও
      </Link>
    </main>
  );
}
