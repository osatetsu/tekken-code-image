import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const content = readFileSync(join(__dirname, "../src/svg/shapes.svg"), "utf-8");
export default content;
