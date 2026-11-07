/* ---------------- Wizard Royale Lab: prototype of the original core systems (built into lab.html by tools/build-lab.py) ----------------
   Hype, Scandals, Schools, Fusion, Misfire, Live Events and Sponsors. index.html stays untouched: this file overrides the
   engine's tables and functions at load. Offline only. */

/* ---- card pool: only cards that never carried an official name, plus the new ones below ---- */
for (const k of Object.keys(MAIN)) delete MAIN[k];
Object.assign(MAIN, { fireball:4, lightning:2, meteor:2, rot:3, leech:2, torrent:5, chain:3, siphon:2, purge:3, scry:3, doom:1, vortex:2, ward:3,
  goblin:4, toad:3, hound:3, troll:2, bat:3, dragon:1, mimic:2, kobang:2, crystal:3, skull:3, mirror:3, flask:3, crown:2, tome:2,
  glom:4, witch:3, battlemage:2, vexx:1, necro:3, altar:2, tower:1, grove:2 });
LEGENDS.length = 0; LEGENDS.push('grimbald', 'ashra', 'morgrath', 'zil', 'oblivia', 'hrothgut', 'vile', 'pudge', 'duke', 'kaz');

Object.assign(TYPE_TH, { sponsor: 'สปอนเซอร์', chaos: 'เหตุการณ์สด' });
const labName = (id, en, th, text) => { DEFS[id].name = en; NAMES_TH[id] = th; if (text) DEFS[id].text = text; };
labName('rune', 'Mana Crumb', 'มานา ครัมบ์');
labName('wand', 'Practice Wand', 'แพรกทิซ วอนด์');
labName('fizzle', 'Blank Scroll', 'แบลงก์ สกรอลล์', 'ว่างเปล่า… ลืมเขียนคาถามาส่ง');

/* ---- Hype ---- */
const HYPE_MAX = 12, HYPE_CLEAR = 6;
function addHype(p, n, why) {
  if (!p || !n) return;
  const b = p.hype || 0; p.hype = Math.max(0, Math.min(HYPE_MAX, b + n));
  if (p.hype === b) return;
  if (n > 0 && G.labStats) G.labStats.hype += p.hype - b;
  log(`${p.name} ${n > 0 ? '+' : ''}${p.hype - b} กระแส (${why}) · รวม ${p.hype}`, n > 0 ? 'good' : 'dmg');
  if (n > 0) AUD.play('power');
}
function labHypeVP(p) {
  const top = Math.max(...G.players.map(x => x.hype || 0));
  const solo = top > 0 && p.hype === top && G.players.filter(x => x.hype === top).length === 1;
  return Math.floor((p.hype || 0) / 3) + (solo ? 2 : 0);
}

const labDamage = damage;
damage = async (t, n, killer, opts) => {
  const hp = t.hp, toks = t.tokens.length, T = G.turn || {};
  const r = await labDamage(t, n, killer, opts);
  if (!G || !(t.hp < hp || t.tokens.length > toks)) return r;
  if (killer && killer !== t && killer === cur()) {
    if (!T.hypeStar && (t.hype || 0) >= (killer.hype || 0)) { T.hypeStar = true; addHype(killer, 1, 'โค่นดาว'); }
    if (hasTrait(killer, 'blaze') && !T.hypeBlaze) { T.hypeBlaze = true; addHype(killer, 1, 'สำนักเพลิง'); }
  }
  if (t.tokens.length === toks && t.hp > 0 && t.hp <= 5 && !(T.clutch ||= {})[t.name]) { T.clutch[t.name] = true; addHype(t, 1, 'รอดหวุดหวิด'); }
  return r;
};
const labHeal = heal;
heal = (p, n) => {
  const b = p.hp; labHeal(p, n);
  if (G.turn && p === cur() && p.hp > b && hasTrait(p, 'brew') && !G.turn.hypeBrew) { G.turn.hypeBrew = true; addHype(p, 1, 'วิทยาลัยปรุงยา'); }
};

