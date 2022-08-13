import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const resultsDir = join(process.cwd(), "results");

const resultFiles = readdirSync(resultsDir);
const results = [];

for (const resultFile of resultFiles) {
  const resultJson = JSON.parse(readFileSync(join(resultsDir, resultFile)));

  results.push({
    library: resultFile.split(".").slice(0, -1).join(" "),
    ...resultJson,
  });
}

results.sort((a, b) => b.requests_sec - a.requests_sec);

let txt = `| Library | Requests/s | Latency | Throughput/Mb |
| --- | --- | --- | --- |
`;

results.forEach(
  (r) =>
    (txt += `| ${r.library} | ${r.requests_sec} | ${r.avg_latency_sec} | ${r.transfer_sec} |\n`)
);

console.log(txt);
