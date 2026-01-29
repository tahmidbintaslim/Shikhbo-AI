import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Index } from "@upstash/vector";
import { HfInference } from "@huggingface/inference";
import dotenv from 'dotenv';
import { createWorker } from 'tesseract.js';

dotenv.config({ path: '.env.local' });

const BASE_DIR = path.join(process.cwd(), 'books');
const TEMP_DIR = path.join(process.cwd(), 'temp_ocr');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

function extractGrade(filename: string): number {
    const match = filename.match(/class\s*[-_]?\s*(\d+)/i);
    return match ? parseInt(match[1]) : 0;
}

// ---------------------------------------------------------
// ROBUST OCR ENGINE (Ghostscript + Tesseract)
// ---------------------------------------------------------
async function extractTextWithOCR(filePath: string, language: 'eng' | 'ben') {
    console.log(`   Running OCR (This will take time)...`);

    // 1. Clean Temp Directory
    fs.readdirSync(TEMP_DIR).forEach(f => fs.unlinkSync(path.join(TEMP_DIR, f)));

    // 2. Convert PDF to Images using Ghostscript (System Command)
    // -r150: Resolution (150 DPI is good balance for OCR)
    // -sDEVICE=png16m: Output format PNG
    const outputPattern = path.join(TEMP_DIR, 'page-%03d.png');

    try {
        console.log("   - Converting PDF to images via Ghostscript...");
        // This command works on Mac/Linux if 'gs' is installed
        execSync(`gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r150 -sOutputFile="${outputPattern}" "${filePath}"`, { stdio: 'ignore' });
    } catch (e) {
        console.error("   ❌ Ghostscript failed. Run 'brew install ghostscript' first.");
        throw e;
    }

    // 3. Get list of generated images
    const images = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.png')).sort();
    console.log(`   - Converted ${images.length} pages. Starting text recognition...`);

    // 4. Run Tesseract on each image
    const worker = await createWorker(language);
    const pages: { text: string; page: number }[] = [];

    for (let i = 0; i < images.length; i++) {
        const imgPath = path.join(TEMP_DIR, images[i]);
        const { data: { text } } = await worker.recognize(imgPath);

        const cleanText = text.replace(/\s+/g, ' ').trim();

        // Only save meaningful pages (ignore blank ones)
        if (cleanText.length > 30) {
            pages.push({ text: cleanText, page: i + 1 });
        }

        process.stdout.write(`[P${i + 1}] `);

        // Delete image after processing to save space
        fs.unlinkSync(imgPath);
    }

    console.log("\n   - OCR Complete!");
    await worker.terminate();
    return pages;
}

async function ingestBooks() {
    const index = new Index({
        url: process.env.UPSTASH_VECTOR_REST_URL!,
        token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });
    const hf = new HfInference(process.env.HF_API_KEY);

    const languages = ['bengali', 'english'];

    for (const lang of languages) {
        const langDir = path.join(BASE_DIR, lang);
        if (!fs.existsSync(langDir)) continue;

        const files = fs.readdirSync(langDir).filter(f => f.endsWith('.pdf'));
        const ocrLang = lang === 'bengali' ? 'ben' : 'eng';

        for (const file of files) {
            console.log(`\n📖 Processing [${lang}] ${file}...`);
            try {
                const pages = await extractTextWithOCR(path.join(langDir, file), ocrLang);
                const grade = extractGrade(file);

                if (pages.length === 0) {
                    console.warn("⚠️ OCR found no text. File might be empty.");
                    continue;
                }

                console.log(`   - Indexing ${pages.length} pages...`);

                for (const p of pages) {
                    const contextText = `[Page: ${p.page}] ${p.text}`;

                    const embedding = await hf.featureExtraction({
                        model: "sentence-transformers/all-MiniLM-L6-v2",
                        inputs: contextText,
                    });

                    await index.upsert({
                        id: `${lang}-${file}-p${p.page}`,
                        vector: embedding as number[],
                        metadata: {
                            text: contextText,
                            source: file,
                            language: lang,
                            grade: grade,
                            page: p.page
                        }
                    });

                    if (p.page % 5 === 0) process.stdout.write(`.`);
                }
                console.log(`\n✅ ${file} Done!`);

            } catch (err) {
                console.error(`❌ Failed: ${file}`, err);
            }
        }
    }
}

ingestBooks().then(() => {
    // Cleanup temp dir
    if (fs.existsSync(TEMP_DIR)) fs.rmdirSync(TEMP_DIR);
    console.log("\n🚀 All books ingested successfully!");
});