import { BookOpen, Calculator, Cpu, FlaskConical, Globe } from "lucide-react";

export const SUBJECTS = [
  { id: "math", name: { bn: "গণিত", en: "General Math" }, icon: Calculator, color: "text-blue-400" },
  { id: "physics", name: { bn: "পদার্থবিজ্ঞান", en: "Physics" }, icon: FlaskConical, color: "text-purple-400" },
  { id: "chemistry", name: { bn: "রসায়ন", en: "Chemistry" }, icon: FlaskConical, color: "text-teal-400" },
  { id: "english", name: { bn: "ইংরেজি", en: "English" }, icon: Globe, color: "text-pink-400" },
  { id: "ict", name: { bn: "তথ্য ও প্রযুক্তি", en: "ICT" }, icon: Cpu, color: "text-cyan-400" },
  { id: "bangla", name: { bn: "বাংলা", en: "Bangla" }, icon: BookOpen, color: "text-rose-400" },
];

export const CONTENT = {
  bn: {
    hero: {
      badge: "সম্পূর্ণ ফ্রি • ২৪/৭ অ্যাক্টিভ",
      title: "তোমার পার্সোনাল\nএআই টিউটর",
      subtitle: "বাংলা বা ইংরেজিতে প্রশ্ন করো। আপাতত শুধু প্রথম শ্রেণির NCTB বাংলা, ইংরেজি ও গণিত বই থেকে উত্তর খোঁজা হয়।",
      cta: "পড়া শুরু করি",
      stats: ["বাংলা ও ইংরেজি মাধ্যম", "বিনামূল্যে ব্যবহার"],
    },
    syllabus: {
      title: "আজকে কি শিখবে?",
      subtitle: "তোমার পছন্দের বিষয় বেছে নাও",
    },
    compare: {
      title: "কেন Shikhbo AI সেরা?",
      private: "প্রাইভেট টিউটর",
      us: "Shikhbo AI",
      points: [
        { label: "খরচ", p: "উচ্চ খরচ", u: "সম্পূর্ণ ফ্রি" },
        { label: "সময়", p: "নির্দিষ্ট সময়", u: "২৪/৭ যেকোনো সময়" },
      ],
    },
  },
  en: {
    hero: {
      badge: "100% Free • Active 24/7",
      title: "Your Personal\nAI Tutor",
      subtitle: "Ask a question in Bangla or English. For now, textbook lookup covers NCTB Class 1 Bangla, English and Math books only.",
      cta: "Start Learning",
      stats: ["Bangla and English medium", "Free to use"],
    },
    syllabus: {
      title: "What will you learn today?",
      subtitle: "Choose your subject",
    },
    compare: {
      title: "Why Shikhbo AI?",
      private: "Private Tutor",
      us: "Shikhbo AI",
      points: [
        { label: "Cost", p: "Expensive", u: "Totally Free" },
        { label: "Time", p: "Fixed Schedule", u: "Anytime (24/7)" },
      ],
    },
  },
};

export default CONTENT;
