"use client";
import { Card, CardBody } from "@heroui/card";
import { Avatar } from "@heroui/avatar";
import { Star } from "lucide-react";

export function Testimonials({ t }: { t: any }) {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {t.testimonials.title}
          </h2>
          <p className="text-gray-400">{t.testimonials.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.testimonials.list.map((item: any, i: number) => (
            <Card
              key={i}
              className="glass-card border-white/5 bg-white/5 hover:-translate-y-2 transition-transform duration-300"
            >
              <CardBody className="p-6 gap-4">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, starI) => (
                    <Star key={starI} size={16} className="text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-200 leading-relaxed">"{item.text}"</p>
                <div className="flex items-center gap-3 mt-4">
                  <Avatar
                    name={item.name}
                    className="w-10 h-10 text-xs bg-linear-to-br from-blue-500 to-purple-500"
                  />
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.role} • {item.school}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
