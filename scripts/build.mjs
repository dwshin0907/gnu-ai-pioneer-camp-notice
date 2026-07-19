import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const files = new Map([
  ['index.html', 'index.html'],
  ['styles.css', 'styles.css'],
  ['script.js', 'script.js'],
  ['leader-email.mjs', 'leader-email.mjs'],
  ['team-seating.png', 'team-seating.png'],
  ['GNU_AI_Pioneer_캠프_오리엔테이션_16x9.pptx', 'GNU_AI_Pioneer_캠프_오리엔테이션_16x9.pptx'],
  ['worker.mjs', '_worker.js'],
]);

await mkdir(output, { recursive: true });
for (const [source, destination] of files) {
  await copyFile(path.join(root, source), path.join(output, destination));
}

console.log(`Built ${files.size} deployment files in ${output}`);