/* ---- Scandals (fills the old token plumbing: vp, now, respawn, ongoing, costUp) ---- */
TOKENS.length = 0;
TOKENS.push(
  { id:'s_snack', name:'แอบกินขนมกลางสนาม', vp:-2, text:'ทิ้งการ์ดในมือ 1 ใบ', now: async t => discardFromHand(t, 1) },
  { id:'s_wig', name:'วิกปลิวกลางรายการ', vp:-2, respawn:15, text:'การตายครั้งนี้ เกิดใหม่ด้วย 15 HP' },
  { id:'s_golem', name:'รักสามเส้ากับโกเลม', text:'ได้ Misfire 1 ใบ', now: async t => gainBent(t) },
  { id:'s_tax', name:'ค้างภาษีเวท', ongoing:1, costUp:['treasure', 'wizard'], text:'ต่อเนื่อง: คุณซื้อสมบัติและพ่อมดแพงขึ้น 1' },
  { id:'s_copy', name:'ลอกการบ้านคาถา', ongoing:1, costUp:['spell', 'creature'], text:'ต่อเนื่อง: คุณซื้อคาถาและสัตว์อสูรแพงขึ้น 1' },
  { id:'s_drama', name:'ดราม่าขายดี', vp:-5, text:'+3 กระแส', now: async t => addHype(t, 3, 'ดราม่าขายดี') },
  { id:'s_sorry', name:'คลิปขอโทษ', vp:-1, text:'-2 กระแส', now: async t => addHype(t, -2, 'คลิปขอโทษ') },
  { id:'s_ghost', name:'จ้างผีเขียนคาถา', text:'จั่ว 1 ใบ', now: async t => draw(t, 1) },
  { id:'s_sleep', name:'หลับคาเวที', text:'ครั้งต่อไปคุณจั่วน้อยลง 1 ใบ', now: async t => { t.drawPenalty = (t.drawPenalty || 0) + 1; } },
  { id:'s_leak', name:'ตำราลับรั่ว', vp:-4, text:'จั่ว 2 ใบ · คนที่ฆ่าคุณ +2 กระแส', now: async (t, k) => { await draw(t, 2); if (k) addHype(k, 2, 'ตำราลับรั่ว'); } },
  { id:'s_fans', name:'แฟนคลับบุกบ้าน', vp:-2, respawn:12, text:'เกิดใหม่ด้วย 12 HP · +1 กระแส', now: async t => addHype(t, 1, 'แฟนคลับบุกบ้าน') },
  { id:'s_bribe', name:'ติดสินบนกรรมการ', vp:-4, text:'เทิร์นถัดไปของคุณ +3 ทอง', now: async t => { t.savedPower = (t.savedPower || 0) + 3; } },
);
const labKill = kill;
kill = async (t, killer, o) => {
  // the victim picks which of the top two Scandals hits the news
  if (G.tokens.length > 1) {
    const two = G.tokens.slice(-2), val = k => tokenVP(k) - (k.ongoing ? 2 : 0);
    const pick = t.isAI ? two.slice().sort((a, b) => val(b) - val(a))[0]
      : await humanChoose(t, 'ข่าวฉาวของคุณคือข่าวไหน?', two.map(k => ({ label: `${k.name} (${tokenVP(k)} VP): ${k.text}`, value: k })), 'เลือก 1 จาก 2 ข่าว อีกข่าวกลับเข้ากอง');
    G.tokens.splice(G.tokens.indexOf(pick), 1); G.tokens.push(pick);
  }
  await labKill(t, killer, o);
  if (!G) return;
  if (killer && killer !== t) addHype(killer, 3, 'ฆ่าออกอากาศ');
  // a contract ends with its wizard
  const s = t.discard.findIndex(c => c.type === 'sponsor');
  if (s >= 0) { const c = t.discard.splice(s, 1)[0]; G.sponsors.push(c.id); G.wild++; t.contract = null; log(`สปอนเซอร์ ${cn(c)} ยกเลิกสัญญากับ ${t.name}`, 'dmg'); render(); }
};
function labWorstScandal(p) { return p.tokens.slice().sort((a, b) => (tokenVP(a) - (a.ongoing ? 2 : 0)) - (tokenVP(b) - (b.ongoing ? 2 : 0)))[0]; }
const canClear = p => p === cur() && (p.hype || 0) >= HYPE_CLEAR && p.tokens.length > 0 && !G.turn.cleared;
async function clearScandal(p) {
  if (!canClear(p)) return;
  const k = p.isAI ? labWorstScandal(p) : await humanChoose(p, `จ่าย ${HYPE_CLEAR} กระแสเพื่อเคลียร์ข่าวไหน?`,
    [...p.tokens.map(x => ({ label: `${x.name} (${tokenVP(x)} VP)`, value: x })), { label: 'ยกเลิก', value: null, ghost: true }]);
  if (!k) return;
  G.turn.cleared = true; p.hype -= HYPE_CLEAR; p.tokens.splice(p.tokens.indexOf(k), 1);
  if (G.labStats) G.labStats.clears++;
  log(`${p.name} เคลียร์ข่าว “${k.name}”`, 'good');
}

