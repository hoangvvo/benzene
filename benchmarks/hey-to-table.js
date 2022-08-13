import { readFileSync } from "fs";

const arr = readFileSync("./results.txt", { encoding: "utf-8" })
  .toString()
  .trim()
  .split("\n");

let i = arr[0].startsWith("Machine: ") ? 3 : 0;

const result = [];

while (i < arr.length) {
  result.push({
    library: arr[i],
    rate: parseFloat(arr[i + 4].substring(16)),
    latency: parseFloat(arr[i + 3].substring(11)),
  });
  i += 6;
}

result.sort((a, b) => b.rate - a.rate);

let txt = `| Library | Requests/s | Latency |
| --- | --- | --- |
`;

result.forEach((r) => (txt += `| ${r.library} | ${r.rate} | ${r.latency} |\n`));

console.log(txt);
