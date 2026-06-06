import { useState, useEffect } from "react";

// ── PERSISTENCE ───────────────────────────────────────────────────────────────
// Saves state to the device (browser localStorage). Works on StackBlitz/CodeSandbox
// and on your phone's home-screen app. Falls back gracefully if storage is blocked
// (e.g. inside some embedded previews).
function loadStored(key, fallback) {
  try {
    const raw = typeof localStorage!=="undefined" && localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function usePersisted(key, initializer) {
  const [value, setValue] = useState(() => {
    const stored = loadStored(key, undefined);
    return stored!==undefined ? stored : (typeof initializer==="function" ? initializer() : initializer);
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const INITIAL_WINES = [
  { id:5, name:"Penfolds Grange 2016", producer:"Penfolds", region:"South Australia", country:"Australia", type:"Red", varietal:"Shiraz", vintage:2016, rating:98, price:850, location:"Rack A-2", status:"sealed", fill:100, notes:"The flagship. Dark fruits, chocolate, leather. A 30-year wine.", acquired:"2020-05", bottles:1, bucket:"liked" },
  { id:3, name:"Sassicaia 2019", producer:"Tenuta San Guido", region:"Tuscany", country:"Italy", type:"Red", varietal:"Cabernet Sauvignon", vintage:2019, rating:97, price:280, location:"Rack A-3", status:"sealed", fill:100, notes:"A legendary vintage. Graphite, blackberry, tobacco. Drink from 2027.", acquired:"2021-11", bottles:3, bucket:"liked" },
  { id:1, name:"Opus One 2018", producer:"Opus One Winery", region:"Napa Valley", country:"USA", type:"Red", varietal:"Cabernet Blend", vintage:2018, rating:96, price:350, location:"Rack A-1", status:"sealed", fill:100, notes:"Cassis, dark cherry, cedar. Monumental structure with velvety tannins. Save until 2026.", acquired:"2021-06", bottles:2, bucket:"liked" },
  { id:6, name:"Cristal 2015", producer:"Louis Roederer", region:"Champagne", country:"France", type:"Sparkling", varietal:"Pinot Noir/Chardonnay", vintage:2015, rating:97, price:350, location:"Rack C-1", status:"sealed", fill:100, notes:"Brioche, lemon curd, chalky minerality. Exceptional prestige cuvée.", acquired:"2022-01", bottles:2, bucket:"liked" },
  { id:2, name:"Domaine Leflaive Puligny-Montrachet", producer:"Domaine Leflaive", region:"Burgundy", country:"France", type:"White", varietal:"Chardonnay", vintage:2020, rating:94, price:180, location:"Rack B-2", status:"open", fill:60, notes:"Hazelnut, white flowers, minerality. Perfectly balanced with extraordinary length.", acquired:"2022-03", bottles:1, bucket:"liked" },
  { id:4, name:"Cloudy Bay Te Koko", producer:"Cloudy Bay", region:"Marlborough", country:"NZ", type:"White", varietal:"Sauvignon Blanc", vintage:2021, rating:91, price:55, location:"Fridge", status:"open", fill:40, notes:"Passionfruit, grapefruit zest, flinty minerality. Drinking beautifully now.", acquired:"2023-08", bottles:1, bucket:"fine" },
];

// `bucket` = sentiment tier (liked/fine/didnt). Personal 0–10 score is derived
// dynamically from each bottle's RANK within its bucket (Beli-style).
const INITIAL_SPIRITS = [
  { id:4, name:"George T. Stagg 2023", distillery:"Buffalo Trace", type:"Bourbon", age:null, proof:144.3, rating:97, price:200, location:"Barrel Room - Shelf A", status:"sealed", fill:100, notes:"BTAC unicorn. Raw power — dark fruit, vanilla, and heat. Sit on this for 2 years.", acquired:"2023-10", bucket:"liked" },
  { id:1, name:"Pappy Van Winkle 15yr", distillery:"Buffalo Trace", type:"Bourbon", age:15, proof:107, rating:98, price:850, location:"Barrel Room - Shelf A", status:"sealed", fill:100, notes:"Impossibly smooth. Vanilla, caramel, and a long spicy finish. Reserve for special occasions.", acquired:"2022-11", bucket:"liked" },
  { id:2, name:"Yamazaki 18", distillery:"Suntory", type:"Japanese Whisky", age:18, proof:86, rating:95, price:320, location:"Barrel Room - Shelf A", status:"open", fill:72, notes:"Dried fruits, Mizunara oak, hints of sandalwood. One of the best drams I own.", acquired:"2023-04", bucket:"liked" },
  { id:5, name:"Redbreast 21", distillery:"Irish Distillers", type:"Irish Whiskey", age:21, proof:92, rating:94, price:220, location:"Barrel Room - Shelf B", status:"sealed", fill:100, notes:"Tropical fruit, toasted oak, velvety mouthfeel. The pinnacle of Irish whiskey.", acquired:"2023-09", bucket:"liked" },
  { id:3, name:"Ardbeg Uigeadail", distillery:"Ardbeg", type:"Islay Scotch", age:null, proof:108.6, rating:92, price:75, location:"Barrel Room - Shelf B", status:"open", fill:45, notes:"Peat smoke and dark chocolate. Sherry cask sweetness balances the phenols beautifully.", acquired:"2024-01", bucket:"fine" },
  { id:6, name:"El Tesoro Añejo", distillery:"El Tesoro", type:"Tequila", age:3, proof:80, rating:88, price:65, location:"Bar Cart", status:"open", fill:30, notes:"Agave forward with cooked sweet agave, light oak, and pepper. Excellent sipper.", acquired:"2024-03", bucket:"fine" },
];

// Sentiment buckets map to score sub-ranges, like Beli (0–10 scale)
const BUCKETS = {
  liked:  { label:"I loved it",    emoji:"😍", range:[6.7,10.0], color:"#4A8A6A" },
  fine:   { label:"It was fine",   emoji:"🙂", range:[3.4,6.6],  color:"#C8A050" },
  didnt:  { label:"Didn't like it",emoji:"😕", range:[0.0,3.3],  color:"#A0522A" },
};

// Given the full ordered spirits array (best→worst within each bucket already),
// compute each bottle's 0–10 personal score from its position inside its bucket.
function computeScores(list) {
  const out = list.map(s=>({...s}));
  ["liked","fine","didnt"].forEach(bk=>{
    const inB = out.filter(s=>s.bucket===bk);
    const [lo,hi] = BUCKETS[bk].range;
    const n = inB.length;
    inB.forEach((s,i)=>{
      // rank 0 = top of bucket -> hi; last -> lo
      const score = n===1 ? (hi+lo)/2 : hi - (i*(hi-lo)/(n-1));
      s.myScore = Math.round(score*10)/10;
    });
  });
  return out;
}

// Each ingredient carries a `need`: {spirit:[types...]} matched against your bottles,
// or {pantry:"key"} matched against your bar pantry. No `need` = garnish/ignored.
const INITIAL_COCKTAILS = [
  { id:1, name:"Old Fashioned", category:"Stirred", glass:"Rocks", rating:95, myRating:5, times:12, notes:"My go-to. Use Knob Creek Rye for best results.", custom:false, ingredients:[
    {amt:"2 oz",item:"Bourbon or Rye",need:{spirit:["Bourbon","Rye"]}},
    {amt:"1 tsp",item:"Demerara syrup",need:{pantry:"Demerara syrup"}},
    {amt:"2 dashes",item:"Angostura bitters",need:{pantry:"Angostura bitters"}},
    {amt:"1 dash",item:"Orange bitters",need:{pantry:"Orange bitters"}},
    {amt:"1 peel",item:"Orange (expressed)",need:{pantry:"Orange"}},
  ], method:"Stir all ingredients over ice for 20–25 seconds. Strain into rocks glass over large ice cube. Express orange peel and garnish." },
  { id:2, name:"Negroni", category:"Stirred", glass:"Rocks", rating:93, myRating:5, times:8, notes:"Equal parts perfection. Use Tanqueray + Campari + Carpano Antica.", custom:false, ingredients:[
    {amt:"1 oz",item:"Gin",need:{spirit:["Gin"]}},
    {amt:"1 oz",item:"Campari",need:{spirit:["Campari"]}},
    {amt:"1 oz",item:"Sweet Vermouth",need:{spirit:["Vermouth"]}},
  ], method:"Stir with ice for 20 seconds. Strain into rocks glass over ice. Garnish with orange peel." },
  { id:3, name:"Penicillin", category:"Shaken", glass:"Rocks", rating:94, myRating:4, times:5, notes:"Blended Scotch base, Laphroaig float. One of the great modern classics.", custom:false, ingredients:[
    {amt:"2 oz",item:"Blended Scotch",need:{spirit:["Blended Whisky","Scotch"]}},
    {amt:"¾ oz",item:"Fresh lemon juice",need:{pantry:"Lemon"}},
    {amt:"¾ oz",item:"Honey-ginger syrup",need:{pantry:"Honey-ginger syrup"}},
    {amt:"¼ oz",item:"Islay Scotch (float)",need:{spirit:["Islay Scotch"]}},
  ], method:"Shake first 3 ingredients with ice. Strain into rocks glass over ice. Float Islay Scotch. Garnish with candied ginger." },
  { id:4, name:"My Spicy Margarita", category:"Shaken", glass:"Coupe", rating:null, myRating:5, times:20, notes:"Jalapeño-infused tequila makes all the difference.", custom:true, ingredients:[
    {amt:"2 oz",item:"Jalapeño Blanco Tequila",need:{spirit:["Blanco Tequila","Tequila"]}},
    {amt:"¾ oz",item:"Fresh lime juice",need:{pantry:"Lime"}},
    {amt:"½ oz",item:"Cointreau",need:{pantry:"Cointreau"}},
    {amt:"¼ oz",item:"Agave syrup",need:{pantry:"Agave syrup"}},
    {amt:"1 pinch",item:"Tajín rim",need:{pantry:"Tajín"}},
  ], method:"Rim glass with Tajín. Shake all ingredients hard with ice. Double strain into chilled coupe. Garnish with jalapeño wheel and lime." },
];

// Bar pantry: non-bottle items you stock. `have` toggles per item.
const INITIAL_PANTRY = [
  { id:1, name:"Angostura bitters", cat:"Bitters", have:true },
  { id:2, name:"Orange bitters", cat:"Bitters", have:true },
  { id:3, name:"Demerara syrup", cat:"Syrup", have:true },
  { id:4, name:"Simple syrup", cat:"Syrup", have:true },
  { id:5, name:"Honey-ginger syrup", cat:"Syrup", have:false },
  { id:6, name:"Agave syrup", cat:"Syrup", have:true },
  { id:7, name:"Lemon", cat:"Citrus", have:true },
  { id:8, name:"Lime", cat:"Citrus", have:true },
  { id:9, name:"Orange", cat:"Citrus", have:true },
  { id:10, name:"Cointreau", cat:"Liqueur", have:true },
  { id:11, name:"Tajín", cat:"Other", have:false },
];

const INITIAL_WISHLIST = [
  { id:1, name:"Hibiki 21", maker:"Suntory", type:"Japanese Whisky", collection:"barrel", price:650, priority:"high", note:"Holy grail. Watch for auction lots." },
  { id:2, name:"William Larue Weller", maker:"Buffalo Trace", type:"Bourbon", collection:"barrel", price:150, priority:"high", note:"BTAC wheated. MSRP if I can find it." },
  { id:3, name:"Screaming Eagle 2019", maker:"Screaming Eagle", type:"Red", collection:"cellar", price:3500, priority:"low", note:"Someday. Cult Napa Cab." },
  { id:4, name:"Domaine de la Romanée-Conti", maker:"DRC", type:"Red", collection:"cellar", price:5000, priority:"medium", note:"The dream Burgundy." },
  { id:5, name:"Springbank 18", maker:"Springbank", type:"Scotch", collection:"barrel", price:170, priority:"medium", note:"Funky Campbeltown character." },
];

const INITIAL_INFINITY = [
  { id:1, name:"House Bourbon Blend", started:"2023-01-15", baseSpirit:"Bourbon", currentProof:103, pours:[
    { date:"2023-01-15", spirit:"Eagle Rare 10yr", oz:6, proof:90 },
    { date:"2023-03-20", spirit:"Blanton's", oz:4, proof:93 },
    { date:"2023-06-10", spirit:"Stagg Jr", oz:3, proof:130 },
    { date:"2023-09-02", spirit:"Four Roses Single Barrel", oz:5, proof:100 },
    { date:"2024-01-12", spirit:"Wild Turkey Rare Breed", oz:4, proof:116 },
  ], notes:"My evolving bourbon solera. Started on New Year's. Gets more complex every pour." },
  { id:2, name:"Smoky Scotch Vat", started:"2023-08-01", baseSpirit:"Scotch", currentProof:96, pours:[
    { date:"2023-08-01", spirit:"Laphroaig 10", oz:5, proof:86 },
    { date:"2023-11-15", spirit:"Ardbeg 10", oz:4, proof:92 },
    { date:"2024-02-20", spirit:"Lagavulin 16", oz:3, proof:86 },
  ], notes:"Peat monster in the making. Reserved for cold winter nights." },
];

const ACTIVITY_CARDS = [
  { key:"pour", icon:"🍷", label:"Pick my pour", desc:"Random from your cellar" },
  { key:"dram", icon:"🥃", label:"Pick my dram", desc:"Random from barrel room" },
  { key:"blind", icon:"🫣", label:"Pick my blind", desc:"Blind bourbon flight" },
  { key:"cocktail", icon:"🍸", label:"Shake something", desc:"Random cocktail" },
];

const WINE_TYPE_COLORS  = { Red:"#8B1A1A", White:"#C8A84B", Sparkling:"#6A9FB5", Rosé:"#C87B8A" };
const SPIRIT_TYPE_COLORS = {
  Bourbon:"#B8520A", Rye:"#A0521A", "Tennessee Whiskey":"#9A4A12",
  Scotch:"#7A5C8A", "Islay Scotch":"#5A6E4A", "Irish Whiskey":"#4A7C59", "Japanese Whisky":"#C8860A",
  "Blended Whisky":"#8A6A3A",
  "Light Rum":"#B89A5A", "Dark Rum":"#6A3A1A", "Aged Rum":"#8A4A2A", "Spiced Rum":"#9A5A2A",
  Tequila:"#4A7A8A", "Blanco Tequila":"#5A8A9A", "Reposado Tequila":"#7A7A4A", Mezcal:"#5A5A3A",
  Gin:"#4A6A7A", Vodka:"#8A8A9A", Cognac:"#9A5A2A", Brandy:"#8A4A2A",
  Vermouth:"#7A4A5A", Campari:"#B02A2A", Aperol:"#D06A1A", Liqueur:"#6A4A7A",
};
const CAT_COLORS = { Stirred:"#4A6B8A", Shaken:"#8A4A6B", Built:"#6B8A4A", Blended:"#8A7A4A" };
const ALL_TYPE_COLORS = { ...WINE_TYPE_COLORS, ...SPIRIT_TYPE_COLORS };
const PRIORITY_COLORS = { high:"#C0392B", medium:"#D4A017", low:"#6A8A6A" };
function scoreColor(s){ return s>=6.7?"#4A8A6A":s>=3.4?"#C8A050":"#A0522A"; }

// ── TASTE ENGINE (Vivino-style) ───────────────────────────────────────────────
// Structural axes 0–5. Wines: body, tannin, sweetness, acidity, oak.
// Spirits: body, sweetness, smoke/peat, spice, oak.
const WINE_AXES = [
  { key:"body", left:"Light", right:"Bold" },
  { key:"tannin", left:"Smooth", right:"Tannic" },
  { key:"sweet", left:"Dry", right:"Sweet" },
  { key:"acidity", left:"Soft", right:"Acidic" },
  { key:"oak", left:"Unoaked", right:"Oaky" },
];
const SPIRIT_AXES = [
  { key:"body", left:"Delicate", right:"Full" },
  { key:"sweet", left:"Dry", right:"Sweet" },
  { key:"smoke", left:"Clean", right:"Smoky" },
  { key:"spice", left:"Mellow", right:"Spicy" },
  { key:"oak", left:"Young", right:"Oaky" },
];
// taste attributes per seed bottle id (0–5 each) + extra descriptors
const WINE_TASTE = {
  1:{ body:5, tannin:4, sweet:1, acidity:3, oak:4, finish:"none" },
  2:{ body:3, tannin:1, sweet:1, acidity:4, oak:3, finish:"none" },
  3:{ body:5, tannin:5, sweet:1, acidity:3, oak:4, finish:"none" },
  4:{ body:2, tannin:0, sweet:1, acidity:5, oak:2, finish:"none" },
  5:{ body:5, tannin:4, sweet:1, acidity:3, oak:5, finish:"none" },
  6:{ body:3, tannin:0, sweet:2, acidity:5, oak:2, finish:"none" },
};
const SPIRIT_TASTE = {
  1:{ body:5, sweet:4, smoke:0, spice:3, oak:4, finish:"none" },        // Pappy 15
  2:{ body:4, sweet:3, smoke:1, spice:2, oak:5, finish:"Mizunara" },    // Yamazaki 18
  3:{ body:4, sweet:2, smoke:5, spice:3, oak:3, finish:"Sherry" },      // Ardbeg Uigeadail
  4:{ body:5, sweet:3, smoke:1, spice:5, oak:4, finish:"none" },        // Stagg
  5:{ body:4, sweet:3, smoke:0, spice:2, oak:4, finish:"Sherry" },      // Redbreast 21
  6:{ body:2, sweet:2, smoke:0, spice:3, oak:2, finish:"none" },        // El Tesoro
};
function attachTaste(list, table){ return list.map(x=>({...x, taste:{...(table[x.id]||{})}})); }

// Build a weighted preference profile from rated bottles.
// Each bottle contributes its axis values weighted by (myScore-5): liked pulls
// the profile toward its attributes, disliked pushes away.
function buildProfile(list, axes){
  const rated = list.filter(b=>b.myScore!=null && b.taste && axes.some(a=>b.taste[a.key]!=null));
  const prefs = {}; const importance = {};
  axes.forEach(a=>{
    let wsum=0, w=0, spread=[];
    rated.forEach(b=>{
      const v=b.taste[a.key]; if(v==null) return;
      const weight=(b.myScore-5); // -5..+5
      wsum += v*weight; w += Math.abs(weight); spread.push({v,weight});
    });
    // preferred value = weighted avg of liked bottles' axis values
    const likedOnly = rated.filter(b=>b.myScore>=6 && b.taste[a.key]!=null);
    const pref = likedOnly.length
      ? likedOnly.reduce((s,b)=>s+b.taste[a.key]*(b.myScore-5),0)/likedOnly.reduce((s,b)=>s+(b.myScore-5),0)
      : 2.5;
    prefs[a.key] = Math.max(0,Math.min(5, pref));
    // importance = how consistently rating tracks this axis (variance of liked values, inverted)
    importance[a.key] = likedOnly.length>=2 ? 1 : 0.6;
  });
  // favorite types & finishes
  const typeAgg={}, finishAgg={};
  rated.forEach(b=>{
    if(b.myScore>=6){
      typeAgg[b.type]=(typeAgg[b.type]||0)+1;
      const f=b.taste.finish; if(f&&f!=="none") finishAgg[f]=(finishAgg[f]||0)+1;
    }
  });
  const favType = Object.entries(typeAgg).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  const favFinish = Object.entries(finishAgg).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;
  return { prefs, importance, favType, favFinish, count:rated.length, typeAgg, finishAgg };
}

// Predict 0–100% match for a candidate against the profile.
function predictMatch(candidateTaste, candidateType, profile, axes){
  if(profile.count<2) return null;
  let dist=0, wTot=0;
  axes.forEach(a=>{
    const v=candidateTaste?.[a.key]; if(v==null) return;
    const w=profile.importance[a.key]||0.6;
    const d=Math.abs(v-profile.prefs[a.key])/5; // 0..1
    dist += d*w; wTot += w;
  });
  let axisScore = wTot? 1-(dist/wTot) : 0.5; // 0..1
  // type affinity bonus
  const typeBonus = candidateType===profile.favType ? 0.08 :
    (profile.typeAgg[candidateType]?0.03:-0.04);
  // finish affinity
  const finishBonus = candidateTaste?.finish && candidateTaste.finish===profile.favFinish ? 0.06 : 0;
  let pct = Math.round((axisScore+typeBonus+finishBonus)*100);
  return Math.max(1, Math.min(99, pct));
}
function matchColor(p){ return p>=75?"#4A8A6A":p>=50?"#C8A050":"#A0522A"; }
function matchLabel(p){ return p>=80?"You'll love it":p>=65?"Strong match":p>=50?"Worth a try":p>=35?"Hit or miss":"Probably not"; }

// ── COCKTAIL INGREDIENT MATCHING ──────────────────────────────────────────────
// Decides which ingredients you can cover from your bottles (by spirit type) and
// your pantry (by item name). Type-precise: "Dark Rum" only matches Dark Rum bottles.
function ingredientStatus(ing, spirits, pantry){
  if(!ing.need) return "garnish"; // no requirement (ice, garnish, etc.)
  if(ing.need.pantry){
    const p = pantry.find(x=>x.name.toLowerCase()===ing.need.pantry.toLowerCase());
    return p && p.have ? "have" : "missing";
  }
  if(ing.need.spirit){
    // satisfied if you own a bottle whose type is one of the accepted types
    const ok = spirits.some(b=>ing.need.spirit.includes(b.type));
    return ok ? "have" : "missing";
  }
  return "garnish";
}
function cocktailReadiness(c, spirits, pantry){
  const required = (c.ingredients||[]).filter(i=>i.need);
  const missing = required.filter(i=>ingredientStatus(i,spirits,pantry)==="missing");
  return { total:required.length, missingList:missing, canMake:missing.length===0 };
}


const S = {
  bg:"#0A0806", card:"#111009", cardBorder:"#2A2218",
  gold:"#C8A050", goldLight:"#E8C070", text:"#F0E8D8",
  muted:"#7A6A50", faint:"#3A2E1E", wine:"#7A1E1E",
  bourbon:"#8A4A0A", cream:"#E8DCC8",
};

// ── SHARED COMPONENTS ─────────────────────────────────────────────────────────
function Stars({ n, max=5, size=12 }) {
  return <span>{Array.from({length:max},(_,i)=><span key={i} style={{fontSize:size,color:i<n?"#C8A050":"#2A2218"}}>★</span>)}</span>;
}
function FillBar({ pct, color="#C8A050" }) {
  return (
    <div style={{height:3,background:"#1A1510",borderRadius:2,overflow:"hidden",marginTop:5}}>
      <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:2,transition:"width .5s"}}/>
    </div>
  );
}
function Badge({ label, color }) {
  return <span style={{fontSize:9,fontFamily:"Georgia,serif",fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color,background:`${color}22`,borderRadius:4,padding:"2px 7px"}}>{label}</span>;
}
function Modal({ children, onClose }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(6px)"}} onClick={onClose}>
      <div style={{background:"linear-gradient(170deg,#141009,#1A1510)",border:`1px solid ${S.faint}`,borderRadius:"24px 24px 0 0",padding:"24px 20px 44px",width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:S.faint,borderRadius:2,margin:"0 auto 20px"}}/>
        {children}
      </div>
    </div>
  );
}
function SearchBar({ value, onChange, placeholder }) {
  return (
    <div style={{position:"relative",marginBottom:12}}>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"Search…"} style={{width:"100%",padding:"11px 16px 11px 38px",background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:12,color:S.text,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"Georgia,serif"}}/>
      <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",opacity:.4,fontSize:14}}>🔍</span>
    </div>
  );
}
function FilterPills({ options, value, onChange, activeStyle, activeBorder }) {
  return (
    <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:4,marginBottom:14,scrollbarWidth:"none"}}>
      {options.map(o=>{
        const active = value===o;
        return <button key={o} onClick={()=>onChange(o)} style={{whiteSpace:"nowrap",padding:"5px 13px",background:active?(activeStyle||`linear-gradient(135deg,#6A1A1A,${S.wine})`):S.card,border:`1px solid ${active?(activeBorder||S.wine):S.cardBorder}`,borderRadius:20,color:active?S.cream:S.muted,fontSize:11,cursor:"pointer",letterSpacing:.5,transition:"all .15s"}}>{o}</button>;
      })}
    </div>
  );
}
const FIELD = {width:"100%",background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:10,color:S.cream,fontSize:13,fontFamily:"Georgia,serif",padding:"10px 12px",outline:"none",boxSizing:"border-box"};
const LABEL = {fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:5,display:"block"};