/* ---- Schools (fills the old wizard-ability slot): each has its own way to earn Hype and a Fusion perk, and 2 starter cards ---- */
TRAITS.length = 0;
TRAITS.push(
  { id:'blaze', name:'สำนักเพลิงไลฟ์สด', card:'sc_blaze', text:'ดาเมจครั้งแรกในเทิร์นคุณ +1 กระแส · การหลอมที่มีการ์ดโจมตีถูกลง 1 ทอง' },
  { id:'brew', name:'วิทยาลัยปรุงยา', card:'sc_brew', text:'ฟื้น HP ครั้งแรกในเทิร์นคุณ +1 กระแส · การ์ดหลอมของคุณไม่ระเบิด' },
  { id:'coin', name:'สถาบันเวทเงินสด', card:'sc_coin', text:'ซื้อการ์ดราคา 6+ ครั้งแรกในเทิร์นคุณ +1 กระแส · การหลอมถูกลง 1 ทอง' },
  { id:'clown', name:'โรงเรียนตัวตลกเวท', card:'sc_clown', text:'เล่น Misfire หรือหลอมการ์ด +1 กระแส · การ์ดหลอมของคุณมีได้ 4 ส่วน' },
);
def('sc_blaze', { name:'Blaze Drill', type:'starter', power:1, atk:1, school:1, text:'+1 ทอง<br><b>โจมตี:</b> คนทางซ้ายรับ 1 ดาเมจ', play: async p => attack(p, { to:'left', dmg:1 }) });
def('sc_brew', { name:'Brew Homework', type:'starter', power:1, school:1, text:'+1 ทอง<br>ฟื้น 1 HP', play: async p => heal(p, 1) });
def('sc_coin', { name:'Tuition Refund', type:'starter', power:1, school:1, text:'+1 ทอง<br>ถ้าเทิร์นนี้คุณมีทองอย่างน้อย 7 +1 ทอง', playLate:1, play: async p => { if (G.turn.power >= 7) P(p, 1); } });
def('sc_clown', { name:'Whoopee Charm', type:'starter', power:1, school:1, text:'+1 ทอง<br>ถ้ามี Misfire ในมือ ทิ้ง 1 ใบ แล้วจั่ว 1',
  play: async p => { const b = p.hand.find(c => c.id === 'bent'); if (b) { p.hand.splice(p.hand.indexOf(b), 1); p.discard.push(b); await draw(p, 1); } } });
Object.assign(NAMES_TH, { sc_blaze:'เบลซ ดริลล์', sc_brew:'บรูว์ โฮมเวิร์ก', sc_coin:'ทูอิชัน รีฟันด์', sc_clown:'วูปปี้ ชาร์ม' });
function labSetSchool(p, sc) {
  p.trait = sc;
  for (const zone of [p.hand, p.deck]) zone.forEach((c, i) => { if (c.school) zone[i] = make(sc.card); });
}

/* ---- Misfire (the junk card, internal id still bent): something odd happens, and Fusion can burn it off ---- */
labName('bent', 'Misfire', 'มิสไฟร์', 'สุ่ม 1 อย่าง: +1 ทอง แต่เสีย 1 HP · ทิ้งการ์ดสุ่มแล้วจั่ว 1 · +1 กระแส · ไม่มีผล<br>-1 VP ตอนจบเกม<br><i>หลอมกับการ์ดอื่นเพื่อทำลายใบนี้ และให้การ์ดนั้น +1 ทอง</i>');
DEFS.bent.play = async p => {
  const r = rnd(4);
  if (r === 0) { P(p, 1); if (p.hp > 1) await loseHP(p, 1); log(`Misfire: ${p.name} +1 ทอง เสีย 1 HP`); }
  else if (r === 1 && p.hand.length) { const c = p.hand.splice(rnd(p.hand.length), 1)[0]; p.discard.push(c); log(`Misfire: ${p.name} ทิ้ง ${cn(c)}`); await draw(p, 1); }
  else if (r === 2) addHype(p, 1, 'Misfire เรียกเสียงฮา');
  else log('Misfire: ฟู่… ไม่มีอะไรเกิดขึ้น');
  if (hasTrait(p, 'clown')) addHype(p, 1, 'โรงเรียนตัวตลกเวท');
};

