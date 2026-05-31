import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const src = path.resolve(__dirname, '../frontend/dist');
const dest = path.resolve(__dirname, '../wrapper/frontend/dist');

if (fs.existsSync(src)) {
    console.log(`Copying built frontend from ${src} to ${dest}...`);
    // Ensure destination directory exists
    fs.mkdirSync(dest, { recursive: true });
    
    // Clear destination directory to avoid stale assets
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });

    // Copy recursively, overwriting existing files
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log('Frontend copy complete!');
} else {
    console.error(`Source directory ${src} does not exist.`);
}