// ── WINE / SPIRIT CARDS ───────────────────────────────────────────────────────
function WineCard({ wine, onClick }) {
  const tc = WINE_TYPE_COLORS[wine.type]||"#888";
  return (
    <div onClick={()=>onClick(wine)} style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px",cursor:"pointer",transition:"border-color .15s,transform .15s",position:"relative",overflow:"hidden"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=S.gold;e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=S.cardBorder;e.currentTarget.style.transform=""}}>
      <div style={{position:"absolute",top:0,right:0,width:50,height:50,background:`radial-gradient(circle at top right,${tc}33,transparent)`}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <Badge label={wine.type} color={tc}/>
        {wine.myScore!=null
          ? <span style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:scoreColor(wine.myScore)}}>{wine.myScore.toFixed(1)}</span>
          : <span style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold}}>{wine.rating}</span>}
      </div>
      <div style={{marginTop:8,fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text,lineHeight:1.2}}>{wine.name}</div>
      <div style={{fontSize:10,color:S.muted,marginTop:2}}>{wine.producer} · {wine.vintage}</div>
      <div style={{fontSize:10,color:S.muted}}>{wine.region}, {wine.country}</div>
      <Stars n={Math.round(wine.rating/20)} size={10}/>
      <FillBar pct={wine.fill} color={tc}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        <span style={{fontSize:9,color:S.faint}}>📍 {wine.location}</span>
        <span style={{fontSize:9,color:wine.status==="sealed"?"#4A8A6A":"#A08040",background:wine.status==="sealed"?"#1A3A2A":"#2A2010",borderRadius:4,padding:"1px 6px",fontWeight:700}}>{wine.status==="sealed"?"SEALED":`${wine.fill}%`}</span>
      </div>
      {wine.bottles>1&&<div style={{fontSize:9,color:S.muted,marginTop:2}}>×{wine.bottles} bottles</div>}
    </div>
  );
}
function SpiritCard({ spirit, onClick }) {
  const tc = SPIRIT_TYPE_COLORS[spirit.type]||"#888";
  return (
    <div onClick={()=>onClick(spirit)} style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px",cursor:"pointer",transition:"border-color .15s,transform .15s",position:"relative",overflow:"hidden"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor="#C8860A";e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=S.cardBorder;e.currentTarget.style.transform=""}}>
      <div style={{position:"absolute",top:0,right:0,width:50,height:50,background:`radial-gradient(circle at top right,${tc}33,transparent)`}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <Badge label={spirit.type} color={tc}/>
        {spirit.myScore!=null
          ? <span style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:scoreColor(spirit.myScore)}}>{spirit.myScore.toFixed(1)}</span>
          : <span style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#D4900A"}}>{spirit.rating}</span>}
      </div>
      <div style={{marginTop:8,fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text,lineHeight:1.2}}>{spirit.name}</div>
      <div style={{fontSize:10,color:S.muted,marginTop:2}}>{spirit.distillery}{spirit.age?` · ${spirit.age}yr`:""}</div>
      <div style={{fontSize:10,color:S.muted}}>{spirit.proof}° proof</div>
      <Stars n={Math.round(spirit.rating/20)} size={10}/>
      <FillBar pct={spirit.fill} color={tc}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
        <span style={{fontSize:9,color:S.faint}}>📍 {spirit.location}</span>
        <span style={{fontSize:9,color:spirit.status==="sealed"?"#4A8A6A":"#A08040",background:spirit.status==="sealed"?"#1A3A2A":"#2A2010",borderRadius:4,padding:"1px 6px",fontWeight:700}}>{spirit.status==="sealed"?"SEALED":`${spirit.fill}%`}</span>
      </div>
    </div>
  );
}