/* ---- Fusion ---- */
const FUSE_COST = 2, EXPLODE_AT = 3;
const partsOf = c => c.parts || [c];
const maxParts = p => hasTrait(p, 'clown') ? 4 : 3;
const fusable = () => (G.turn.played || []).filter(c => !c.ongoing && !['chaos', 'legend', 'wild', 'sponsor'].includes(c.type));
function fuseCost(p, a, b) {
  let k = FUSE_COST;
  if (hasTrait(p, 'coin')) k--;
  if (hasTrait(p, 'blaze') && (!a || a.atk || b.atk)) k--;
  return Math.max(0, k);
}
const fuseFits = (p, a, b) => a.id === 'bent' || b.id === 'bent' || partsOf(a).length + partsOf(b).length <= maxParts(p);
const canFuse = p => p === cur() && !G.turn.fused && fusable().length >= 2 && G.turn.power >= fuseCost(p);
function fuseName(parts, key) {
  const words = c => key(c).split(' ').filter(w => !/^(the|ดิ|เดอะ)$/i.test(w));
  const name = parts.map((c, i) => { const w = words(c); return i === parts.length - 1 ? w[w.length - 1] : w[0]; }).join(' ');
  return parts.every(c => c.id === parts[0].id) ? `${name} ×${parts.length}` : name;
}
function makeFused(parts, bonus = 0, p) {
  const id = 'fu' + uidc;
  const d = parts.find(c => c.def || c.defInPlay) || {}, other = parts.find(c => c.type !== parts[0].type);
  const unstable = parts.length >= EXPLODE_AT;
  NAMES_TH[id] = fuseName(parts, c => NAMES_TH[c.id] || c.name);
  return { id, artId: parts[0].artId || parts[0].id, uid: uidc++, parts, bonus,
    name: fuseName(parts, c => c.name), type: parts[0].type, alsoType: other ? other.type : undefined,
    cost: parts.reduce((s, c) => s + (c.cost || 0), 0), vp: parts.reduce((s, c) => s + (c.vp || 0), 0),
    vpCalc: parts.some(c => c.vpCalc) ? q => parts.reduce((s, c) => s + vpOf(c, q), 0) : undefined,
    power: parts.reduce((s, c) => s + (c.power || 0), 0) + bonus,
    atk: parts.some(c => c.atk) ? 1 : 0, draws: parts.some(c => c.draws) ? 1 : 0,
    ...(d.def ? { def: 1 } : {}), ...(d.defDiscard ? { defDiscard: 1 } : {}), ...(d.defTopdeck ? { defTopdeck: 1 } : {}), ...(d.defDraw ? { defDraw: 1 } : {}),
    ...(d.onDefend ? { onDefend: d.onDefend } : {}), ...(d.redirect ? { redirect: d.redirect } : {}),
    text: parts.map(c => c.text).join('<hr class="fuse-hr">') + (bonus ? `<br>+${bonus} ทอง (ล้าง Misfire)` : '') + (unstable ? '<br><b>ไม่เสถียร:</b> ทุกครั้งที่เล่น มีโอกาส 1 ใน 6 ที่จะระเบิด' : ''),
    play: async (q, self) => {
      if (self.parts.length >= EXPLODE_AT && !hasTrait(q, 'brew') && Math.random() < 1 / 6) return explode(q, self);
      for (const c of self.parts) if (c.play) await c.play(q, c);
    } };
}
async function explode(p, c) {
  for (const zone of [G.turn.played, G.turn.shown]) { const i = zone.indexOf(c); if (i >= 0) zone.splice(i, 1); }
  p.discard.push(...c.parts);
  if (G.labStats) G.labStats.explosions++;
  log(`💥 ${cn(c)} ระเบิด! แตกกลับเป็นการ์ดเดิมลงกองทิ้ง · ทุกคนรับ 2 ดาเมจ`, 'dmg');
  AUD.play('chaos'); render();
  addHype(p, 2, 'ระเบิดกลางรายการ');
  for (const t of turnOrder()) { await damage(t, 2, p); if (!G || G.instantWinner) return; }
}
function fuseCards(p, a, b) {
  const k = fuseCost(p, a, b);
  if (G.turn.fused || G.turn.power < k || !fuseFits(p, a, b)) return false;
  G.turn.power -= k; G.turn.fused = true;
  const out = z => { const i = z.indexOf(a); if (i >= 0) z.splice(i, 1); const j = z.indexOf(b); if (j >= 0) z.splice(j, 1); };
  out(G.turn.played); out(G.turn.shown);
  let made;
  if (a.id === 'bent' && b.id === 'bent') { G.destroyed.push(a); made = b; log(`${p.name} ทำลาย Misfire 1 ใบด้วยการหลอม`, 'good'); }
  else if (a.id === 'bent' || b.id === 'bent') {
    const x = a.id === 'bent' ? b : a; G.destroyed.push(a.id === 'bent' ? a : b);
    made = makeFused(partsOf(x), (x.bonus || 0) + 1, p);
    log(`${p.name} ล้าง Misfire ออกจาก ${cn(x)}: ได้ +1 ทอง ถาวร`, 'good');
  } else {
    made = makeFused([...partsOf(a), ...partsOf(b)], (a.bonus || 0) + (b.bonus || 0), p);
    log(`⚗ ${p.name} หลอม ${cn(a)} + ${cn(b)} = ${cn(made)}`, 'sys');
    if (G.labStats) { G.labStats.fusions++; G.labStats.names.push(made.name); }
  }
  G.turn.played.push(made); G.turn.shown.push(made);
  if (hasTrait(p, 'clown')) addHype(p, 1, 'โรงเรียนตัวตลกเวท');
  AUD.play('power');
  return true;
}
async function humanFuse(p) {
  if (!canFuse(p)) return;
  const pick = (title, list) => humanChoose(p, title, [...list.map(c => ({ card: c, value: c })), { label: 'ยกเลิก', value: null, ghost: true }], 'การ์ดหลอมจะลงกองทิ้งเป็นใบเดียวตอนจบเทิร์น');
  const a = await pick('⚗ หลอมคาถา: เลือกใบแรก', fusable());
  if (!a) return;
  const b = await pick(`⚗ หลอม ${cn(a)} กับใบไหน?`, fusable().filter(c => c !== a && fuseFits(p, a, c) && fuseCost(p, a, c) <= G.turn.power));
  if (b) fuseCards(p, a, b);
}
async function labAiBeforeShop(p) {
  if (canClear(p) && (tokenVP(labWorstScandal(p)) <= -4 || labWorstScandal(p).ongoing)) await clearScandal(p);
  if (!canFuse(p) || allCards(p).length < 11) return;
  const list = fusable();
  const junk = list.find(c => c.id === 'bent');
  const best = list.filter(c => c !== junk && aiVal(c) > 0).sort((x, y) => aiVal(y) - aiVal(x));
  if (junk && best[0]) { fuseCards(p, junk, best[0]); return; }
  if (best.length < 2 || Math.random() > .6) return;
  for (let i = 0; i < best.length; i++) for (let j = i + 1; j < best.length; j++) {
    const n = partsOf(best[i]).length + partsOf(best[j]).length;
    if (n < EXPLODE_AT || (n <= maxParts(p) && Math.random() < .5)) { if (fuseCards(p, best[i], best[j])) return; }
  }
}

