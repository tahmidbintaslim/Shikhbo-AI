"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="khata-page max-w-xl pt-16">
      <h1>কিছু একটা ভুল হয়েছে।</h1>
      <p className="text-pencil">
        পাতাটি খোলা যায়নি। আবার চেষ্টা করো। Something went wrong while opening this page. Please try again.
      </p>
      <button type="button" className="khata-btn khata-btn-fill khata-btn-tall mt-8" onClick={reset}>
        আবার চেষ্টা করো
      </button>
    </main>
  );
}
