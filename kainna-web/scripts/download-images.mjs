import fs from "node:fs";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let a = 0; a < 6; a++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" } });
    if (r.status === 429) { await sleep(4000 * (a + 1)); continue; }
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  }
  return null;
}
const dishes = JSON.parse(fs.readFileSync("src/data/dishes.json", "utf8"));
const seen = new Map();
let ok = 0, fail = 0;
for (const d of dishes) {
  if (!d.image || !d.image.startsWith("http")) continue;
  const ext = d.image.toLowerCase().includes(".png") ? "png" : "jpg";
  const local = `/images/dishes/${d.slug}.${ext}`;
  const path = `public${local}`;
  if (seen.has(d.image)) { fs.copyFileSync(seen.get(d.image), path); d.image = local; ok++; continue; }
  const buf = await get(d.image);
  await sleep(700);
  if (buf && buf.length > 2000) { fs.writeFileSync(path, buf); seen.set(d.image, path); d.image = local; ok++; console.log("OK", d.slug, buf.length); }
  else { console.log("FAIL", d.slug, d.image); d.image = null; fail++; }
}
fs.writeFileSync("src/data/dishes.json", JSON.stringify(dishes, null, 2));
const site = {
  palengke: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Palengke_-_Danao_City_01_by_Hulagway.jpg/1280px-Palengke_-_Danao_City_01_by_Hulagway.jpg",
  spread: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Philippine_Food.jpg/1280px-Philippine_Food.jpg",
  kamayan: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Boodle_fight_%28kamayan%29_02.jpg/1280px-Boodle_fight_%28kamayan%29_02.jpg",
  carinderia: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Interior_of_Duko_Duko_Eatery_%2801%29_%2810-02-2022%29.jpg/1280px-Interior_of_Duko_Duko_Eatery_%2801%29_%2810-02-2022%29.jpg",
  vegetables: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Marketvegetables.jpg/1280px-Marketvegetables.jpg",
  sariSari: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Typical_sari-sari_store.jpg/1280px-Typical_sari-sari_store.jpg",
};
for (const [k, u] of Object.entries(site)) {
  const buf = await get(u); await sleep(800);
  if (buf && buf.length > 2000) { fs.writeFileSync(`public/images/site/${k}.jpg`, buf); console.log("OK site", k, buf.length); } else console.log("FAIL site", k);
}
console.log("dishes ok", ok, "fail", fail);