/* ---- Sponsors (in the old Wild Surge slot): an instant perk, then a 3-turn contract with a condition; one contract at a time ---- */
const sponsor = (id, en, th, text, o) => { def(id, { name: en, type:'sponsor', cost:2, ongoing:1, text, ...o }); NAMES_TH[id] = th; };
sponsor('sp_tea', 'Boba Potion Co.', 'โบบา โพชัน', 'ทันที: +3 ทอง<br>สัญญา: จบเทิร์นที่ไม่ได้โจมตี -1 กระแส',
  { now: async p => P(p, 3), onEnd: async p => { if (!G.turn.attacked) addHype(p, -1, 'สปอนเซอร์ไม่ปลื้ม'); } });
sponsor('sp_energy', 'Zapp Energy Elixir', 'แซปป์ เอเนอร์จี', 'ทันที: จั่ว 2 ใบ<br>สัญญา: ต้นเทิร์น เสีย 1 HP',
  { now: async p => draw(p, 2), onStart: async p => { if (p.hp > 1) await loseHP(p, 1); } });
sponsor('sp_stream', 'MageTube Partner', 'เมจทูบ พาร์ตเนอร์', 'ทันที: +2 กระแส<br>สัญญา: จบเทิร์นที่ไม่ได้ซื้อการ์ด ได้ Misfire 1 ใบ',
  { now: async p => addHype(p, 2, 'เมจทูบ'), onEnd: async p => { if (!G.turn.boughtAny) gainBent(p); } });
sponsor('sp_insure', 'Second Life Insurance', 'เซคันด์ ไลฟ์', 'ทันที: ฟื้น 5 HP<br>สัญญา: ต้นเทิร์น -1 ทอง',
  { now: async p => heal(p, 5), onStart: async () => { G.turn.power -= 1; } });
sponsor('sp_broom', 'Used Broom Lot', 'ยูสด์ บรูม ล็อต', 'ทันที: +2 ทอง<br>สัญญา: จบเทิร์นที่เล่นการ์ดไม่ถึง 3 ใบ เสีย 2 HP',
  { now: async p => P(p, 2), onEnd: async p => { if (G.turn.shown.length < 3 && p.hp > 2) await loseHP(p, 2); } });
