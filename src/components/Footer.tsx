"use client";
import { Zap, Facebook, Instagram, Linkedin } from "lucide-react";

export function Footer({ t }: { t: any }) {
  return (
    <footer className="border-t border-white/10 bg-black/40 pt-16 pb-8 px-6 backdrop-blur-lg">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl text-white">Shikhbo</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            {t.footer.aboutText}
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-6">Company</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            {t.footer.links.company.map((link: string) => (
              <li key={link}>
                <a href="#" className="hover:text-blue-400 transition-colors">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-6">Legal</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            {t.footer.links.legal.map((link: string) => (
              <li key={link}>
                <a href="#" className="hover:text-blue-400 transition-colors">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-white mb-6">Follow Us</h4>
          <div className="flex gap-4">
            <a
              href="#"
              title="Facebook"
              className="p-2 bg-white/5 rounded-full hover:bg-blue-600 transition-colors text-white"
            >
              <Facebook size={18} />
            </a>
            <a
              href="#"
              title="Instagram"
              className="p-2 bg-white/5 rounded-full hover:bg-pink-600 transition-colors text-white"
            >
              <Instagram size={18} />
            </a>
            <a
              href="#"
              title="LinkedIn"
              className="p-2 bg-white/5 rounded-full hover:bg-blue-500 transition-colors text-white"
            >
              <Linkedin size={18} />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 text-center text-sm text-gray-500">
        {t.footer.copyright}
      </div>
    </footer>
  );
}
