// `indexed`: the subject's textbooks are in the index for the indexed classes
// (books/sources.json: Class 1 Bangla, English and Math). The others show as
// "coming soon" and cannot be picked.
export const SUBJECTS = [
  { id: "math", name: { bn: "গণিত", en: "Math" }, indexed: true },
  { id: "bangla", name: { bn: "বাংলা", en: "Bangla" }, indexed: true },
  { id: "english", name: { bn: "ইংরেজি", en: "English" }, indexed: true },
  { id: "physics", name: { bn: "পদার্থবিজ্ঞান", en: "Physics" }, indexed: false },
  { id: "chemistry", name: { bn: "রসায়ন", en: "Chemistry" }, indexed: false },
  { id: "ict", name: { bn: "তথ্য ও প্রযুক্তি", en: "ICT" }, indexed: false },
];

export const CONTENT = {
  bn: {
    brand: "শিখবো AI",
    title: "বাড়ির কাজে আটকে গেছ?\nএখানে লিখে ফেলো।",
    subtitle: "বাংলা বা ইংরেজিতে প্রশ্ন করো। আপাতত শুধু প্রথম শ্রেণির NCTB বাংলা, ইংরেজি ও গণিত বই থেকে উত্তর খোঁজা হয়।",
    classLabel: "শ্রেণি",
    soon: "শীঘ্রই",
    contents: "সূচিপত্র",
    contentsHelp: "একটি বিষয় বেছে নিলে প্রশ্নের ঘরে লেখা শুরু হবে।",
    footer: "বিনামূল্যে ব্যবহার। কোনো অ্যাপ লাগবে না।",
    main: "মূল বিষয়বস্তু",
  },
  en: {
    brand: "Shikhbo AI",
    title: "Stuck on your homework?\nWrite it down here.",
    subtitle: "Ask a question in Bangla or English. For now, textbook lookup covers NCTB Class 1 Bangla, English and Math books only.",
    classLabel: "Class",
    soon: "coming soon",
    contents: "Contents",
    contentsHelp: "Pick a subject to start your question with it.",
    footer: "Free to use. No app required.",
    main: "Main content",
  },
} as const;

export default CONTENT;