sponsor('sp_clean', 'Spotless Soap Spells', 'สปอตเลส โซป', 'ทันที: ทำลายการ์ด 1 ใบจากมือหรือกองทิ้งได้<br>สัญญา: จบเทิร์นที่ไม่ได้หลอม -1 กระแส',
  { now: async p => destroyOwn(p), onEnd: async p => { if (!G.turn.fused) addHype(p, -1, 'สปอนเซอร์ไม่ปลื้ม'); } });
const SPONSORS = ['sp_tea', 'sp_energy', 'sp_stream', 'sp_insure', 'sp_broom', 'sp_clean'];
const labSponsorCard = () => (G.sponsors && G.sponsors.length ? DEFS[G.sponsors[0]] : DEFS.sp_tea);

const labBuy = buy;
buy = async (p, src, i) => {
  if (src === 'wild') {
    const c = make(G.sponsors[0] || 'sp_tea');
    if (!G.sponsors.length || p.contract || costFor(p, c) > G.turn.power) return false;
    G.turn.power -= costFor(p, c); G.sponsors.shift(); G.wild--;
    c.turns = 3; p.contract = c; p.ongoing.push(c);
    if (G.labStats) G.labStats.sponsors++;
    log(`${p.name} เซ็นสัญญากับ ${cn(c)}`, 'sys'); AUD.play('buy');
    await c.now(p); G.turn.boughtAny = G.turn.boughtAny || false; render();
    return true;
  }
  const card = src === 'lineup' ? G.lineup[i] : src === 'legend' ? G.legendRow[i] : null;
  const ok = await labBuy(p, src, i);
  if (ok) {
    G.turn.boughtAny = true;
    if (card && card.cost >= 6 && hasTrait(p, 'coin') && !G.turn.hypeCoin) { G.turn.hypeCoin = true; addHype(p, 1, 'สถาบันเวทเงินสด'); }
  }
  return ok;
};
const labEndTurn = endTurn;
endTurn = async p => {
  const c = p.contract;
  if (c && p.ongoing.includes(c)) {
    if (c.onEnd) await c.onEnd(p);
    if (--c.turns <= 0) {
      p.ongoing.splice(p.ongoing.indexOf(c), 1); p.contract = null; G.sponsors.push(c.id); G.wild++;
      log(`${p.name} ทำตามสัญญา ${cn(c)} ครบ`, 'good'); addHype(p, 1, 'จบสัญญาสวย');
    }
  }
  if (G.labStats) G.labStats.turns++;
  await labEndTurn(p);
};

/* ---- Live Events (the viewers vote; high Hype counts for more) ---- */
const voteWeight = p => 1 + Math.floor((p.hype || 0) / 4);
async function liveVote(title, a, b) {
  const score = [0, 0];
  for (const p of turnOrder()) {
    const v = p.isAI ? rnd(2) : await humanChoose(p, `📺 ${title}`, [{ label: a.label, value: 0 }, { label: b.label, value: 1 }], `เสียงโหวตของคุณ: ${voteWeight(p)} (ทุก 4 กระแส +1)`);
    score[v] += voteWeight(p);
  }
  const w = score[0] === score[1] ? rnd(2) : score[0] > score[1] ? 0 : 1, o = w ? b : a;
  if (G.labStats) G.labStats.events++;
  log(`📺 ผลโหวต ${score[0]} : ${score[1]} → ${o.label}`, 'sys');
  await o.run(); render();
}
const hypeTop = () => G.players.slice().sort((x, y) => (y.hype || 0) - (x.hype || 0))[0];
const hypeLow = () => G.players.slice().sort((x, y) => (x.hype || 0) - (y.hype || 0))[0];
const hpTop = () => G.players.slice().sort((x, y) => y.hp - x.hp)[0];
const newsTop = () => G.players.slice().sort((x, y) => y.tokens.length - x.tokens.length)[0];
const newsLow = () => G.players.slice().sort((x, y) => x.tokens.length - y.tokens.length)[0];
const live = (id, n, th, title, a, b) => { def(id, { name:`Live ${n}`, type:'chaos', text:`<b>${th}</b><br>ผู้ชมโหวต: ${a.label} <i>หรือ</i> ${b.label}`, chaos: async () => liveVote(th, a, b) }); NAMES_TH[id] = `ไลฟ์ ${n}`; MAIN[id] = 1; };
live('ev_fans', 1, 'ฝนแฟนเซอร์วิส', 0, { label:'ทุกคน +1 กระแส', run: async () => G.players.forEach(p => addHype(p, 1, 'แฟนเซอร์วิส')) },
  { label:'คนกระแสต่ำสุด +3 กระแส', run: async () => addHype(hypeLow(), 3, 'แฟนเซอร์วิส') });