// ── DETAIL MODALS ─────────────────────────────────────────────────────────────
// Compact Vivino-style taste characteristic bars for a single bottle's detail sheet
function TasteBars({ taste, axes, accent }) {
  if(!taste || !axes.some(a=>taste[a.key]!=null)) return null;
  return (
    <div style={{marginTop:16,background:"#1A1510",borderRadius:12,padding:"14px",border:`1px solid ${S.faint}`}}>
      <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Taste Characteristics</div>
      {axes.map(a=>{
        const v = taste[a.key];
        if(v==null) return null;
        const pct=(v/5)*100;
        return (
          <div key={a.key} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:4}}>
              <span style={{color:pct<50?accent:S.muted,fontWeight:pct<50?700:400}}>{a.left}</span>
              <span style={{color:pct>=50?accent:S.muted,fontWeight:pct>=50?700:400}}>{a.right}</span>
            </div>
            <div style={{position:"relative",height:6,background:"#0E0A05",borderRadius:3}}>
              <div style={{position:"absolute",left:`calc(${pct}% - 5px)`,top:-2,width:10,height:10,borderRadius:5,background:accent,boxShadow:`0 0 6px ${accent}88`}}/>
              <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:`${accent}33`,borderRadius:3}}/>
            </div>
          </div>
        );
      })}
      {taste.finish && taste.finish!=="none" && (
        <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Finish</span>
          <span style={{fontSize:11,color:accent,fontFamily:"'Playfair Display',serif",fontWeight:700}}>{taste.finish} cask</span>
        </div>
      )}
    </div>
  );
}

