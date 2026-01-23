"use client";
import { Button } from "@heroui/button";
import { Smartphone } from "lucide-react";

export function DownloadApp({ t }: { t: any }) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto rounded-3xl overflow-hidden relative glass-panel border border-white/10 bg-linear-to-r from-blue-900/40 to-purple-900/40">
        <div className="grid md:grid-cols-2 gap-10 items-center p-8 md:p-16 relative z-10">
          <div className="space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              {t.download.title}
            </h2>
            <p className="text-lg text-gray-300">{t.download.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                size="lg"
                startContent={<Smartphone />}
                className="bg-white text-black font-bold"
              >
                {t.download.btnGoogle}
              </Button>
              <Button
                size="lg"
                variant="bordered"
                className="text-white border-white/30 font-bold"
              >
                {t.download.btnApple}
              </Button>
            </div>
          </div>

          <div className="relative h-[300px] md:h-[400px] flex justify-center items-center">
            <div className="w-[200px] h-[380px] bg-black border-4 border-gray-800 rounded-[3rem] shadow-2xl relative overflow-hidden -rotate-6 hover:rotate-0 transition-all duration-500">
              <div className="absolute inset-0 bg-gray-900 flex flex-col p-4 space-y-3">
                <div className="w-full h-32 bg-purple-600/20 rounded-xl animate-pulse" />
                <div className="w-3/4 h-4 bg-gray-700 rounded animate-pulse" />
                <div className="w-1/2 h-4 bg-gray-700 rounded animate-pulse" />
                <div className="mt-auto p-3 bg-blue-600 rounded-xl text-center text-xs font-bold">
                  Ask AI Now
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
