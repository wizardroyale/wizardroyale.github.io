#!/usr/bin/env python3
# Builds lab.html (the prototype of the new core systems) from index.html + tools/lab.js. Run from anywhere: index.html is not changed.
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
s = (ROOT / 'index.html').read_text(encoding='utf8')

def sub(old, new):
    """Replace one exact piece of the engine; stop the build if index.html moved on."""
    global s
    if s.count(old) != 1:
        raise SystemExit(f'expected exactly one match ({s.count(old)} found): {old[:70]}')
    s = s.replace(old, new)

def sub_line(start, new):
    global s
    hits = [l for l in s.split('\n') if l.startswith(start)]
    if len(hits) != 1:
        raise SystemExit(f'expected exactly one line ({len(hits)} found): {start}')
    s = s.replace(hits[0], new)

# no visitor stats and no online play in the prototype
s = re.sub(r'<!-- visitor stats.*?</script>\n', '', s, count=1, flags=re.S)
sub_line('const statEvent = ', 'const statEvent = () => {};')
sub('<title>Wizard Royale</title>', '<title>Wizard Royale Lab</title>')
sub('<div class="tagline">การแข่งขันหาพ่อมดที่เก่งที่สุดในโลก</div>', '<div class="tagline">โหมดทดลอง · ระบบเกมใหม่</div>')

# setup: Legend row without the official-origin starter Legend; schools can repeat past 4 players
sub("G.legendRow = [make('willy'), G.legends.shift(), G.legends.shift()];", 'G.legendRow = [G.legends.shift(), G.legends.shift(), G.legends.shift()];')
sub('tokens: [], trait: traits[i], famChoices:', 'tokens: [], trait: traits[i % traits.length], famChoices:')
sub('famChoices: [make(fams[i * 2]), make(fams[i * 2 + 1])], familiar: null', 'famChoices: [], familiar: null')

# no champion trophy from kills
sub_line("    if (G.trophy !== killer) { G.trophy = killer;", '')

# cards: fused art, fused tag, Live Event header
sub('<div class="c-art art-${c.id}">', '<div class="c-art art-${c.artId || c.id}">')
sub("""  if (c.activate) tags.push('<span class="tag act">✲</span>');""",
    """  if (c.activate) tags.push('<span class="tag act">✲</span>');
  if (c.parts) tags.push(`<span class="tag fuse">⚗ ${c.parts.length} ส่วน</span>`);""")
sub("""c.type === 'chaos' ? (THNAMES ? 'เคออส' : 'Chaos')""", """c.type === 'chaos' ? 'LIVE'""")

# table: sponsor stack, Hype on seats, school panel, Fusion and clear buttons
sub('const wildC = DEFS.wild;', 'const wildC = labSponsorCard();')
sub("""const wildHTML = G.wild > 0 ? cardHTML(wildC, { cost: costFor(me, wildC), buy: myTurn && costFor(me, wildC) <= pw,""",
    """const wildHTML = G.wild > 0 ? cardHTML(wildC, { cost: costFor(me, wildC), buy: myTurn && !me.contract && costFor(me, wildC) <= pw,""")
sub("""${toks}${p === meP() ? ''""", """<span class="hypemark" title="กระแส ${p.hype || 0} · ${p.trait.name}">🔥 ${p.hype || 0}</span>${toks}${p === meP() ? ''""")
sub_line('  const fam = me.familiar ? cardHTML(me.familiar,',
         """  const fam = `<div class="lab-school"><b>${me.trait.name}</b><p>${me.trait.text}</p><div class="lab-hype">🔥 กระแส <b>${me.hype || 0}</b> / ${HYPE_MAX} · จบเกม +${labHypeVP(me)} VP</div></div>`;""")
