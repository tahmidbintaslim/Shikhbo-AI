"use client";
import { useEffect, useState, type ComponentType } from "react";

export default function ChatAutoMount() {
  const [Comp, setComp] = useState<ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Remove @ts-expect-error because the file exists now.
    import("./ChatInterface")
      .then((mod) => {
        if (!mounted) return;
        // Handle default export or named export `ChatInterface`
        const C = (mod as any)?.default ?? (mod as any)?.ChatInterface ?? null;
        if (C) {
          // use type assertion to satisfy TS
          setComp(() => C as ComponentType<any>);
        }
      })
      .catch((err) => {
        // 3. Log logically, don't throw (or the app crashes)
        console.warn("Failed to load ChatInterface:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!Comp) return null;

  // 4. Render the loaded component
  return <Comp />;
}