live('ev_dope', 2, 'ตรวจโด๊ปเวท', 0, { label:'คนกระแสสูงสุดรับ 3 ดาเมจ', run: async () => damage(hypeTop(), 3, null) },
  { label:'ทุกคนรับ 1 ดาเมจ', run: async () => attack(null, { to:'all', dmg:1, chaos:true }) });
live('ev_ads', 3, 'พักโฆษณา', 0, { label:'ทุกคนฟื้น 3 HP', run: async () => G.players.forEach(p => heal(p, 3)) },
  { label:'ทุกคนจั่ว 1 ใบ', run: async () => { for (const p of turnOrder()) await draw(p, 1); } });
live('ev_goat', 4, 'ผู้ชมเลือกแพะ', 0, { label:'คน HP มากสุดได้ Misfire', run: async () => gainBent(hpTop()) },
  { label:'คนข่าวฉาวน้อยสุดได้ Misfire', run: async () => gainBent(newsLow()) });
live('ev_bonus', 5, 'โบนัสสปอนเซอร์', 0, { label:'คนที่ถึงเทิร์น +2 ทอง', run: async () => P(cur(), 2) },
  { label:'คนอื่น +1 กระแส', run: async () => opps(cur()).forEach(p => addHype(p, 1, 'โบนัสสปอนเซอร์')) });
live('ev_stage', 6, 'เวทีถล่ม', 0, { label:'ทุกคนรับ 2 ดาเมจ', run: async () => attack(null, { to:'all', dmg:2, chaos:true }) },
  { label:'ทำลายการ์ดแพงสุดใน Line-Up', run: async () => {
    let b = -1; G.lineup.forEach((c, i) => { if (c && c.type !== 'chaos' && (b < 0 || c.cost > G.lineup[b].cost)) b = i; });
    if (b >= 0) { G.destroyed.push(G.lineup[b]); log(`${cn(G.lineup[b])} ถูกทำลาย`, 'sys'); G.lineup[b] = null; }
  } });
live('ev_news', 7, 'ดราม่าออกอากาศ', 0, { label:'คนข่าวฉาวมากสุด +2 กระแส', run: async () => addHype(newsTop(), 2, 'ดราม่า') },
  { label:'คนข่าวฉาวมากสุดลบข่าว 1 อัน', run: async () => { const p = newsTop(); if (p.tokens.length) { const k = labWorstScandal(p); p.tokens.splice(p.tokens.indexOf(k), 1); log(`${p.name} พ้นข่าว “${k.name}”`, 'good'); } } });
live('ev_sign', 8, 'แจกลายเซ็น', 0, { label:'ทุกคนทิ้งการ์ดสุ่ม 1 จั่ว 1', run: async () => { for (const p of turnOrder()) { if (p.hand.length) { const c = p.hand.splice(rnd(p.hand.length), 1)[0]; p.discard.push(c); log(`${p.name} ทิ้ง ${cn(c)}`); } await draw(p, 1); } } },
  { label:'ทุกคน +1 ทอง', run: async () => G.players.forEach(p => { if (p === cur()) P(p, 1); else p.savedPower = (p.savedPower || 0) + 1; }) });

/* ---- setup ---- */
const labNewGame = newGame;
newGame = (name, nAI, more = []) => {
  labNewGame(name, nAI, more);
  const n = G.players.length;
  const pile = []; while (pile.length < n * 5) pile.push(...shuffle(TOKENS.map(k => ({ ...k }))));
  G.tokens = shuffle(pile.slice(0, n * 5));
  G.sponsors = shuffle(SPONSORS.slice()); G.wild = G.sponsors.length;
  G.labStats = { turns: 0, hype: 0, fusions: 0, explosions: 0, clears: 0, sponsors: 0, events: 0, names: [] };
  const schools = shuffle(TRAITS.slice());
  G.players.forEach((p, i) => {
    p.hype = 0; p.contract = null; p.familiar = null; p.famChoices = [];
    p.deck = [...p.deck, ...p.hand]; p.hand = [];
    const f = p.deck.findIndex(c => c.id === 'fizzle'); p.deck.splice(f, 1);
    const r = p.deck.findIndex(c => c.id === 'rune'); p.deck.splice(r, 1);
    p.deck.push(make('sc_blaze'), make('sc_blaze')); shuffle(p.deck);
    labSetSchool(p, schools[i % schools.length]);
    for (let k = 0; k < 5; k++) p.hand.push(p.deck.pop());
  });
};
startGame = async (name, nAI) => {
  newGame(name, nAI);
  ME = 0;
  render();
  for (const p of G.players.filter(q => !q.isAI)) {
    const sc = await humanChoose(p, 'เลือกโรงเรียนเวทของคุณ', TRAITS.map(s => ({ label: `${s.name}: ${s.text}`, value: s })), 'โรงเรียนกำหนดวิธีหากระแส การ์ดเริ่มต้น 2 ใบ และวิธีหลอมการ์ด');
    labSetSchool(p, sc);
  }
  log(`เริ่มรายการ! ${G.players[G.cur].name} เล่นก่อน`, 'sys');
  runGame();
};