sub('<div class="sect-label">สัตว์รับใช้</div>', '<div class="sect-label">โรงเรียนเวท</div>')
sub('มือและสัตว์รับใช้ของคุณ', 'มือของคุณ')
sub("""      <button class="btn end-btn" data-act="end" """,
    """      <button class="btn act-trait" data-act="fuse" ${myTurn && canFuse(me) ? '' : 'disabled'} title="รวมการ์ด 2 ใบที่เล่นในเทิร์นนี้เป็นใบเดียวถาวร">⚗ หลอม (${fuseCost(me)} ทอง)</button>
      <button class="btn act-trait" data-act="clear" ${myTurn && canClear(me) ? '' : 'disabled'} title="จ่าย ${HYPE_CLEAR} กระแสเพื่อลบข่าวฉาว 1 ข่าว">📰 เคลียร์ข่าว (${HYPE_CLEAR} 🔥)</button>
      <button class="btn end-btn" data-act="end" """)

# turn actions and the AI's use of them
sub("""    else if (act === 'buy') { await buy(p, a.src, +a.i); }""",
    """    else if (act === 'buy') { await buy(p, a.src, +a.i); }
    else if (act === 'fuse') { await humanFuse(p); }
    else if (act === 'clear') { await clearScandal(p); }""")
sub("""  while (true) {
    const opts = [];""", """  await labAiBeforeShop(p);
  while (true) {
    const opts = [];""")
sub("if (G.wild > 0 && costFor(p, DEFS.wild) <= G.turn.power) opts.push({ src:'wild', s: 5 });",
    "if (G.wild > 0 && !p.contract && costFor(p, labSponsorCard()) <= G.turn.power) opts.push({ src:'wild', s: 5 });")

# score table
sub('const total = vp - bents + tokensVP(p);', 'const hypeVP = labHypeVP(p); const total = vp - bents + tokensVP(p) + hypeVP;')
sub('return { p, vp, bents, legends, tokens: p.tokens.length, tokenVP: tokensVP(p), total };', 'return { p, vp, bents, legends, tokens: p.tokens.length, tokenVP: tokensVP(p), hypeVP, total };')
sub('<th>Dead Wizard Token</th><th>ตำนาน</th><th>รวม</th>', '<th>Dead Wizard Token</th><th>กระแส</th><th>ตำนาน</th><th>รวม</th>')
sub('<td>${r.tokenVP}</td><td>${r.legends}</td>', '<td>${r.tokenVP}</td><td>+${r.hypeVP}</td><td>${r.legends}</td>')

# words on screen (engine code keeps its own names)
for old, new in [('Dead Wizard Token', 'ข่าวฉาว'), ('Limp Wand', 'Misfire'), ('Wild Surge', 'สปอนเซอร์'), ('โกลาหล', 'เหตุการณ์สด')]:
    s = s.replace(old, new)
s = re.sub(r'(?<![A-Za-z_])Token(?![A-Za-z_])', 'ข่าวฉาว', s)

# styles: hide online and the tutorial, add the new bits
s = s.replace('</style>', """#tut-go,#tut-go1,section:has(#host){display:none!important}
.t-sponsor{--band:#2f9fb0}
.hypemark{font-weight:700;color:#ffb347;margin-left:6px;white-space:nowrap}
.lab-school{max-width:190px;padding:8px 10px;border:1px solid var(--gold);border-radius:10px;font-size:12px;line-height:1.35}
.lab-school p{margin:4px 0}.lab-school b{color:var(--gold)}.lab-hype{font-weight:700;color:#ffb347}
.fuse-hr{border:0;border-top:1px dashed currentColor;opacity:.5;margin:3px 0}
.tag.fuse{background:#7d3cff;color:#fff}
.lab-rules{text-align:left;line-height:1.5;max-width:640px}
</style>""", 1)

# the overlay goes right before the boot line, so it can see every const in the script
BOOT = '// a room link (…#room=K7QXP) opens straight on the join screen'
sub(BOOT, (ROOT / 'tools' / 'lab.js').read_text(encoding='utf8') + '\n' + BOOT)

(ROOT / 'lab.html').write_text(s, encoding='utf8')
print('lab.html', len(s))
