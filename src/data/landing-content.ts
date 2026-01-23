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
    nav: {
      classes: "ক্লাস ১-১২",
      exams: "বোর্ড পরীক্ষা",
    },
    hero: {
      badge: "সম্পূর্ণ ফ্রি • ২৪/৭ অ্যাক্টিভ",
      title: "তোমার পার্সোনাল\nএআই টিউটর",
      subtitle: "যেকোনো কঠিন প্রশ্নের উত্তর পাও মুহূর্তেই। ক্লাস ১ থেকে ১২, সব বিষয়।",
      cta: "পড়া শুরু করি",
      stats: ["৫০,০০০+ প্রশ্ন সমাধান", "বিনামূল্যে শিক্ষা"],
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
        { label: "বিষয়", p: "১-২টি বিষয়", u: "সব বিষয় একসাথে" },
      ],
    },
  },
  en: {
    nav: {
      classes: "Class 1-12",
      exams: "Board Exams",
    },
    hero: {
      badge: "100% Free • Active 24/7",
      title: "Your Personal\nAI Tutor",
      subtitle: "Get instant answers to difficult questions. Class 1 to 12, all subjects.",
      cta: "Start Learning",
      stats: ["10k+ Students", "50k+ Problems Solved", "Free Education"],
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
        { label: "Subject", p: "Limited Subjects", u: "All Subjects" },
      ],
    },
  },
};

export default CONTENT;