/* ---- rules page ---- */
showRules = backToSetup => {
  const m = $('#modal'); m.hidden = false; titleMode(false);
  $('#m-title').textContent = 'กติกาโหมดทดลอง'; $('#m-sub').textContent = '';
  $('#m-opts').innerHTML = `<div class="lab-rules">
    <p><b>⚗ หลอมคาถา:</b> เทิร์นละครั้ง จ่าย ${FUSE_COST} ทอง รวมการ์ด 2 ใบที่เล่นแล้วในเทิร์นนี้เป็นใบเดียวถาวร การ์ด ${EXPLODE_AT} ส่วนขึ้นไปมีโอกาส 1 ใน 6 ที่จะระเบิดเมื่อเล่น</p>
    <p><b>🔥 กระแส:</b> ฆ่าศัตรู +3 · ทำดาเมจคนที่กระแสไม่น้อยกว่าคุณ +1 (เทิร์นละครั้ง) · รอดด้วย HP ไม่เกิน 5 +1 · ระเบิด +2 จบเกมทุก 3 กระแส = 1 VP และคนกระแสสูงสุดคนเดียว +2 VP</p>
    <p><b>📰 ข่าวฉาว:</b> ตายแล้วเลือก 1 จาก 2 ข่าว จ่าย ${HYPE_CLEAR} กระแสเพื่อเคลียร์ข่าวได้เทิร์นละครั้ง</p>
    <p><b>🏫 โรงเรียนเวท:</b> เลือกตอนเริ่มเกม แต่ละโรงเรียนหากระแสและหลอมการ์ดต่างกัน</p>
    <p><b>📺 เหตุการณ์สด:</b> โผล่ตอนเติม Line-Up ทุกคนโหวต ทุก 4 กระแสเพิ่ม 1 เสียง</p>
    <p><b>🤝 สปอนเซอร์:</b> จ่าย 2 ทอง ได้ผลทันที แล้วถือสัญญา 3 เทิร์น มีได้ทีละใบ ตายแล้วสัญญาจบ</p>
    <p><b>Misfire:</b> การ์ดขยะที่เล่นแล้วเกิดผลสุ่ม หลอมกับการ์ดอื่นเพื่อทำลายและให้การ์ดนั้น +1 ทองถาวร</p></div>
    <button class="btn" id="close-rules">${backToSetup ? 'กลับ' : 'ปิด'}</button>`;
  $('#m-opts').onclick = e => { if (e.target.id === 'close-rules') { if (backToSetup) showSetup(); else m.hidden = true; } };
};

/* ---- all-AI test with numbers for the balance read: await labSim(4) (one call per ~40 s, see CLAUDE.md) ---- */
async function labSim(games = 3, players = 4, timeoutMs = 30000) {
  const out = [], errors = [], onRej = e => errors.push(String(e.reason && e.reason.stack || e.reason));
  addEventListener('unhandledrejection', onRej);
  const drawBoard = render; render = () => {}; // numbers only: no need to draw every step
  await withoutFX(async () => {
    for (let g = 0; g < games; g++) {
      $('#modal').hidden = true;
      newGame('Test', players - 1); G.players[0].isAI = true;
      const my = G, t0 = performance.now(); let to = false, timer;
      await Promise.race([runGame().catch(e => errors.push(e.stack)), new Promise(r => { timer = setTimeout(() => { to = true; G = null; r(); }, timeoutMs); })]);
      clearTimeout(timer);
      G = my;
      const rows = to ? [] : finalRows();
      out.push({ ended: to ? 'TIMEOUT' : my.ending, ms: Math.round(performance.now() - t0), ...my.labStats, names: my.labStats.names.slice(0, 4),
        rows: rows.map(r => ({ school: r.p.trait.id, total: r.total, vp: r.vp, hype: r.p.hype, hypeVP: labHypeVP(r.p), news: r.tokens, newsVP: r.tokenVP, misfire: r.bents })) });
    }
  });
  render = drawBoard; removeEventListener('unhandledrejection', onRej); $('#modal').hidden = true;
  return { errors: errors.slice(0, 5), out };
}
