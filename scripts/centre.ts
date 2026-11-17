// Creates a coaching centre for the pilot and prints its two codes once.
// Only their SHA-256 is stored, so keep the output: a lost code means
// creating the centre again under a new slug.
//
//   bun scripts/centre.ts <slug> "<Centre name>"
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import { readServiceConfig } from '../src/lib/config';
import { createStore } from '../src/lib/store';

dotenv.config({ path: '.env.local' });

// No 0/O or 1/I/L, so a code survives being read out over the phone.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const code = (length: number) =>
    Array.from(randomBytes(length), (byte) => ALPHABET[byte % ALPHABET.length]).join('');

async function main() {
    const [slug, name] = process.argv.slice(2);
    if (!slug || !name) throw new Error('Usage: bun scripts/centre.ts <slug> "<Centre name>"');
    const config = readServiceConfig();
    if (!config.store) throw new Error('Set SHIKHBO_STORE_URL and SHIKHBO_STORE_SECRET in .env.local first.');

    const joinCode = code(8);
    const ownerCode = code(16);
    await createStore(config.store).centreCreate(slug, name, joinCode, ownerCode);

    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://<your-site>';
    console.log(`Created "${name}".`);
    console.log(`Students:  ${base}/c/${slug}            join code:  ${joinCode}`);
    console.log(`Owner:     ${base}/c/${slug}/dashboard  owner code: ${ownerCode}`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