function WineDetail({ wine, onClose, onRerank, onDelete }) {
  const tc = WINE_TYPE_COLORS[wine.type]||"#888";
  const hasScore = wine.myScore!=null;
  return (
    <Modal onClose={onClose}>
      <Badge label={wine.type} color={tc}/>
      <div style={{fontSize:22,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.text,marginTop:8,lineHeight:1.2}}>{wine.name}</div>
      <div style={{fontSize:12,color:S.muted,marginTop:2}}>{wine.producer} · {wine.vintage} · {wine.varietal}</div>

      <div style={{display:"flex",gap:10,marginTop:12}}>
        {hasScore&&(
          <div style={{flex:1,background:`${scoreColor(wine.myScore)}1A`,border:`1px solid ${scoreColor(wine.myScore)}55`,borderRadius:12,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}>
              <span style={{fontSize:30,fontFamily:"'Playfair Display',serif",fontWeight:900,color:scoreColor(wine.myScore)}}>{wine.myScore.toFixed(1)}</span>
              <span style={{fontSize:11,color:S.muted}}>/ 10</span>
            </div>
            <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>My Score · {BUCKETS[wine.bucket]?.emoji}</div>
          </div>
        )}
        <div style={{flex:1,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:12,padding:"10px 12px"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontSize:30,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold}}>{wine.rating}</span>
            <span style={{fontSize:11,color:S.muted}}>/ 100</span>
          </div>
          <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Critic Score</div>
        </div>
      </div>

      <button onClick={()=>onRerank(wine)} style={{marginTop:10,width:"100%",padding:10,background:"#1A0808",border:"1px solid #5A1A1A",borderRadius:10,color:S.gold,fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>
        {hasScore?"⇅ Re-rank this bottle":"★ Rank this bottle"}
      </button>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:16}}>
        {[["Price",`$${wine.price}`],["Bottles",wine.bottles],["Acquired",wine.acquired]].map(([l,v])=>(
          <div key={l} style={{background:"#1A1510",borderRadius:10,padding:"8px 10px",textAlign:"center",border:`1px solid ${S.faint}`}}>
            <div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.gold}}>{v}</div>
            <div style={{fontSize:9,color:S.muted,marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>
      <TasteBars taste={wine.taste} axes={WINE_AXES} accent={S.gold}/>
      <div style={{marginTop:16,background:"#1A1510",borderRadius:12,padding:"12px 14px",border:`1px solid ${S.faint}`}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Tasting Notes</div>
        <div style={{fontSize:13,color:S.cream,fontFamily:"Georgia,serif",lineHeight:1.7,fontStyle:"italic"}}>"{wine.notes}"</div>
      </div>
      <div style={{marginTop:12,display:"flex",gap:8}}>
        <div style={{flex:1,background:"#1A1510",borderRadius:10,padding:"10px 12px",border:`1px solid ${S.faint}`}}>
          <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Location</div>
          <div style={{fontSize:12,color:S.cream,marginTop:2}}>📍 {wine.location}</div>
        </div>
        <div style={{flex:1,background:"#1A1510",borderRadius:10,padding:"10px 12px",border:`1px solid ${S.faint}`}}>
          <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Status</div>
          <div style={{fontSize:12,color:wine.status==="sealed"?"#4A8A6A":"#A08040",marginTop:2}}>{wine.status==="sealed"?"🔒 Sealed":`${wine.fill}% remaining`}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18}}>
        <button onClick={()=>{ if(confirm(`Delete "${wine.name}" from your cellar? This can't be undone.`)) onDelete(wine); }} style={{flex:1,padding:13,background:"none",border:"1px solid #5A2A2A",borderRadius:14,color:"#A05A5A",fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Delete</button>
        <button onClick={onClose} style={{flex:2,padding:13,background:`linear-gradient(135deg,#6A1A1A,${S.wine})`,border:"none",borderRadius:14,color:S.cream,fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Close</button>
      </div>
    </Modal>
  );
}
function SpiritDetail({ spirit, onClose, onRerank, onDelete }) {
  const tc = SPIRIT_TYPE_COLORS[spirit.type]||"#888";
  const hasScore = spirit.myScore!=null;
  return (
    <Modal onClose={onClose}>
      <Badge label={spirit.type} color={tc}/>
      <div style={{fontSize:22,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.text,marginTop:8,lineHeight:1.2}}>{spirit.name}</div>
      <div style={{fontSize:12,color:S.muted,marginTop:2}}>{spirit.distillery}{spirit.age?` · ${spirit.age}yr`:""}</div>

      {/* Dual scores: personal (Beli) + critic */}
      <div style={{display:"flex",gap:10,marginTop:12}}>
        {hasScore&&(
          <div style={{flex:1,background:`${scoreColor(spirit.myScore)}1A`,border:`1px solid ${scoreColor(spirit.myScore)}55`,borderRadius:12,padding:"10px 12px"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}>
              <span style={{fontSize:30,fontFamily:"'Playfair Display',serif",fontWeight:900,color:scoreColor(spirit.myScore)}}>{spirit.myScore.toFixed(1)}</span>
              <span style={{fontSize:11,color:S.muted}}>/ 10</span>
            </div>
            <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>My Score · {BUCKETS[spirit.bucket]?.emoji}</div>
          </div>
        )}
        <div style={{flex:1,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:12,padding:"10px 12px"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span style={{fontSize:30,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#D4900A"}}>{spirit.rating}</span>
            <span style={{fontSize:11,color:S.muted}}>/ 100</span>
          </div>
          <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Critic Score</div>
        </div>
      </div>

      <button onClick={()=>onRerank(spirit)} style={{marginTop:10,width:"100%",padding:10,background:"#1A1208",border:"1px solid #5A3A10",borderRadius:10,color:"#D4900A",fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>
        {hasScore?"⇅ Re-rank this bottle":"★ Rank this bottle"}
      </button>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:16}}>
        {[["Proof",`${spirit.proof}°`],["Price",`$${spirit.price}`],["Acquired",spirit.acquired]].map(([l,v])=>(
          <div key={l} style={{background:"#1A1510",borderRadius:10,padding:"8px 10px",textAlign:"center",border:`1px solid ${S.faint}`}}>
            <div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:"#D4900A"}}>{v}</div>
            <div style={{fontSize:9,color:S.muted,marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>
      <TasteBars taste={spirit.taste} axes={SPIRIT_AXES} accent="#D4900A"/>
      <div style={{marginTop:16,background:"#1A1510",borderRadius:12,padding:"12px 14px",border:`1px solid ${S.faint}`}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Tasting Notes</div>
        <div style={{fontSize:13,color:S.cream,fontFamily:"Georgia,serif",lineHeight:1.7,fontStyle:"italic"}}>"{spirit.notes}"</div>
      </div>
      <div style={{marginTop:12,display:"flex",gap:8}}>
        <div style={{flex:1,background:"#1A1510",borderRadius:10,padding:"10px 12px",border:`1px solid ${S.faint}`}}>
          <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Location</div>
          <div style={{fontSize:12,color:S.cream,marginTop:2}}>📍 {spirit.location}</div>
        </div>
        <div style={{flex:1,background:"#1A1510",borderRadius:10,padding:"10px 12px",border:`1px solid ${S.faint}`}}>
          <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Status</div>
          <div style={{fontSize:12,color:spirit.status==="sealed"?"#4A8A6A":"#A08040",marginTop:2}}>{spirit.status==="sealed"?"🔒 Sealed":`${spirit.fill}% remaining`}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:18}}>
        <button onClick={()=>{ if(confirm(`Delete "${spirit.name}" from your barrel room? This can't be undone.`)) onDelete(spirit); }} style={{flex:1,padding:13,background:"none",border:"1px solid #5A2A2A",borderRadius:14,color:"#A05A5A",fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Delete</button>
        <button onClick={onClose} style={{flex:2,padding:13,background:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:14,color:S.cream,fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Close</button>
      </div>
    </Modal>
  );
}

// ── BELI-STYLE COMPARISON RANKING ─────────────────────────────────────────────
// Pick sentiment bucket, then binary-search the bottle into the ranked list
// via head-to-head comparisons. Returns the new ordered spirits array.
function RankModal({ subject, items, kind, onClose, onCommit }) {
  const isWine = kind==="wine";
  const accent = isWine ? S.gold : "#D4900A";
  const emoji = isWine ? "🍷" : "🥃";
  const axes = isWine ? WINE_AXES : SPIRIT_AXES;
  const sub = (it) => isWine ? `${it.producer} · ${it.vintage}` : it.distillery;
  const [bucket,setBucket]=useState(subject.bucket||null);
  const peers = bucket ? items.filter(s=>s.bucket===bucket && s.id!==subject.id) : [];
  const [lo,setLo]=useState(0);
  const [hi,setHi]=useState(peers.length);
  const mid = Math.floor((lo+hi)/2);

  // taste-review step
  const [pendingIdx,setPendingIdx]=useState(null); // insert index, set once ranking is done
  const [taste,setTaste]=useState(()=>{
    const base = subject.taste || {};
    return { ...Object.fromEntries(axes.map(a=>[a.key, base[a.key]!=null?base[a.key]:2.5])), finish: base.finish||"none" };
  });
  const [reviewNote,setReviewNote]=useState(subject.notes && subject.notes!=="No notes yet."?subject.notes:"");

  const chooseBucket = (bk) => {
    const p = items.filter(s=>s.bucket===bk && s.id!==subject.id);
    setBucket(bk); setLo(0); setHi(p.length);
  };

  // finish ranking -> move to taste step (instead of committing immediately)
  const finishRanking = (insertIdx) => setPendingIdx(insertIdx);

  const commit = () => {
    const others = items.filter(s=>s.id!==subject.id);
    const bucketList = others.filter(s=>s.bucket===bucket);
    const rest = others.filter(s=>s.bucket!==bucket);
    const tasteObj = { ...Object.fromEntries(axes.map(a=>[a.key,Number(taste[a.key])])), finish:taste.finish };
    const updatedSubject = { ...subject, bucket, taste:tasteObj, notes: reviewNote.trim()||subject.notes||"No notes yet." };
    bucketList.splice(pendingIdx,0,updatedSubject);
    const finalArr=[];
    ["liked","fine","didnt"].forEach(bk=>{
      if(bk===bucket) finalArr.push(...bucketList);
      else finalArr.push(...rest.filter(s=>s.bucket===bk));
    });
    onCommit(computeScores(finalArr));
  };

  const pick = (preferSubject) => {
    if (preferSubject) { const nh = mid; if (lo>=nh) return finishRanking(lo); setHi(nh); }
    else { const nl = mid+1; if (nl>=hi) return finishRanking(nl); setLo(nl); }
  };

  // auto-advance to taste step when there's nothing to compare
  if (pendingIdx===null && bucket!==null && (peers.length===0 || lo>=hi)) { setTimeout(()=>setPendingIdx(lo),0); }

  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:accent}}>{pendingIdx!==null?"Your review":"Rank it"}</div>
      <div style={{fontSize:12,color:S.muted,marginTop:2,marginBottom:18}}>{subject.name}</div>

      {pendingIdx!==null ? (
        /* ── TASTE / REVIEW STEP ── */
        <>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,padding:"10px 14px",background:`${BUCKETS[bucket].color}1A`,border:`1px solid ${BUCKETS[bucket].color}55`,borderRadius:12}}>
            <span style={{fontSize:20}}>{BUCKETS[bucket].emoji}</span>
            <span style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:BUCKETS[bucket].color}}>{BUCKETS[bucket].label}</span>
          </div>

          <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Rate the taste</div>
          {axes.map(a=>(
            <div key={a.key} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.muted,marginBottom:4}}><span>{a.left}</span><span>{a.right}</span></div>
              <input type="range" min="0" max="5" step="0.5" value={taste[a.key]} onChange={e=>setTaste(t=>({...t,[a.key]:e.target.value}))} style={{width:"100%",accentColor:accent}}/>
            </div>
          ))}

          {!isWine&&(
            <div style={{marginTop:4,marginBottom:8}}>
              <label style={LABEL}>Barrel Finish</label>
              <select value={taste.finish} onChange={e=>setTaste(t=>({...t,finish:e.target.value}))} style={{...FIELD,appearance:"none"}}>
                {["none","Sherry","Port","Mizunara","Rum cask","Wine cask","Cognac","Toasted oak"].map(f=><option key={f} value={f}>{f==="none"?"None / standard oak":f}</option>)}
              </select>
            </div>
          )}

          <label style={LABEL}>Review Notes</label>
          <textarea value={reviewNote} onChange={e=>setReviewNote(e.target.value)} rows={3} placeholder="Nose, palate, finish — what stood out?" style={{...FIELD,resize:"none",marginBottom:16}}/>

          <button onClick={commit} style={{width:"100%",padding:13,background:isWine?`linear-gradient(135deg,#6A1A1A,${S.wine})`:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:14,color:S.cream,fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Save Review</button>
        </>
      ) : bucket===null ? (
        <>
          <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>How was it?</div>
          {Object.entries(BUCKETS).map(([k,b])=>(
            <button key={k} onClick={()=>chooseBucket(k)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"14px 16px",marginBottom:10,background:`${b.color}1A`,border:`1px solid ${b.color}55`,borderRadius:14,cursor:"pointer"}}>
              <span style={{fontSize:24}}>{b.emoji}</span>
              <span style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:b.color}}>{b.label}</span>
            </button>
          ))}
        </>
      ) : (peers.length>0 && lo<hi) ? (
        <>
          <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:14,textAlign:"center"}}>Which do you prefer?</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>pick(true)} style={{flex:1,minHeight:120,background:isWine?"linear-gradient(160deg,#1E0408,#2A0810)":"linear-gradient(160deg,#1E0E04,#2A1508)",border:`1px solid ${isWine?"#6A1A20":"#6A3A10"}`,borderRadius:16,padding:"16px 12px",cursor:"pointer",display:"flex",flexDirection:"column",justifyContent:"center",gap:6}}>
              <div style={{fontSize:22}}>{emoji}</div>
              <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:accent,lineHeight:1.2}}>{subject.name}</div>
              <div style={{fontSize:10,color:S.muted}}>{sub(subject)}</div>
              <div style={{fontSize:9,color:accent,marginTop:4}}>the new one</div>
            </button>
            <div style={{display:"flex",alignItems:"center",fontSize:13,fontFamily:"'Playfair Display',serif",color:S.muted}}>vs</div>
            <button onClick={()=>pick(false)} style={{flex:1,minHeight:120,background:"#13100A",border:`1px solid ${S.faint}`,borderRadius:16,padding:"16px 12px",cursor:"pointer",display:"flex",flexDirection:"column",justifyContent:"center",gap:6}}>
              <div style={{fontSize:22}}>{emoji}</div>
              <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.cream,lineHeight:1.2}}>{peers[mid].name}</div>
              <div style={{fontSize:10,color:S.muted}}>{sub(peers[mid])}</div>
              <div style={{fontSize:9,color:S.muted,marginTop:4}}>ranked {peers[mid].myScore?.toFixed(1)}</div>
            </button>
          </div>
          <button onClick={()=>{ const nl=mid+1; nl>=hi?finishRanking(mid):setLo(nl); }} style={{marginTop:16,width:"100%",padding:11,background:"none",border:`1px solid ${S.faint}`,borderRadius:12,color:S.muted,fontSize:12,fontFamily:"Georgia,serif",cursor:"pointer"}}>Too tough to call →</button>
          <div style={{marginTop:10,textAlign:"center",fontSize:10,color:S.faint}}>Narrowing it down… ({hi-lo} left)</div>
        </>
      ) : (
        <div style={{textAlign:"center",padding:"30px 0",color:S.muted}}>Saving…</div>
      )}
    </Modal>
  );
}

// ── BLIND BOURBON FLIGHT ──────────────────────────────────────────────────────
function BlindFlightModal({ spirits, onClose }) {
  const [count,setCount]=useState(null);
  const [flight,setFlight]=useState([]);
  const [revealed,setRevealed]=useState({});

  const start = (n) => {
    const pool = spirits.slice();
    // prefer bourbons, fill with others if needed
    const bourbons = pool.filter(s=>s.type==="Bourbon");
    const rest = pool.filter(s=>s.type!=="Bourbon");
    const source = bourbons.length>=n ? bourbons : [...bourbons,...rest];
    const shuffled = source.sort(()=>Math.random()-0.5).slice(0, Math.min(n, source.length));
    setFlight(shuffled.map((s,i)=>({...s,pos:String.fromCharCode(65+i)})));
    setCount(n);
  };

  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#D4900A"}}>🫣 Pick My Blind</div>
      <div style={{fontSize:12,color:S.muted,marginTop:2,marginBottom:18}}>A blind bourbon flight — pour, taste, then reveal</div>

      {count===null ? (
        <>
          <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>How many pours?</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[2,3,4,5,6].map(n=>(
              <button key={n} onClick={()=>start(n)} style={{padding:"16px 0",background:"linear-gradient(160deg,#1E0E04,#2A1508)",border:"1px solid #6A3A10",borderRadius:12,color:"#D4900A",fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,cursor:"pointer"}}>{n}</button>
            ))}
          </div>
          <div style={{marginTop:14,fontSize:11,color:S.faint,textAlign:"center"}}>Pulls from your Barrel Room. Bourbons prioritized.</div>
        </>
      ) : (
        <>
          <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Your flight of {flight.length}</div>
          {flight.map(s=>(
            <div key={s.id} onClick={()=>setRevealed(r=>({...r,[s.id]:!r[s.id]}))} style={{marginBottom:10,padding:"14px 16px",background:revealed[s.id]?"linear-gradient(135deg,#1E0E04,#2A1508)":"#13100A",border:`1px solid ${revealed[s.id]?"#6A3A10":S.faint}`,borderRadius:14,cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:38,height:38,borderRadius:19,background:revealed[s.id]?"#3A1A06":"#1A1510",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#D4900A",flexShrink:0}}>{s.pos}</div>
              {revealed[s.id] ? (
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text}}>{s.name}</div>
                  <div style={{fontSize:10,color:S.muted}}>{s.distillery} · {s.proof}° · {s.type}</div>
                </div>
              ) : (
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.muted}}>Pour {s.pos}</div>
                  <div style={{fontSize:10,color:S.faint}}>Tap to reveal</div>
                </div>
              )}
              <span style={{fontSize:14,color:S.faint}}>{revealed[s.id]?"👁":"🙈"}</span>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <button onClick={()=>{setRevealed({});setCount(null);setFlight([]);}} style={{flex:1,padding:12,background:"none",border:`1px solid ${S.faint}`,borderRadius:12,color:S.muted,fontSize:12,fontFamily:"'Playfair Display',serif",cursor:"pointer"}}>New flight</button>
            <button onClick={()=>setRevealed(Object.fromEntries(flight.map(s=>[s.id,true])))} style={{flex:1,padding:12,background:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:12,color:S.cream,fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Reveal all</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── ADD BOTTLE FORM ───────────────────────────────────────────────────────────
function AddBottleModal({ collection, onClose, onAdd }) {
  const isWine = collection==="cellar";
  const [name,setName]=useState("");
  const [maker,setMaker]=useState("");      // producer / distillery
  const [type,setType]=useState(isWine?"Red":"Bourbon");
  const [vintage,setVintage]=useState("");  // wine
  const [varietal,setVarietal]=useState(""); // wine
  const [region,setRegion]=useState("");    // wine
  const [age,setAge]=useState("");          // spirit
  const [proof,setProof]=useState("");      // spirit
  const [rating,setRating]=useState(90);
  const [price,setPrice]=useState("");
  const [location,setLocation]=useState(isWine?"":"Barrel Room - Shelf A");
  const [status,setStatus]=useState("sealed");
  const [fill,setFill]=useState(100);
  const [notes,setNotes]=useState("");

  const accent = isWine ? S.wine : S.bourbon;
  const typeOpts = isWine ? Object.keys(WINE_TYPE_COLORS) : Object.keys(SPIRIT_TYPE_COLORS);

  const submit = () => {
    if(!name.trim()) return;
    const now = new Date().toISOString().slice(0,7);
    // taste is captured later, during the review/ranking step
    if(isWine){
      onAdd({ id:Date.now(), name, producer:maker||"Unknown", region:region||"—", country:"—", type, varietal:varietal||"—", vintage:vintage||"NV", rating:Number(rating), price:Number(price)||0, location:location||"Unassigned", status, fill:Number(fill), notes:notes||"No notes yet.", acquired:now, bottles:1 });
    } else {
      onAdd({ id:Date.now(), name, distillery:maker||"Unknown", type, age:age?Number(age):null, proof:Number(proof)||80, rating:Number(rating), price:Number(price)||0, location:location||"Unassigned", status, fill:Number(fill), notes:notes||"No notes yet.", acquired:now });
    }
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:isWine?S.gold:"#D4900A",marginBottom:4}}>
        {isWine?"🍾 Add to Cellar":"🥃 Add to Barrel Room"}
      </div>
      <div style={{fontSize:11,color:S.muted,marginBottom:16}}>{isWine?"New wine bottle":"New spirit / whiskey bottle"}</div>

      <label style={LABEL}>{isWine?"Wine Name":"Bottle Name"}</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder={isWine?"e.g. Château Margaux 2015":"e.g. Eagle Rare 10yr"} style={{...FIELD,marginBottom:12}}/>

      <label style={LABEL}>{isWine?"Producer":"Distillery"}</label>
      <input value={maker} onChange={e=>setMaker(e.target.value)} placeholder={isWine?"Winery":"Distillery"} style={{...FIELD,marginBottom:12}}/>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div>
          <label style={LABEL}>Type</label>
          <select value={type} onChange={e=>setType(e.target.value)} style={{...FIELD,appearance:"none"}}>{typeOpts.map(t=><option key={t}>{t}</option>)}</select>
        </div>
        {isWine ? (
          <div><label style={LABEL}>Vintage</label><input value={vintage} onChange={e=>setVintage(e.target.value)} placeholder="2018" style={FIELD}/></div>
        ) : (
          <div><label style={LABEL}>Age (yr)</label><input value={age} onChange={e=>setAge(e.target.value)} placeholder="NAS = blank" style={FIELD}/></div>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        {isWine ? (
          <>
            <div><label style={LABEL}>Varietal</label><input value={varietal} onChange={e=>setVarietal(e.target.value)} placeholder="Cabernet" style={FIELD}/></div>
            <div><label style={LABEL}>Region</label><input value={region} onChange={e=>setRegion(e.target.value)} placeholder="Napa" style={FIELD}/></div>
          </>
        ) : (
          <>
            <div><label style={LABEL}>Proof</label><input value={proof} onChange={e=>setProof(e.target.value)} placeholder="90" style={FIELD}/></div>
            <div><label style={LABEL}>Price ($)</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="120" style={FIELD}/></div>
          </>
        )}
      </div>

      {isWine&&(
        <div style={{marginBottom:12}}><label style={LABEL}>Price ($)</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="350" style={FIELD}/></div>
      )}

      <label style={LABEL}>My Rating: <span style={{color:isWine?S.gold:"#D4900A",fontWeight:700}}>{rating} pts</span></label>
      <input type="range" min="50" max="100" value={rating} onChange={e=>setRating(e.target.value)} style={{width:"100%",marginBottom:14,accentColor:accent}}/>

      <label style={LABEL}>Storage Location</label>
      <input value={location} onChange={e=>setLocation(e.target.value)} placeholder={isWine?"e.g. Rack A-1, Fridge":"e.g. Barrel Room - Shelf A"} style={{...FIELD,marginBottom:12}}/>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div>
          <label style={LABEL}>Status</label>
          <select value={status} onChange={e=>{setStatus(e.target.value); if(e.target.value==="sealed")setFill(100);}} style={{...FIELD,appearance:"none"}}>
            <option value="sealed">Sealed</option><option value="open">Open</option>
          </select>
        </div>
        <div>
          <label style={LABEL}>Fill: {fill}%</label>
          <input type="range" min="0" max="100" value={fill} disabled={status==="sealed"} onChange={e=>setFill(e.target.value)} style={{width:"100%",accentColor:accent,opacity:status==="sealed"?.4:1,marginTop:6}}/>
        </div>
      </div>

      <label style={LABEL}>Tasting Notes</label>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Nose, palate, finish…" style={{...FIELD,resize:"none",marginBottom:8}}/>
      <div style={{fontSize:10,color:S.faint,fontStyle:"italic",marginBottom:16,lineHeight:1.5}}>You'll rate the taste characteristics when you review this bottle.</div>

      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:12,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:12,color:S.muted,fontSize:13,fontFamily:"'Playfair Display',serif",cursor:"pointer"}}>Cancel</button>
        <button onClick={submit} style={{flex:2,padding:12,background:isWine?`linear-gradient(135deg,#6A1A1A,${S.wine})`:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:12,color:S.cream,fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Add Bottle</button>
      </div>
    </Modal>
  );
}

// ── COCKTAIL COMPONENTS ───────────────────────────────────────────────────────
function CocktailCard({ c, onClick, ready }) {
  const cc = CAT_COLORS[c.category]||"#888";
  return (
    <div onClick={()=>onClick(c)} style={{background:S.card,border:`1px solid ${ready?.canMake?"#3A6A4A":S.cardBorder}`,borderRadius:14,padding:"14px",cursor:"pointer",transition:"border-color .15s,transform .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=S.gold;e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=ready?.canMake?"#3A6A4A":S.cardBorder;e.currentTarget.style.transform=""}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Badge label={c.category} color={cc}/>{c.custom&&<Badge label="My Recipe" color={S.gold}/>}</div>
        <Stars n={c.myRating} size={11}/>
      </div>
      <div style={{fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text,marginTop:8}}>{c.name}</div>
      <div style={{fontSize:10,color:S.muted,marginTop:2}}>{c.glass} glass · {c.times}× made</div>
      <div style={{fontSize:11,color:S.muted,marginTop:6,lineHeight:1.5}}>
        {c.ingredients.slice(0,3).map(i=><span key={i.item} style={{display:"block"}}><span style={{color:S.gold}}>{i.amt}</span> {i.item}</span>)}
        {c.ingredients.length>3&&<span style={{color:S.faint}}>+{c.ingredients.length-3} more…</span>}
      </div>
      {ready&&(
        <div style={{marginTop:10,fontSize:10,fontWeight:700,fontFamily:"Georgia,serif",letterSpacing:.3,
          color:ready.canMake?"#6AC08A":"#C89A6A"}}>
          {ready.canMake ? "✓ You can make this" : `Missing ${ready.missingList.length}: ${ready.missingList.map(m=>m.item).join(", ")}`}
        </div>
      )}
    </div>
  );
}
function CocktailDetail({ c, onClose, onUpdate, spirits, pantry }) {
  const [myRating,setMyRating]=useState(c.myRating);
  const [notes,setNotes]=useState(c.notes);
  const [editing,setEditing]=useState(false);
  const cc = CAT_COLORS[c.category]||"#888";
  const save=()=>{onUpdate({...c,myRating,notes});setEditing(false);};
  const ready = cocktailReadiness(c, spirits||[], pantry||[]);
  return (
    <Modal onClose={onClose}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><Badge label={c.category} color={cc}/><Badge label={c.glass+" glass"} color={S.muted}/>{c.custom&&<Badge label="My Recipe" color={S.gold}/>}</div>
      <div style={{fontSize:22,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.text,marginTop:10}}>{c.name}</div>
      {c.rating&&<div style={{fontSize:12,color:S.muted}}>Community score: <span style={{color:S.gold,fontWeight:700}}>{c.rating}/100</span></div>}

      {/* readiness banner */}
      <div style={{marginTop:12,padding:"10px 14px",borderRadius:12,
        background:ready.canMake?"#16301F":"#2A2010",
        border:`1px solid ${ready.canMake?"#3A6A4A":"#5A4A1A"}`}}>
        <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:ready.canMake?"#6AC08A":"#D4A860"}}>
          {ready.canMake ? "✓ You have everything" : `Missing ${ready.missingList.length} ingredient${ready.missingList.length>1?"s":""}`}
        </div>
        {!ready.canMake&&<div style={{fontSize:11,color:S.muted,marginTop:3}}>{ready.missingList.map(m=>m.item).join(", ")}</div>}
      </div>

      <div style={{marginTop:14}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Ingredients</div>
        {c.ingredients.map((ing,i)=>{
          const st = ingredientStatus(ing, spirits||[], pantry||[]);
          const icon = st==="have"?"✓":st==="missing"?"✕":"·";
          const col = st==="have"?"#6AC08A":st==="missing"?"#C86A6A":S.faint;
          return (
            <div key={i} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:`1px solid ${S.faint}`,alignItems:"center"}}>
              <span style={{fontSize:13,color:col,fontWeight:700,minWidth:14,textAlign:"center"}}>{icon}</span>
              <span style={{fontSize:13,color:S.gold,fontFamily:"'Playfair Display',serif",fontWeight:700,minWidth:50}}>{ing.amt}</span>
              <span style={{fontSize:13,color:st==="missing"?S.muted:S.cream,fontFamily:"Georgia,serif"}}>{ing.item}</span>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:14,background:"#1A1510",borderRadius:12,padding:"12px 14px",border:`1px solid ${S.faint}`}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Method</div>
        <div style={{fontSize:12,color:S.cream,fontFamily:"Georgia,serif",lineHeight:1.7}}>{c.method}</div>
      </div>
      <div style={{marginTop:14}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>My Rating</div>
        <div style={{display:"flex",gap:8}}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>setMyRating(n)} style={{fontSize:24,background:"none",border:"none",cursor:"pointer",color:n<=myRating?"#C8A050":"#2A2218",padding:0,transition:"transform .1s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform=""}>★</button>
          ))}
        </div>
      </div>
      <div style={{marginTop:14}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>My Notes</div>
        {editing
          ? <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{...FIELD,border:`1px solid ${S.gold}`,resize:"none"}}/>
          : <div onClick={()=>setEditing(true)} style={{fontSize:12,color:S.cream,fontFamily:"Georgia,serif",lineHeight:1.7,fontStyle:"italic",cursor:"pointer",background:"#1A1510",borderRadius:10,padding:"10px 12px",border:`1px solid ${S.faint}`}}>"{notes||"Tap to add notes…"}"</div>}
      </div>
      <div style={{display:"flex",gap:8,marginTop:18}}>
        {editing&&<button onClick={save} style={{flex:1,padding:12,background:"linear-gradient(135deg,#1A4A2A,#2A6A3A)",border:"none",borderRadius:12,color:"#A0E0B0",fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Save</button>}
        <button onClick={onClose} style={{flex:1,padding:12,background:"linear-gradient(135deg,#2A1A4A,#3A2A6A)",border:"none",borderRadius:12,color:"#C0B0E0",fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Close</button>
      </div>
    </Modal>
  );
}
function AddCocktailModal({ onClose, onAdd, pantry }) {
  const [name,setName]=useState(""); const [category,setCategory]=useState("Stirred");
  const [glass,setGlass]=useState("Rocks"); const [method,setMethod]=useState("");
  const [notes,setNotes]=useState(""); const [ings,setIngs]=useState([{amt:"",item:"",req:""}]);
  const addIng=()=>setIngs([...ings,{amt:"",item:"",req:""}]);
  const updateIng=(i,k,v)=>setIngs(ings.map((x,j)=>j===i?{...x,[k]:v}:x));
  const spiritTypes=Object.keys(SPIRIT_TYPE_COLORS);
  const pantryNames=(pantry||[]).map(p=>p.name);
  const buildNeed=(req)=>{
    if(!req) return undefined;
    if(req.startsWith("spirit:")) return {spirit:[req.slice(7)]};
    if(req.startsWith("pantry:")) return {pantry:req.slice(7)};
    return undefined;
  };
  const submit=()=>{ if(!name.trim())return;
    const ingredients=ings.filter(i=>i.item).map(i=>({amt:i.amt,item:i.item,need:buildNeed(i.req)}));
    onAdd({id:Date.now(),name,category,glass,method,notes,ingredients,myRating:0,times:0,rating:null,custom:true}); onClose(); };
  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold,marginBottom:16}}>New Recipe</div>
      <label style={LABEL}>Cocktail Name</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. My Signature Sour" style={{...FIELD,marginBottom:12}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div><label style={LABEL}>Category</label><select value={category} onChange={e=>setCategory(e.target.value)} style={{...FIELD,appearance:"none"}}>{["Stirred","Shaken","Built","Blended"].map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label style={LABEL}>Glass</label><select value={glass} onChange={e=>setGlass(e.target.value)} style={{...FIELD,appearance:"none"}}>{["Rocks","Coupe","Highball","Martini","Nick & Nora","Flute"].map(g=><option key={g}>{g}</option>)}</select></div>
      </div>
      <label style={LABEL}>Ingredients</label>
      <div style={{fontSize:10,color:S.faint,marginBottom:8,lineHeight:1.4}}>Optionally tag what each ingredient needs, so the app can check your bottles & bar.</div>
      {ings.map((ing,i)=>(
        <div key={i} style={{marginBottom:8,padding:"8px",background:"#15110A",borderRadius:10,border:`1px solid ${S.faint}`}}>
          <div style={{display:"flex",gap:6,marginBottom:6}}>
            <input value={ing.amt} onChange={e=>updateIng(i,"amt",e.target.value)} placeholder="Amt" style={{...FIELD,width:70}}/>
            <input value={ing.item} onChange={e=>updateIng(i,"item",e.target.value)} placeholder="Ingredient" style={{...FIELD,flex:1}}/>
          </div>
          <select value={ing.req} onChange={e=>updateIng(i,"req",e.target.value)} style={{...FIELD,appearance:"none",fontSize:11,padding:"7px 10px"}}>
            <option value="">Garnish / no requirement</option>
            <optgroup label="Needs a spirit (from your bottles)">
              {spiritTypes.map(t=><option key={t} value={"spirit:"+t}>Spirit · {t}</option>)}
            </optgroup>
            <optgroup label="Needs a pantry item (from your bar)">
              {pantryNames.map(n=><option key={n} value={"pantry:"+n}>Pantry · {n}</option>)}
            </optgroup>
          </select>
        </div>
      ))}
      <button onClick={addIng} style={{fontSize:11,color:S.gold,background:"none",border:`1px dashed ${S.faint}`,borderRadius:8,padding:"6px 12px",cursor:"pointer",marginBottom:12,width:"100%"}}>+ Add Ingredient</button>
      <label style={LABEL}>Method</label>
      <textarea value={method} onChange={e=>setMethod(e.target.value)} rows={3} placeholder="Describe the technique…" style={{...FIELD,resize:"none",marginBottom:12}}/>
      <label style={LABEL}>My Notes</label>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Tips, variations, preferred spirits…" style={{...FIELD,resize:"none",marginBottom:16}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:12,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:12,color:S.muted,fontSize:13,fontFamily:"'Playfair Display',serif",cursor:"pointer"}}>Cancel</button>
        <button onClick={submit} style={{flex:2,padding:12,background:"linear-gradient(135deg,#4A2A1A,#8A4A1A)",border:"none",borderRadius:12,color:S.cream,fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Save Recipe</button>
      </div>
    </Modal>
  );
}

// ── BAR PANTRY ────────────────────────────────────────────────────────────────
function PantryModal({ pantry, setPantry, onClose }) {
  const [newName,setNewName]=useState("");
  const [newCat,setNewCat]=useState("Syrup");
  const cats=["Bitters","Syrup","Citrus","Liqueur","Juice","Other"];
  const toggle=(id)=>setPantry(p=>p.map(x=>x.id===id?{...x,have:!x.have}:x));
  const add=()=>{ if(!newName.trim())return; setPantry(p=>[...p,{id:Date.now(),name:newName.trim(),cat:newCat,have:true}]); setNewName(""); };
  const remove=(id)=>setPantry(p=>p.filter(x=>x.id!==id));
  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold,marginBottom:4}}>🧺 Bar Pantry</div>
      <div style={{fontSize:11,color:S.muted,marginBottom:16}}>Check off the mixers, bitters, syrups & citrus you keep on hand. This drives cocktail matching.</div>
      {cats.map(cat=>{
        const items=pantry.filter(p=>p.cat===cat);
        if(!items.length) return null;
        return (
          <div key={cat} style={{marginBottom:14}}>
            <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>{cat}</div>
            {items.map(it=>(
              <div key={it.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",marginBottom:6,background:it.have?"#16301F":"#1A1510",border:`1px solid ${it.have?"#3A6A4A":S.faint}`,borderRadius:10}}>
                <button onClick={()=>toggle(it.id)} style={{width:22,height:22,borderRadius:6,border:`1px solid ${it.have?"#6AC08A":S.muted}`,background:it.have?"#6AC08A":"transparent",color:"#0A0806",fontSize:13,fontWeight:900,cursor:"pointer",flexShrink:0,lineHeight:1}}>{it.have?"✓":""}</button>
                <span style={{flex:1,fontSize:13,color:it.have?S.cream:S.muted,fontFamily:"Georgia,serif"}}>{it.name}</span>
                <button onClick={()=>remove(it.id)} style={{background:"none",border:"none",color:S.faint,fontSize:14,cursor:"pointer"}}>✕</button>
              </div>
            ))}
          </div>
        );
      })}
      <div style={{marginTop:8,padding:"12px",background:"#15110A",border:`1px solid ${S.faint}`,borderRadius:12}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Add item</div>
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. Maraschino liqueur" style={{...FIELD,marginBottom:8}}/>
        <div style={{display:"flex",gap:8}}>
          <select value={newCat} onChange={e=>setNewCat(e.target.value)} style={{...FIELD,appearance:"none",flex:1}}>{cats.map(c=><option key={c}>{c}</option>)}</select>
          <button onClick={add} style={{flex:1,background:`linear-gradient(135deg,#4A3A0A,${S.gold})`,border:"none",borderRadius:10,color:"#1A1208",fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Add</button>
        </div>
      </div>
      <button onClick={onClose} style={{marginTop:16,width:"100%",padding:13,background:`linear-gradient(135deg,#4A3A0A,${S.gold})`,border:"none",borderRadius:14,color:"#1A1208",fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Done</button>
    </Modal>
  );
}

// ── WISHLIST ──────────────────────────────────────────────────────────────────
function AddWishlistModal({ onClose, onAdd }) {
  const [name,setName]=useState(""); const [maker,setMaker]=useState("");
  const [collection,setCollection]=useState("barrel"); const [type,setType]=useState("Bourbon");
  const [price,setPrice]=useState(""); const [priority,setPriority]=useState("medium"); const [note,setNote]=useState("");
  const typeOpts = collection==="cellar" ? Object.keys(WINE_TYPE_COLORS) : Object.keys(SPIRIT_TYPE_COLORS);
  const submit=()=>{ if(!name.trim())return; onAdd({id:Date.now(),name,maker,collection,type,price:Number(price)||0,priority,note}); onClose(); };
  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold,marginBottom:16}}>Add to Wishlist</div>
      <label style={LABEL}>Bottle Name</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Pappy 23" style={{...FIELD,marginBottom:12}}/>
      <label style={LABEL}>Producer / Distillery</label>
      <input value={maker} onChange={e=>setMaker(e.target.value)} placeholder="Maker" style={{...FIELD,marginBottom:12}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div><label style={LABEL}>Collection</label><select value={collection} onChange={e=>{setCollection(e.target.value);setType(e.target.value==="cellar"?"Red":"Bourbon");}} style={{...FIELD,appearance:"none"}}><option value="barrel">Barrel Room</option><option value="cellar">Wine Cellar</option></select></div>
        <div><label style={LABEL}>Type</label><select value={type} onChange={e=>setType(e.target.value)} style={{...FIELD,appearance:"none"}}>{typeOpts.map(t=><option key={t}>{t}</option>)}</select></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div><label style={LABEL}>Target Price ($)</label><input value={price} onChange={e=>setPrice(e.target.value)} placeholder="150" style={FIELD}/></div>
        <div><label style={LABEL}>Priority</label><select value={priority} onChange={e=>setPriority(e.target.value)} style={{...FIELD,appearance:"none"}}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
      </div>
      <label style={LABEL}>Note</label>
      <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="Where to find it, why you want it…" style={{...FIELD,resize:"none",marginBottom:16}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:12,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:12,color:S.muted,fontSize:13,fontFamily:"'Playfair Display',serif",cursor:"pointer"}}>Cancel</button>
        <button onClick={submit} style={{flex:2,padding:12,background:`linear-gradient(135deg,#4A3A0A,${S.gold})`,border:"none",borderRadius:12,color:"#1A1208",fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Add to Wishlist</button>
      </div>
    </Modal>
  );
}

// ── INFINITY BOTTLE ───────────────────────────────────────────────────────────
function InfinityDetail({ bottle, onClose, onAddPour }) {
  const [adding,setAdding]=useState(false);
  const [spirit,setSpirit]=useState(""); const [oz,setOz]=useState(""); const [proof,setProof]=useState("");
  const totalOz = bottle.pours.reduce((s,p)=>s+p.oz,0);
  const blendedProof = Math.round(bottle.pours.reduce((s,p)=>s+p.oz*p.proof,0)/totalOz);
  const submit=()=>{ if(!spirit.trim())return; onAddPour(bottle.id,{date:new Date().toISOString().slice(0,10),spirit,oz:Number(oz)||1,proof:Number(proof)||90}); setSpirit("");setOz("");setProof("");setAdding(false); };
  return (
    <Modal onClose={onClose}>
      <Badge label={bottle.baseSpirit+" Infinity"} color="#C8860A"/>
      <div style={{fontSize:22,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.text,marginTop:8}}>{bottle.name}</div>
      <div style={{fontSize:11,color:S.muted,marginTop:2}}>Started {bottle.started} · {bottle.pours.length} pours added</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:16}}>
        {[["Blended Proof",`${blendedProof}°`],["Total Volume",`${totalOz} oz`],["Pours",bottle.pours.length]].map(([l,v])=>(
          <div key={l} style={{background:"#1A1510",borderRadius:10,padding:"8px 10px",textAlign:"center",border:`1px solid ${S.faint}`}}>
            <div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:"#D4900A"}}>{v}</div>
            <div style={{fontSize:9,color:S.muted,marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:16}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>Pour History</div>
        {bottle.pours.slice().reverse().map((p,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${S.faint}`}}>
            <div>
              <div style={{fontSize:13,color:S.cream,fontFamily:"Georgia,serif"}}>{p.spirit}</div>
              <div style={{fontSize:10,color:S.muted}}>{p.date}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,color:"#D4900A",fontFamily:"'Playfair Display',serif",fontWeight:700}}>{p.oz} oz</div>
              <div style={{fontSize:10,color:S.muted}}>{p.proof}°</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:14,background:"#1A1510",borderRadius:12,padding:"12px 14px",border:`1px solid ${S.faint}`}}>
        <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:6}}>Notes</div>
        <div style={{fontSize:12,color:S.cream,fontFamily:"Georgia,serif",lineHeight:1.7,fontStyle:"italic"}}>"{bottle.notes}"</div>
      </div>
      {adding ? (
        <div style={{marginTop:16,background:"#1A1208",borderRadius:12,padding:14,border:"1px solid #5A3A10"}}>
          <label style={LABEL}>Spirit Added</label>
          <input value={spirit} onChange={e=>setSpirit(e.target.value)} placeholder="e.g. Maker's Mark" style={{...FIELD,marginBottom:8}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            <div><label style={LABEL}>Ounces</label><input value={oz} onChange={e=>setOz(e.target.value)} placeholder="2" style={FIELD}/></div>
            <div><label style={LABEL}>Proof</label><input value={proof} onChange={e=>setProof(e.target.value)} placeholder="90" style={FIELD}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setAdding(false)} style={{flex:1,padding:10,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:10,color:S.muted,fontSize:12,cursor:"pointer"}}>Cancel</button>
            <button onClick={submit} style={{flex:2,padding:10,background:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:10,color:S.cream,fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Add Pour</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)} style={{marginTop:16,width:"100%",padding:13,background:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:14,color:S.cream,fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>+ Add a Pour</button>
      )}
      <button onClick={onClose} style={{marginTop:8,width:"100%",padding:11,background:"none",border:`1px solid ${S.faint}`,borderRadius:14,color:S.muted,fontSize:13,fontFamily:"'Playfair Display',serif",cursor:"pointer"}}>Close</button>
    </Modal>
  );
}
function AddInfinityModal({ onClose, onAdd }) {
  const [name,setName]=useState(""); const [baseSpirit,setBaseSpirit]=useState("Bourbon");
  const [spirit,setSpirit]=useState(""); const [oz,setOz]=useState(""); const [proof,setProof]=useState(""); const [notes,setNotes]=useState("");
  const submit=()=>{ if(!name.trim())return; const today=new Date().toISOString().slice(0,10);
    onAdd({id:Date.now(),name,started:today,baseSpirit,currentProof:Number(proof)||90,notes:notes||"Fresh infinity bottle.",pours:spirit.trim()?[{date:today,spirit,oz:Number(oz)||4,proof:Number(proof)||90}]:[]}); onClose(); };
  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#D4900A",marginBottom:4}}>♾️ New Infinity Bottle</div>
      <div style={{fontSize:11,color:S.muted,marginBottom:16}}>An ever-evolving blend you top up over time</div>
      <label style={LABEL}>Bottle Name</label>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. House Bourbon Blend" style={{...FIELD,marginBottom:12}}/>
      <label style={LABEL}>Base Spirit Category</label>
      <select value={baseSpirit} onChange={e=>setBaseSpirit(e.target.value)} style={{...FIELD,appearance:"none",marginBottom:12}}>{["Bourbon","Rye","Scotch","Irish Whiskey","Japanese Whisky","Rum","Tequila","Mixed"].map(t=><option key={t}>{t}</option>)}</select>
      <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:8,marginTop:4}}>First Pour (optional)</div>
      <input value={spirit} onChange={e=>setSpirit(e.target.value)} placeholder="Starter spirit, e.g. Eagle Rare" style={{...FIELD,marginBottom:8}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
        <div><label style={LABEL}>Ounces</label><input value={oz} onChange={e=>setOz(e.target.value)} placeholder="6" style={FIELD}/></div>
        <div><label style={LABEL}>Proof</label><input value={proof} onChange={e=>setProof(e.target.value)} placeholder="90" style={FIELD}/></div>
      </div>
      <label style={LABEL}>Notes</label>
      <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Goal, occasion, rules for topping up…" style={{...FIELD,resize:"none",marginBottom:16}}/>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onClose} style={{flex:1,padding:12,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:12,color:S.muted,fontSize:13,fontFamily:"'Playfair Display',serif",cursor:"pointer"}}>Cancel</button>
        <button onClick={submit} style={{flex:2,padding:12,background:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:12,color:S.cream,fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Start Bottle</button>
      </div>
    </Modal>
  );
}

// ── ACTIVITY MODAL ────────────────────────────────────────────────────────────
function ActivityModal({ activity, wines, spirits, cocktails, onClose }) {
  const [result,setResult]=useState(null);
  const generate=()=>{
    if(activity==="pour"){const w=wines[Math.floor(Math.random()*wines.length)];setResult({icon:"🍷",title:"Tonight's pour",body:w.name,sub:`${w.producer} · ${w.vintage}`,detail:w.notes});}
    else if(activity==="dram"){const s=spirits[Math.floor(Math.random()*spirits.length)];setResult({icon:"🥃",title:"Tonight's dram",body:s.name,sub:`${s.distillery} · ${s.proof}° proof`,detail:s.notes});}
    else if(activity==="blind"){const all=[...wines,...spirits];const i=all[Math.floor(Math.random()*all.length)];setResult({icon:"🫣",title:"Blind tasting",body:"Can you guess?",sub:"Aroma, colour, palate",detail:(i.notes?.split(".")[0]||"")+". What is it?"});}
    else if(activity==="cocktail"){const c=cocktails[Math.floor(Math.random()*cocktails.length)];setResult({icon:"🍸",title:"Shake something up",body:c.name,sub:`${c.category} · ${c.glass} glass`,detail:c.ingredients.map(i=>`${i.amt} ${i.item}`).join(" · ")});}
  };
  useState(()=>{generate();},[]);
  if(!result)return null;
  return (
    <Modal onClose={onClose}>
      <div style={{textAlign:"center",padding:"10px 0"}}>
        <div style={{fontSize:52}}>{result.icon}</div>
        <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:3,marginTop:12}}>{result.title}</div>
        <div style={{fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.text,marginTop:6}}>{result.body}</div>
        <div style={{fontSize:13,color:S.gold,marginTop:4}}>{result.sub}</div>
        <div style={{fontSize:12,color:S.muted,fontFamily:"Georgia,serif",fontStyle:"italic",lineHeight:1.7,marginTop:14,background:"#1A1510",borderRadius:12,padding:"14px"}}>{result.detail}</div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:20}}>
        <button onClick={onClose} style={{flex:1,padding:13,background:"linear-gradient(135deg,#1A1A4A,#2A2A6A)",border:"none",borderRadius:12,color:"#B0B0E0",fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Done</button>
        <button onClick={generate} style={{flex:1,padding:13,background:"linear-gradient(135deg,#3A1A0A,#6A3A0A)",border:"none",borderRadius:12,color:S.cream,fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>Again 🎲</button>
      </div>
    </Modal>
  );
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
function Leaderboard({ wines, spirits, onPickWine, onPickSpirit }) {
  const [view,setView]=useState("barrel"); // barrel | cellar
  const list = view==="barrel" ? spirits : wines;
  // already stored best-first within buckets; sort by score desc to be safe
  const ranked = list.filter(x=>x.myScore!=null).slice().sort((a,b)=>b.myScore-a.myScore);
  const accent = view==="barrel" ? "#D4900A" : S.gold;
  const onPick = view==="barrel" ? onPickSpirit : onPickWine;
  const sub = (it) => view==="barrel" ? `${it.distillery}${it.age?` · ${it.age}yr`:""}` : `${it.producer} · ${it.vintage}`;
  const medal = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":null;

  return (
    <div style={{padding:"52px 16px 16px"}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:S.muted,textTransform:"uppercase",letterSpacing:3}}>My</div>
        <div style={{fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,color:accent}}>Rankings</div>
        <div style={{fontSize:11,color:S.muted,marginTop:2}}>Your bottles, ranked by personal score</div>
      </div>

      {/* toggle */}
      <div style={{display:"flex",gap:8,marginBottom:16,background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:12,padding:4}}>
        {[["barrel","🥃 Barrel Room"],["cellar","🍾 Wine Cellar"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,
            background:view===k?(k==="barrel"?"linear-gradient(135deg,#5A2A0A,#8A4A0A)":`linear-gradient(135deg,#6A1A1A,${S.wine})`):"transparent",
            color:view===k?S.cream:S.muted}}>{l}</button>
        ))}
      </div>

      {ranked.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:S.muted,fontSize:13}}>No ranked bottles yet. Open a bottle and tap "Rank this bottle" to start building your leaderboard.</div>
      ) : ranked.map((it,i)=>(
        <div key={it.id} onClick={()=>onPick(it)} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 14px",marginBottom:8,background:i<3?`linear-gradient(135deg,${accent}14,${S.card})`:S.card,border:`1px solid ${i<3?accent+"44":S.cardBorder}`,borderRadius:14,cursor:"pointer"}}>
          <div style={{width:34,textAlign:"center",flexShrink:0}}>
            {medal(i)
              ? <span style={{fontSize:22}}>{medal(i)}</span>
              : <span style={{fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.muted}}>{i+1}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.name}</div>
            <div style={{fontSize:10,color:S.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub(it)}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:900,color:scoreColor(it.myScore)}}>{it.myScore.toFixed(1)}</div>
            <div style={{fontSize:9,color:S.muted}}>{BUCKETS[it.bucket]?.emoji}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── TASTE PROFILE + MATCH PREDICTOR ───────────────────────────────────────────
function AxisBar({ axis, value, pref }) {
  const pct = (value/5)*100;
  const prefPct = pref!=null ? (pref/5)*100 : null;
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:S.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>
        <span>{axis.left}</span><span>{axis.right}</span>
      </div>
      <div style={{position:"relative",height:8,background:"#1A1510",borderRadius:4}}>
        <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${S.gold}66,${S.gold})`,borderRadius:4,transition:"width .5s"}}/>
        {prefPct!=null&&<div style={{position:"absolute",left:`calc(${prefPct}% - 1px)`,top:-3,width:2,height:14,background:S.cream,borderRadius:1}} title="your preference"/>}
      </div>
    </div>
  );
}

function TasteProfile({ wines, spirits, wishlist }) {
  const [view,setView]=useState("barrel");
  const list = view==="barrel" ? spirits : wines;
  const axes = view==="barrel" ? SPIRIT_AXES : WINE_AXES;
  const accent = view==="barrel" ? "#D4900A" : S.gold;
  const profile = buildProfile(list, axes);

  // predictions for wishlist items in this collection (using avg taste of liked type as proxy)
  const wishItems = wishlist.filter(w=>w.collection===(view==="barrel"?"barrel":"cellar"));
  // estimate candidate taste from existing rated bottles of same type, else profile prefs
  const estimateTaste = (type) => {
    const sameType = list.filter(b=>b.type===type && b.taste);
    if(sameType.length){
      const t={};
      axes.forEach(a=>{ t[a.key]=sameType.reduce((s,b)=>s+(b.taste[a.key]||0),0)/sameType.length; });
      return t;
    }
    return Object.fromEntries(axes.map(a=>[a.key,profile.prefs[a.key]]));
  };

  return (
    <div style={{padding:"52px 16px 16px"}}>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:10,color:S.muted,textTransform:"uppercase",letterSpacing:3}}>My</div>
        <div style={{fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,color:accent}}>Taste Profile</div>
        <div style={{fontSize:11,color:S.muted,marginTop:2}}>Learned from {profile.count} ranked bottles</div>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:18,background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:12,padding:4}}>
        {[["barrel","🥃 Spirits"],["cellar","🍷 Wine"]].map(([k,l])=>(
          <button key={k} onClick={()=>setView(k)} style={{flex:1,padding:"9px 0",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,
            background:view===k?(k==="barrel"?"linear-gradient(135deg,#5A2A0A,#8A4A0A)":`linear-gradient(135deg,#6A1A1A,${S.wine})`):"transparent",
            color:view===k?S.cream:S.muted}}>{l}</button>
        ))}
      </div>

      {profile.count<2 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:S.muted,fontSize:13}}>Rank at least 2 bottles to unlock your taste profile.</div>
      ) : (
        <>
          {/* structural axes */}
          <div style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:16,padding:"18px 16px",marginBottom:16}}>
            <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:14}}>Your Palate · Average vs <span style={{color:S.cream}}>preference ▏</span></div>
            {axes.map(a=>{
              const avg = list.filter(b=>b.taste&&b.taste[a.key]!=null);
              const mean = avg.length? avg.reduce((s,b)=>s+b.taste[a.key],0)/avg.length : 2.5;
              return <AxisBar key={a.key} axis={a} value={mean} pref={profile.prefs[a.key]}/>;
            })}
          </div>

          {/* favorites */}
          <div style={{display:"flex",gap:10,marginBottom:16}}>
            <div style={{flex:1,background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px"}}>
              <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Top Style</div>
              <div style={{fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:700,color:accent,marginTop:4}}>{profile.favType||"—"}</div>
            </div>
            <div style={{flex:1,background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px"}}>
              <div style={{fontSize:9,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Fav Finish</div>
              <div style={{fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:700,color:accent,marginTop:4}}>{profile.favFinish||"Neat oak"}</div>
            </div>
          </div>

          {/* style breakdown */}
          <div style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:16,padding:"16px",marginBottom:16}}>
            <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:12}}>Styles You Love</div>
            {Object.entries(profile.typeAgg).sort((a,b)=>b[1]-a[1]).map(([t,n])=>{
              const max=Math.max(...Object.values(profile.typeAgg));
              const c=ALL_TYPE_COLORS[t]||"#888";
              return (
                <div key={t} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:9,height:9,borderRadius:5,background:c}}/>
                  <div style={{flex:1,fontSize:12,color:S.cream}}>{t}</div>
                  <div style={{width:80,height:5,background:S.faint,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(n/max)*100}%`,background:c,borderRadius:3}}/></div>
                </div>
              );
            })}
          </div>

          {/* will-i-like predictions on wishlist */}
          {wishItems.length>0&&(
            <div style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:16,padding:"16px"}}>
              <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Will I like it?</div>
              <div style={{fontSize:10,color:S.faint,marginBottom:14}}>Predicted match for your wishlist, from your ratings</div>
              {wishItems.map(w=>{
                const est=estimateTaste(w.type);
                const m=predictMatch(est, w.type, profile, axes);
                return (
                  <div key={w.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${S.faint}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{w.name}</div>
                      <div style={{fontSize:10,color:S.muted}}>{w.maker} · {w.type}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:matchColor(m)}}>{m}%</div>
                      <div style={{fontSize:9,color:matchColor(m)}}>{matchLabel(m)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("home");
  const [wines,setWines]=usePersisted("cc_wines",()=>computeScores(attachTaste(INITIAL_WINES,WINE_TASTE)));
  const [spirits,setSpirits]=usePersisted("cc_spirits",()=>computeScores(attachTaste(INITIAL_SPIRITS,SPIRIT_TASTE)));
  const [cocktails,setCocktails]=usePersisted("cc_cocktails",INITIAL_COCKTAILS);
  const [pantry,setPantry]=usePersisted("cc_pantry",INITIAL_PANTRY);
  const [wishlist,setWishlist]=usePersisted("cc_wishlist",INITIAL_WISHLIST);
  const [infinity,setInfinity]=usePersisted("cc_infinity",INITIAL_INFINITY);

  const [selectedWine,setSelectedWine]=useState(null);
  const [selectedSpirit,setSelectedSpirit]=useState(null);
  const [selectedCocktail,setSelectedCocktail]=useState(null);
  const [selectedInfinity,setSelectedInfinity]=useState(null);
  const [showAddCocktail,setShowAddCocktail]=useState(false);
  const [showPantry,setShowPantry]=useState(false);
  const [makeNow,setMakeNow]=useState(false);
  const [showAddBottle,setShowAddBottle]=useState(null); // "cellar" | "barrel"
  const [showAddWishlist,setShowAddWishlist]=useState(false);
  const [showAddInfinity,setShowAddInfinity]=useState(false);
  const [activity,setActivity]=useState(null);
  const [rankSubject,setRankSubject]=useState(null); // item being ranked
  const [rankKind,setRankKind]=useState("spirit"); // "spirit" | "wine"
  const [showBlind,setShowBlind]=useState(false);

  const [wineFilter,setWineFilter]=useState("All");
  const [spiritFilter,setSpiritFilter]=useState("All");
  const [cocktailFilter,setCocktailFilter]=useState("All");
  const [wishFilter,setWishFilter]=useState("All");
  const [wineSearch,setWineSearch]=useState("");
  const [spiritSearch,setSpiritSearch]=useState("");
  const [cocktailSearch,setCocktailSearch]=useState("");

  const totalWineBottles=wines.reduce((s,w)=>s+w.bottles,0);
  const totalSpiritBottles=spirits.length;
  const totalValue=wines.reduce((s,w)=>s+w.price*w.bottles,0)+spirits.reduce((s,b)=>s+b.price,0);
  const avgWineRating=wines.length?Math.round(wines.reduce((s,w)=>s+w.rating,0)/wines.length):0;
  const wishTotal=wishlist.reduce((s,w)=>s+w.price,0);
  const wineProfile=buildProfile(wines,WINE_AXES);
  const spiritProfile=buildProfile(spirits,SPIRIT_AXES);

  const wineTypes=["All",...Array.from(new Set(wines.map(w=>w.type)))];
  const spiritTypes=["All",...Array.from(new Set(spirits.map(s=>s.type)))];
  const cocktailCats=["All",...Array.from(new Set(cocktails.map(c=>c.category)))];
  const wishFilters=["All","Barrel Room","Wine Cellar"];

  const filteredWines=wines.filter(w=>(wineFilter==="All"||w.type===wineFilter)&&(w.name.toLowerCase().includes(wineSearch.toLowerCase())||w.producer.toLowerCase().includes(wineSearch.toLowerCase())));
  const filteredSpirits=spirits.filter(s=>(spiritFilter==="All"||s.type===spiritFilter)&&(s.name.toLowerCase().includes(spiritSearch.toLowerCase())||s.distillery.toLowerCase().includes(spiritSearch.toLowerCase())));
  const filteredCocktails=cocktails.filter(c=>(cocktailFilter==="All"||c.category===cocktailFilter)&&c.name.toLowerCase().includes(cocktailSearch.toLowerCase()));
  const filteredWish=wishlist.filter(w=>wishFilter==="All"||(wishFilter==="Barrel Room"?w.collection==="barrel":w.collection==="cellar"))
    .sort((a,b)=>({high:0,medium:1,low:2})[a.priority]-({high:0,medium:1,low:2})[b.priority]);

  const navItems=[
    {key:"home",icon:"⌂",label:"Home"},
    {key:"cellar",icon:"🍾",label:"Cellar"},
    {key:"barrel",icon:"🥃",label:"Barrel"},
    {key:"rankings",icon:"🏆",label:"Rankings"},
    {key:"cocktails",icon:"🍸",label:"Cocktails"},
  ];

  return (
    <div style={{minHeight:"100vh",background:S.bg,color:S.text,maxWidth:480,margin:"0 auto",paddingBottom:90,fontFamily:"Georgia,serif"}}>

      {/* ── HOME ── */}
      {tab==="home"&&(
        <div>
          <div style={{padding:"52px 20px 16px",background:"linear-gradient(180deg,#130E07,#0A0806)",borderBottom:`1px solid ${S.faint}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:21,background:`linear-gradient(135deg,${S.wine},${S.gold})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900}}>M</div>
                <div><div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text}}>SinnottMichael</div><div style={{fontSize:10,color:S.muted}}>1 Following · 1 Followers</div></div>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button style={{width:36,height:36,borderRadius:18,background:"#1A1510",border:`1px solid ${S.faint}`,color:S.muted,fontSize:15,cursor:"pointer"}}>🔔</button>
                <button style={{width:36,height:36,borderRadius:18,background:"#1A1510",border:`1px solid ${S.faint}`,color:S.muted,fontSize:14,cursor:"pointer"}}>⚙</button>
              </div>
            </div>
            <div style={{marginTop:16,background:S.text,borderRadius:14,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:28}}>🏆</span>
              <div><div style={{fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#1A1208"}}>Top shelf features</div><div style={{fontSize:11,color:"#5A4A30"}}>For those who care about what's in the glass</div></div>
            </div>
          </div>

          <div style={{padding:"16px 16px 0"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              <button onClick={()=>setTab("cellar")} style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px 8px",cursor:"pointer",textAlign:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor=S.wine} onMouseLeave={e=>e.currentTarget.style.borderColor=S.cardBorder}>
                <div style={{fontSize:22}}>🍾</div><div style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold,marginTop:4}}>{totalWineBottles}</div><div style={{fontSize:10,color:S.muted}}>Cellar</div>
              </button>
              <button onClick={()=>setTab("barrel")} style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px 8px",cursor:"pointer",textAlign:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#8A4A0A"} onMouseLeave={e=>e.currentTarget.style.borderColor=S.cardBorder}>
                <div style={{fontSize:22}}>🥃</div><div style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#D4900A",marginTop:4}}>{totalSpiritBottles}</div><div style={{fontSize:10,color:S.muted}}>Barrel Room</div>
              </button>
              <button onClick={()=>setTab("wishlist")} style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px 8px",cursor:"pointer",textAlign:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor=S.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=S.cardBorder}>
                <div style={{fontSize:22}}>📋</div><div style={{fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold,marginTop:4}}>{wishlist.length}</div><div style={{fontSize:10,color:S.muted}}>Wishlist</div>
              </button>
            </div>

            {/* Infinity bottles preview */}
            <button onClick={()=>setTab("barrel")} style={{width:"100%",background:"linear-gradient(135deg,#1E0E04,#2A1508)",border:"1px solid #5A2A08",borderRadius:14,padding:"14px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:24}}>♾️</span>
                <div style={{textAlign:"left"}}><div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:"#D4900A"}}>Infinity Bottles</div><div style={{fontSize:10,color:"#7A4A1A"}}>{infinity.length} active blends</div></div>
              </div>
              <span style={{color:"#C87A20"}}>→</span>
            </button>

            {/* Taste Profile banner */}
            <button onClick={()=>setTab("taste")} style={{width:"100%",background:"linear-gradient(135deg,#1A0810,#2A0816)",border:"1px solid #5A1A2A",borderRadius:14,padding:"14px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <span style={{fontSize:24}}>👅</span>
                <div style={{textAlign:"left"}}><div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.gold}}>Taste Profile</div><div style={{fontSize:10,color:"#8A5A4A"}}>Your palate + "will I like it?" matches</div></div>
              </div>
              <span style={{color:S.gold}}>→</span>
            </button>

            <div style={{fontSize:16,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text,marginBottom:12}}>Activities</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {ACTIVITY_CARDS.map(a=>(
                <button key={a.key} onClick={()=>a.key==="blind"?setShowBlind(true):setActivity(a.key)} style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"16px 12px",cursor:"pointer",textAlign:"center"}} onMouseEnter={e=>e.currentTarget.style.borderColor=S.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=S.cardBorder}>
                  <div style={{fontSize:26,marginBottom:6}}>{a.icon}</div><div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text}}>{a.label}</div><div style={{fontSize:10,color:S.muted,marginTop:2}}>{a.desc}</div>
                </button>
              ))}
            </div>

            <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Collection Breakdown</div>
            <div style={{background:S.card,borderRadius:14,padding:"16px",border:`1px solid ${S.cardBorder}`,marginBottom:16}}>
              <div style={{fontSize:10,color:S.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Wine Cellar</div>
              {Object.entries(WINE_TYPE_COLORS).map(([t,c])=>{const n=wines.filter(w=>w.type===t).length;if(!n)return null;return(
                <div key={t} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}><div style={{width:8,height:8,borderRadius:4,background:c}}/><div style={{flex:1,fontSize:12,color:S.cream}}>{t}</div><div style={{fontSize:11,color:S.muted}}>{n}</div><div style={{width:50,height:3,background:S.faint,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(n/wines.length)*100}%`,background:c}}/></div></div>);})}
              <div style={{borderTop:`1px solid ${S.faint}`,marginTop:10,paddingTop:12,fontSize:10,color:S.muted,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10}}>Barrel Room</div>
              {Object.entries(SPIRIT_TYPE_COLORS).map(([t,c])=>{const n=spirits.filter(s=>s.type===t).length;if(!n)return null;return(
                <div key={t} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}><div style={{width:8,height:8,borderRadius:4,background:c}}/><div style={{flex:1,fontSize:12,color:S.cream}}>{t}</div><div style={{fontSize:11,color:S.muted}}>{n}</div><div style={{width:50,height:3,background:S.faint,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${(n/spirits.length)*100}%`,background:c}}/></div></div>);})}
            </div>

            {/* Total value beneath the breakdown */}
            <div style={{background:`linear-gradient(135deg,${S.gold}1A,${S.card})`,border:`1px solid ${S.gold}44`,borderRadius:14,padding:"16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,color:S.muted,textTransform:"uppercase",letterSpacing:1}}>Total Collection Value</div>
              <div style={{fontSize:26,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold}}>${totalValue.toLocaleString()}</div>
            </div>

            {/* Data + reset */}
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:10,color:S.faint,marginBottom:8}}>✓ Your collection saves automatically on this device</div>
              <button onClick={()=>{
                if(confirm("Reset everything to the starter collection? This erases bottles, ratings, wishlist, cocktails, and infinity bottles you've added on this device.")){
                  try{ ["cc_wines","cc_spirits","cc_cocktails","cc_wishlist","cc_infinity","cc_pantry"].forEach(k=>localStorage.removeItem(k)); }catch{}
                  location.reload();
                }
              }} style={{fontSize:11,background:"none",border:`1px solid ${S.faint}`,borderRadius:8,color:S.muted,padding:"6px 14px",cursor:"pointer",fontFamily:"Georgia,serif"}}>Reset all data</button>
            </div>
          </div>
        </div>
      )}
      {tab==="cellar"&&(
        <div style={{padding:"52px 16px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
            <div><div style={{fontSize:10,color:S.muted,textTransform:"uppercase",letterSpacing:3}}>My</div><div style={{fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold}}>Wine Cellar</div></div>
            <button onClick={()=>setShowAddBottle("cellar")} style={{background:`linear-gradient(135deg,#6A1A1A,${S.wine})`,border:"none",borderRadius:12,color:S.cream,fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,padding:"8px 14px",cursor:"pointer"}}>+ Add</button>
          </div>
          <SearchBar value={wineSearch} onChange={setWineSearch} placeholder="Search wine, producer…"/>
          <FilterPills options={wineTypes} value={wineFilter} onChange={setWineFilter}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{filteredWines.map(w=><WineCard key={w.id} wine={w} onClick={setSelectedWine}/>)}</div>
        </div>
      )}

      {/* ── BARREL ROOM ── */}
      {tab==="barrel"&&(
        <div style={{padding:"52px 16px 16px",position:"relative"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:200,background:"radial-gradient(ellipse at 50% -20%,#8A4A0A22,transparent)",pointerEvents:"none"}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,position:"relative"}}>
            <div><div style={{fontSize:10,color:"#8A5A2A",textTransform:"uppercase",letterSpacing:3}}>My</div><div style={{fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,color:"#D4900A"}}>Barrel Room</div></div>
            <button onClick={()=>setShowAddBottle("barrel")} style={{background:"linear-gradient(135deg,#5A2A0A,#8A4A0A)",border:"none",borderRadius:12,color:S.cream,fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,padding:"8px 14px",cursor:"pointer"}}>+ Add</button>
          </div>

          {/* Infinity bottle section */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:"#C87A20"}}>♾️ Infinity Bottles</div>
            <button onClick={()=>setShowAddInfinity(true)} style={{fontSize:11,background:"#3A1A06",border:"1px solid #6A3A10",borderRadius:8,color:"#C87A20",padding:"4px 10px",cursor:"pointer",fontFamily:"Georgia,serif"}}>+ New blend</button>
          </div>
          <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6,marginBottom:18,scrollbarWidth:"none"}}>
            {infinity.map(b=>{
              const totalOz=b.pours.reduce((s,p)=>s+p.oz,0);
              const bp=totalOz?Math.round(b.pours.reduce((s,p)=>s+p.oz*p.proof,0)/totalOz):b.currentProof;
              return (
                <div key={b.id} onClick={()=>setSelectedInfinity(b)} style={{minWidth:170,background:"linear-gradient(135deg,#1E0E04,#2A1508)",border:"1px solid #5A2A08",borderRadius:14,padding:"14px",cursor:"pointer",flexShrink:0}}>
                  <div style={{fontSize:22}}>♾️</div>
                  <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:"#D4900A",marginTop:6,lineHeight:1.2}}>{b.name}</div>
                  <div style={{fontSize:10,color:"#7A4A1A",marginTop:2}}>{b.baseSpirit}</div>
                  <div style={{display:"flex",gap:12,marginTop:10}}>
                    <div><div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.cream}}>{bp}°</div><div style={{fontSize:8,color:"#7A4A1A",textTransform:"uppercase"}}>Proof</div></div>
                    <div><div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.cream}}>{b.pours.length}</div><div style={{fontSize:8,color:"#7A4A1A",textTransform:"uppercase"}}>Pours</div></div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:700,color:"#C87A20",marginBottom:10}}>🥃 Bottles</div>
          <SearchBar value={spiritSearch} onChange={setSpiritSearch} placeholder="Search spirits, distillery…"/>
          <FilterPills options={spiritTypes} value={spiritFilter} onChange={setSpiritFilter} activeStyle="linear-gradient(135deg,#5A2A0A,#8A4A0A)" activeBorder="#8A4A0A"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{filteredSpirits.map(s=><SpiritCard key={s.id} spirit={s} onClick={setSelectedSpirit}/>)}</div>
        </div>
      )}

      {/* ── WISHLIST ── */}
      {tab==="wishlist"&&(
        <div style={{padding:"52px 16px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
            <div><div style={{fontSize:10,color:S.muted,textTransform:"uppercase",letterSpacing:3}}>My</div><div style={{fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold}}>Wishlist</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:S.muted}}>{wishlist.length} bottles</div><div style={{fontSize:12,color:S.gold,fontFamily:"'Playfair Display',serif",fontWeight:700}}>${wishTotal.toLocaleString()} target</div></div>
          </div>
          <FilterPills options={wishFilters} value={wishFilter} onChange={setWishFilter} activeStyle={`linear-gradient(135deg,#4A3A0A,${S.gold})`} activeBorder={S.gold}/>
          {filteredWish.map(w=>{
            const pc=PRIORITY_COLORS[w.priority]; const tc=ALL_TYPE_COLORS[w.type]||"#888";
            const isBarrel=w.collection==="barrel";
            const axes=isBarrel?SPIRIT_AXES:WINE_AXES;
            const prof=isBarrel?spiritProfile:wineProfile;
            const src=isBarrel?spirits:wines;
            const sameType=src.filter(b=>b.type===w.type&&b.taste);
            const est=sameType.length?Object.fromEntries(axes.map(a=>[a.key,sameType.reduce((s,b)=>s+(b.taste[a.key]||0),0)/sameType.length])):Object.fromEntries(axes.map(a=>[a.key,prof.prefs[a.key]]));
            const match=predictMatch(est,w.type,prof,axes);
            return (
              <div key={w.id} style={{background:S.card,border:`1px solid ${S.cardBorder}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.text}}>{w.name}</div>
                    <div style={{fontSize:11,color:S.muted,marginTop:2}}>{w.maker}</div>
                    <div style={{display:"flex",gap:8,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
                      <Badge label={w.type} color={tc}/>
                      <span style={{fontSize:10,color:S.muted}}>{w.collection==="barrel"?"🥃 Barrel Room":"🍾 Cellar"}</span>
                      <span style={{fontSize:10,color:pc,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>● {w.priority}</span>
                    </div>
                    {w.note&&<div style={{fontSize:11,color:S.muted,fontStyle:"italic",marginTop:8,lineHeight:1.5}}>"{w.note}"</div>}
                  </div>
                  <div style={{textAlign:"right",marginLeft:10}}>
                    <div style={{fontSize:17,fontFamily:"'Playfair Display',serif",fontWeight:700,color:S.gold}}>${w.price}</div>
                    {match!=null&&<div style={{marginTop:4,fontSize:13,fontFamily:"'Playfair Display',serif",fontWeight:900,color:matchColor(match)}}>{match}%<span style={{fontSize:8,color:S.muted,display:"block",fontWeight:400,letterSpacing:.5}}>match</span></div>}
                    <button onClick={()=>setWishlist(wl=>wl.filter(x=>x.id!==w.id))} style={{marginTop:8,fontSize:10,background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:6,color:"#6A8A6A",padding:"4px 8px",cursor:"pointer"}}>✓ Got it</button>
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={()=>setShowAddWishlist(true)} style={{width:"100%",padding:14,marginTop:6,background:`linear-gradient(135deg,#4A3A0A,${S.gold})`,border:"none",borderRadius:14,color:"#1A1208",fontSize:14,fontFamily:"'Playfair Display',serif",fontWeight:700,cursor:"pointer"}}>+ Add to Wishlist</button>
        </div>
      )}

      {/* ── RANKINGS ── */}
      {tab==="rankings"&&(
        <Leaderboard wines={wines} spirits={spirits} onPickWine={setSelectedWine} onPickSpirit={setSelectedSpirit}/>
      )}

      {/* ── TASTE PROFILE ── */}
      {tab==="taste"&&(
        <TasteProfile wines={wines} spirits={spirits} wishlist={wishlist}/>
      )}

      {/* ── COCKTAILS ── */}
      {tab==="cocktails"&&(
        <div style={{padding:"52px 16px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
            <div><div style={{fontSize:10,color:S.muted,textTransform:"uppercase",letterSpacing:3}}>My</div><div style={{fontSize:24,fontFamily:"'Playfair Display',serif",fontWeight:900,color:S.gold}}>Recipe Book</div></div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowPantry(true)} style={{background:"#1A1510",border:`1px solid ${S.faint}`,borderRadius:12,color:S.gold,fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,padding:"8px 12px",cursor:"pointer"}}>🧺 Bar</button>
              <button onClick={()=>setShowAddCocktail(true)} style={{background:"linear-gradient(135deg,#2A1A4A,#4A2A7A)",border:"none",borderRadius:12,color:"#C0B0E0",fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,padding:"8px 14px",cursor:"pointer"}}>+ New</button>
            </div>
          </div>
          <SearchBar value={cocktailSearch} onChange={setCocktailSearch} placeholder="Search recipes…"/>
          {/* Make-now toggle */}
          <button onClick={()=>setMakeNow(m=>!m)} style={{width:"100%",marginBottom:12,padding:"10px",borderRadius:12,cursor:"pointer",fontSize:12,fontFamily:"'Playfair Display',serif",fontWeight:700,
            background:makeNow?"linear-gradient(135deg,#16301F,#1E4029)":"#1A1510",
            border:`1px solid ${makeNow?"#3A6A4A":S.faint}`,color:makeNow?"#6AC08A":S.muted}}>
            {makeNow?"✓ Showing only what you can make":"Show only cocktails I can make"}
          </button>
          <FilterPills options={cocktailCats} value={cocktailFilter} onChange={setCocktailFilter} activeStyle="linear-gradient(135deg,#2A1A4A,#4A2A7A)" activeBorder="#6A4AAA"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {filteredCocktails
              .map(c=>({c,ready:cocktailReadiness(c,spirits,pantry)}))
              .filter(({ready})=>!makeNow||ready.canMake)
              .sort((a,b)=>(b.ready.canMake?1:0)-(a.ready.canMake?1:0))
              .map(({c,ready})=><CocktailCard key={c.id} c={c} ready={ready} onClick={setSelectedCocktail}/>)}
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:`linear-gradient(0deg,${S.bg} 65%,transparent)`,paddingTop:18,paddingBottom:24}}>
        <div style={{display:"flex",justifyContent:"space-around",background:"#1C1710",border:`1px solid #4A3A1E`,borderRadius:22,margin:"0 12px",padding:"7px 4px",boxShadow:"0 6px 24px rgba(0,0,0,.5)"}}>
          {navItems.map(n=>{
            const active = tab===n.key;
            const activeColor = n.key==="barrel" ? "#F0A828" : S.goldLight;
            return (
              <button key={n.key} onClick={()=>setTab(n.key)} style={{flex:1,background:"none",border:"none",cursor:"pointer",padding:"4px 2px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",borderRadius:12,padding:"5px 0",background:active?`${activeColor}22`:"transparent",transition:"background .15s"}}>
                  <span style={{fontSize:19,filter:active?"none":"grayscale(1)",opacity:active?1:.55,transition:"opacity .15s"}}>{n.icon}</span>
                </div>
                <span style={{fontSize:9.5,fontFamily:"Georgia,serif",color:active?activeColor:"#9A8A6A",fontWeight:active?700:500,transition:"color .15s",whiteSpace:"nowrap",letterSpacing:.3}}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MODALS ── */}
      {selectedWine&&<WineDetail wine={wines.find(w=>w.id===selectedWine.id)||selectedWine} onClose={()=>setSelectedWine(null)} onRerank={w=>{setSelectedWine(null);setRankKind("wine");setRankSubject(w);}} onDelete={w=>{setWines(ws=>ws.filter(x=>x.id!==w.id));setSelectedWine(null);}}/>}
      {selectedSpirit&&<SpiritDetail spirit={spirits.find(s=>s.id===selectedSpirit.id)||selectedSpirit} onClose={()=>setSelectedSpirit(null)} onRerank={s=>{setSelectedSpirit(null);setRankKind("spirit");setRankSubject(s);}} onDelete={s=>{setSpirits(sp=>sp.filter(x=>x.id!==s.id));setSelectedSpirit(null);}}/>}
      {selectedCocktail&&<CocktailDetail c={selectedCocktail} spirits={spirits} pantry={pantry} onClose={()=>setSelectedCocktail(null)} onUpdate={u=>{setCocktails(cs=>cs.map(c=>c.id===u.id?u:c));setSelectedCocktail(u);}}/>}
      {selectedInfinity&&<InfinityDetail bottle={infinity.find(b=>b.id===selectedInfinity.id)||selectedInfinity} onClose={()=>setSelectedInfinity(null)} onAddPour={(id,pour)=>{setInfinity(inf=>inf.map(b=>b.id===id?{...b,pours:[...b.pours,pour]}:b));}}/>}
      {showAddCocktail&&<AddCocktailModal pantry={pantry} onClose={()=>setShowAddCocktail(false)} onAdd={c=>setCocktails(cs=>[...cs,c])}/>}
      {showPantry&&<PantryModal pantry={pantry} setPantry={setPantry} onClose={()=>setShowPantry(false)}/>}
      {showAddBottle&&<AddBottleModal collection={showAddBottle} onClose={()=>setShowAddBottle(null)} onAdd={b=>{
        // hold off inserting until the bottle is ranked
        setRankKind(showAddBottle==="cellar"?"wine":"spirit");
        setRankSubject(b);
      }}/>}
      {showAddWishlist&&<AddWishlistModal onClose={()=>setShowAddWishlist(false)} onAdd={w=>setWishlist(wl=>[w,...wl])}/>}
      {showAddInfinity&&<AddInfinityModal onClose={()=>setShowAddInfinity(false)} onAdd={b=>setInfinity(inf=>[b,...inf])}/>}
      {activity&&<ActivityModal activity={activity} wines={wines} spirits={spirits} cocktails={cocktails} onClose={()=>setActivity(null)}/>}
      {rankSubject&&<RankModal subject={rankSubject} kind={rankKind} items={rankKind==="wine"?wines:spirits} onClose={()=>setRankSubject(null)} onCommit={ordered=>{ rankKind==="wine"?setWines(ordered):setSpirits(ordered); setRankSubject(null); }}/>}
      {showBlind&&<BlindFlightModal spirits={spirits} onClose={()=>setShowBlind(false)}/>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
        * { -webkit-font-smoothing:antialiased; box-sizing:border-box; }
        ::-webkit-scrollbar { display:none; }
        input::placeholder, textarea::placeholder { color:#3A2E1E; }
        select option { background:#1A1510; color:#F0E8D8; }
        button { -webkit-tap-highlight-color:transparent; }
      `}</style>
    </div>
  );
}