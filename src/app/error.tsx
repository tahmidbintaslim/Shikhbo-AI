"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell shell-narrow py-24">
      <h1>কিছু একটা ভুল হয়েছে।</h1>
      <p className="muted mt-4">
        পাতাটি খোলা যায়নি। আবার চেষ্টা করো। Something went wrong while opening this page. Please try again.
      </p>
      <button type="button" className="btn btn-primary mt-8" onClick={reset}>
        আবার চেষ্টা করো
      </button>
    </main>
  );
}
