import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const materialsDir = path.join(__dirname, '..', 'materials');
const jsonFile = path.join(materialsDir, 'materials.json');

console.log("Checking materials directory:", materialsDir);
console.log("Directory exists:", fs.existsSync(materialsDir));

console.log("Checking materials.json:", jsonFile);
console.log("JSON file exists:", fs.existsSync(jsonFile));

if (fs.existsSync(jsonFile)) {
  const content = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  console.log(`\nFound ${content.length} material items in materials.json:`);
  console.table(content.map(m => ({ id: m.id, title: m.title, type: m.type, url: m.file_url })));
}
