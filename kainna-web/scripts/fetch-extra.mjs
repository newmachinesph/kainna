import fs from "node:fs";
const titles = { palengke: "Palengke", "filipino-cuisine": "Filipino cuisine", kamayan: "Kamayan", rice: "Rice", "public-market": "Public market", "wet-market": "Wet market", "carinderia": "Carinderia", "sari-sari": "Sari-sari store", "banana-leaf": "Banana leaf", "bagoong": "Bagoong", "kalamansi": "Calamansi", "tinapa": "Tinapa", "vegetables": "Vegetable", "eggplant": "Eggplant", "coconut-milk": "Coconut milk", "receipt": "Receipt", "philippine-peso": "Philippine peso", "market-manila": "Divisoria", "quiapo": "Quiapo", "baguio-market": "Baguio City Public Market", "cubao-farmers": "Farmers Market Cubao", "dapitan-market": "Dapitan Arcade" };
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const out={};
for (const [k,t] of Object.entries(titles)) {
  for (let a=0;a<4;a++){
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`,{headers:{"User-Agent":"salo-demo/0.1 (contact: demo@salo.ph)"}});
    if(res.status===429){await sleep(2500*(a+1));continue;}
    if(!res.ok){console.log("MISS",k);break;}
    const j=await res.json(); const s=j.thumbnail?.source; if(!s){console.log("NOIMG",k);break;}
    out[k]={url:s.replace(/\/\d+px-/,"/1400px-").split("?")[0],credit:j.title}; console.log("OK",k,out[k].url); break;
  }
  await sleep(800);
}
fs.writeFileSync(new URL("./extra-images.json",import.meta.url),JSON.stringify(out,null,2));
