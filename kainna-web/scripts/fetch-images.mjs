// Pulls freely licensed dish photos from Wikimedia Commons via the Wikipedia REST summary API.
// Output: scripts/images.json  { slug: { url, credit } | null }
import fs from "node:fs";

const dishes = {
  "chicken-adobo": "Philippine adobo",
  "pork-adobo": "Philippine adobo",
  "sinigang-na-baboy": "Sinigang",
  "sinigang-na-bangus": "Sinigang",
  "sinigang-na-hipon": "Sinigang",
  "tinolang-manok": "Tinola",
  "nilagang-baka": "Nilaga",
  "bulalo": "Bulalo",
  "kare-kare": "Kare-kare",
  "bicol-express": "Bicol express",
  "laing": "Laing (food)",
  "pinakbet": "Pinakbet",
  "ginisang-ampalaya": "Momordica charantia",
  "ginisang-monggo": "Ginisang munggo",
  "ginataang-kalabasa": "Ginataang kalabasa",
  "chopsuey": "Chop suey",
  "tortang-talong": "Tortang talong",
  "tortang-giniling": "Tortang giniling",
  "ginisang-sardinas": "Sardines as food",
  "corned-beef-guisado": "Corned beef",
  "giniling-guisado": "Giniling",
  "menudo": "Menudo (stew)",
  "mechado": "Mechado",
  "caldereta": "Caldereta",
  "afritada": "Afritada",
  "picadillo": "Picadillo",
  "lechon-kawali": "Lechon kawali",
  "inihaw-na-liempo": "Inihaw",
  "pork-sisig": "Sisig",
  "bistek-tagalog": "Bistek",
  "beef-tapa": "Tapa (Filipino cuisine)",
  "pork-tocino": "Tocino",
  "longganisa": "Longaniza",
  "daing-na-bangus": "Daing",
  "pritong-tilapia": "Fried fish",
  "inihaw-na-tilapia": "Inihaw",
  "paksiw-na-bangus": "Paksiw",
  "escabeche": "Escabeche",
  "ginataang-tilapia": "Ginataan",
  "sarciadong-isda": "Sarciado",
  "adobong-pusit": "Adobong pusit",
  "ginataang-hipon": "Ginataang hipon",
  "halabos-na-hipon": "Halabos",
  "chicken-curry": "Filipino chicken curry",
  "chicken-inasal": "Chicken inasal",
  "pritong-manok": "Fried chicken",
  "arroz-caldo": "Arroz caldo",
  "pancit-canton": "Pancit canton",
  "pancit-bihon": "Pancit bihon",
  "lumpiang-shanghai": "Lumpia",
  "lumpiang-gulay": "Lumpia",
  "chicken-sopas": "Sopas",
  "pesang-isda": "Pesa (Filipino dish)",
  "adobong-sitaw": "Adobong sitaw",
  "ginisang-repolyo": "Cabbage",
  "ginisang-upo": "Calabash",
  "sardinas-with-misua": "Misua",
  "tinapa-with-kamatis": "Tinapa",
  "tortang-itlog": "Tortang talong",
  "dinuguan": "Dinuguan",
  "pochero": "Puchero",
  "paksiw-na-lechon": "Paksiw",
  "sinampalukang-manok": "Sinampalukan",
  "bulanglang": "Dinengdeng",
  "pork-steak": "Bistek",
  "beef-pares": "Beef pares",
  "ginataang-langka": "Ginataang langka",
  "okoy": "Okoy",
  "inihaw-na-pusit": "Inihaw",
  "sinigang-na-baka": "Sinigang",
  "kinilaw": "Kinilaw",
  "pork-binagoongan": "Binagoongan",
  "bopis": "Bopis",
  "ginisang-togue": "Mung bean sprout",
  "ginisang-sayote": "Chayote",
  "adobong-kangkong": "Adobong kangkong",
  "ginisang-pechay": "Bok choy",
  "nilagang-manok": "Nilaga",
  "bangus-belly-sinigang": "Milkfish",
  "tuna-guisado": "Tuna",
  "pork-nilaga": "Nilaga",
  "chicken-afritada": "Afritada",
  "pork-menudo": "Menudo (stew)",
  "beef-kaldereta": "Caldereta",
  "kalderetang-kambing": "Caldereta",
  "goto": "Goto (food)",
  "lugaw": "Lugaw",
  "pancit-palabok": "Pancit palabok",
  "beef-nilaga": "Nilaga",
  "ginataang-gulay": "Ginataang gulay",
  "ampalaya-con-carne": "Momordica charantia",
  "hototay": "Hototay",
  "batchoy": "Batchoy",
  "beef-mami": "Mami (food)",
  "chicken-mami": "Mami (food)",
};

const prev = fs.existsSync(new URL("./images.json", import.meta.url))
  ? JSON.parse(fs.readFileSync(new URL("./images.json", import.meta.url), "utf8")) : {};
const out = { ...prev };
const cache = {};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function summary(title) {
  if (cache[title] !== undefined) return cache[title];
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": "salo-demo/0.1 (contact: demo@salo.ph)" } });
    if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) { cache[title] = null; return null; }
    const j = await res.json();
    cache[title] = j; return j;
  }
  cache[title] = null; return null;
}

for (const [slug, title] of Object.entries(dishes)) {
  if (out[slug] && out[slug].url && !out[slug].url.includes("Gorgonzola") && !out[slug].url.includes("Nairobi") && !out[slug].url.includes("Cochinillos")) continue;
  const j = await summary(title);
  await sleep(700);
  const thumb = j?.thumbnail?.source;
  if (!thumb) { out[slug] = null; console.log("NOIMG", slug, title); continue; }
  const big = thumb.replace(/\/\d+px-/, "/900px-").split("?")[0];
  out[slug] = { url: big, credit: `Wikimedia Commons – ${j.title}` };
  console.log("OK", slug, big);
}
for (const k of Object.keys(out)) if (out[k]?.url) out[k].url = out[k].url.split("?")[0];
fs.writeFileSync(new URL("./images.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("missing:", Object.entries(out).filter(([,v])=>!v).map(([k])=>k).join(", "));
