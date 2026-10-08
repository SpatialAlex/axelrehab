/* Övningsbibliotek + illustrationer.
   Alla illustrationer ritas i viewBox 0 0 200 160. Element med klassen "mv"
   rör sig till sin --a-transform när övningen är i "pose a" (arbetsfas). */

const SVG_DEFS = `
  <defs>
    <radialGradient id="orbg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#5eead4" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.75"/>
    </radialGradient>
  </defs>`;

const P = {
  frontTorso: `<path class="fig" d="M48 162 C48 120 62 102 100 100 C138 102 152 120 152 162 Z"/>`,
  frontNeck: `<rect class="fig" x="91" y="72" width="18" height="34" rx="8"/>`,
  frontHead: `<circle class="fig" cx="100" cy="56" r="22"/>
    <circle cx="92" cy="54" r="2.2" fill="var(--fig)"/><circle cx="108" cy="54" r="2.2" fill="var(--fig)"/>
    <path class="fig-line" d="M94 66 Q100 69 106 66" stroke-width="2.4"/>`,
  backHead: `<circle class="fig" cx="100" cy="56" r="22"/>`,
  sideTorso: `<path class="fig" d="M72 162 C70 122 78 104 96 100 L114 100 C126 106 130 126 128 162 Z"/>`,
  sideNeck: `<rect class="fig" x="96" y="72" width="18" height="34" rx="8"/>`,
  sideHead: `<circle class="fig" cx="106" cy="54" r="22"/>
    <circle cx="118" cy="50" r="2.2" fill="var(--fig)"/>
    <path class="fig-line" d="M127 52 l6 6 l-6 2" stroke-width="2.6"/>`,
};

// Unikt gradient-id per illustration: en gradient i en dold vy ritas inte, så delade id:n kan ge tom fyllning.
let artSeq = 0;
function svgWrap(inner, extraClass = "") {
  const id = `orbg${++artSeq}`;
  return `<svg class="art ${extraClass}" viewBox="0 0 200 160" aria-hidden="true">${SVG_DEFS.replace('id="orbg"', `id="${id}"`)}${inner.replace("url(#orbg)", `url(#${id})`)}</svg>`;
}

const ART = {
  chin: () => svgWrap(`
    ${P.sideNeck}${P.sideTorso}
    <g class="mv" style="--a: translateX(-10px)">${P.sideHead}</g>
    <path class="arrow" d="M150 24 H122"/><path class="arrow-h" d="M112 24 l12 -7 v14z"/>
    <ellipse class="glow" cx="114" cy="86" rx="10" ry="16"/>`),

  roll: () => svgWrap(`
    ${P.frontNeck}
    <g class="mv" style="--a: translateY(-8px)">${P.frontTorso}</g>
    ${P.frontHead}
    <path class="arrow" d="M30 112 a18 18 0 1 1 22 18"/><path class="arrow-h" d="M60 132 l-12 4 l4 -12z"/>
    <path class="arrow" d="M170 112 a18 18 0 1 0 -22 18"/><path class="arrow-h" d="M140 132 l12 4 l-4 -12z"/>`),

  scap: () => svgWrap(`
    ${P.frontNeck}${P.frontTorso}${P.backHead}
    <path class="fig-line" d="M100 106 V160" stroke-dasharray="3 5" opacity="0.6"/>
    <ellipse class="glow" cx="100" cy="128" rx="16" ry="20"/>
    <g class="mv" style="--a: translateX(8px)"><path class="fig" d="M64 114 L88 112 L84 144 Z"/></g>
    <g class="mv" style="--a: translateX(-8px)"><path class="fig" d="M136 114 L112 112 L116 144 Z"/></g>
    <path class="arrow" d="M36 150 H54"/><path class="arrow-h" d="M62 150 l-10 -6 v12z"/>
    <path class="arrow" d="M164 150 H146"/><path class="arrow-h" d="M138 150 l10 -6 v12z"/>`),

  thoracic: () => svgWrap(`
    <path class="prop" d="M58 162 V122"/>
    <g class="mv" style="--a: rotate(-12deg); transform-origin: 100px 162px">
      ${P.sideNeck}${P.sideTorso}
      <path class="limb" d="M108 112 L138 62 L96 46"/><path class="limb-in" d="M108 112 L138 62 L96 46"/>
      ${P.sideHead}
    </g>
    <path class="arrow" d="M150 40 a50 50 0 0 0 -40 -22"/><path class="arrow-h" d="M102 16 l12 -4 l-2 12z"/>`),

  wall: () => svgWrap(`
    <g class="mv" style="--a: rotate(28deg); transform-origin: 62px 110px">
      <path class="limb" d="M62 110 L32 110 L32 74"/><path class="limb-in" d="M62 110 L32 110 L32 74"/>
    </g>
    <g class="mv" style="--a: rotate(-28deg); transform-origin: 138px 110px">
      <path class="limb" d="M138 110 L168 110 L168 74"/><path class="limb-in" d="M138 110 L168 110 L168 74"/>
    </g>
    ${P.frontNeck}${P.frontTorso}${P.backHead}
    <path class="arrow" d="M100 40 V22"/><path class="arrow-h" d="M100 12 l-7 12 h14z"/>`),

  pec: () => svgWrap(`
    <path class="prop" d="M18 16 V162"/><path class="prop" d="M182 16 V162"/>
    <path class="limb" d="M62 112 L26 112 L26 72"/><path class="limb-in" d="M62 112 L26 112 L26 72"/>
    <path class="limb" d="M138 112 L174 112 L174 72"/><path class="limb-in" d="M138 112 L174 112 L174 72"/>
    <g class="mv" style="--a: scale(1.08); transform-origin: 100px 160px">
      ${P.frontNeck}${P.frontTorso}${P.frontHead}
      <ellipse class="glow" cx="78" cy="124" rx="16" ry="10"/>
      <ellipse class="glow" cx="122" cy="124" rx="16" ry="10"/>
    </g>`),

  trap: () => svgWrap(`
    <g class="mv" style="--a: rotate(20deg); transform-origin: 100px 104px">${P.frontNeck}${P.frontHead}</g>
    ${P.frontTorso}
    <ellipse class="glow" cx="76" cy="104" rx="20" ry="8" transform="rotate(-18 76 104)"/>
    <path class="arrow" d="M132 26 a40 40 0 0 1 22 30"/><path class="arrow-h" d="M156 66 l-9 -8 l12 -4z"/>`),

  levator: () => svgWrap(`
    <g class="mv" style="--a: rotate(24deg) translate(4px, 7px); transform-origin: 100px 104px">${P.frontNeck}${P.frontHead}</g>
    ${P.frontTorso}
    <ellipse class="glow" cx="84" cy="104" rx="9" ry="14" transform="rotate(-20 84 104)"/>
    <path class="arrow" d="M136 40 L150 60"/><path class="arrow-h" d="M156 70 l-12 -3 l9 -8z"/>`),

  scalene: () => svgWrap(`
    <ellipse class="glow" cx="90" cy="90" rx="7" ry="16" transform="rotate(14 90 90)"/>
    <g class="mv" style="--a: rotate(18deg) translateY(-3px); transform-origin: 100px 104px">${P.frontNeck}${P.frontHead}</g>
    ${P.frontTorso}
    <ellipse class="fig" cx="80" cy="110" rx="11" ry="7"/>
    <path class="arrow" d="M130 22 a40 40 0 0 1 22 26"/><path class="arrow-h" d="M156 58 l-10 -7 l12 -5z"/>`),

  nerve: () => svgWrap(`
    <path class="limb" d="M62 108 L38 108"/><path class="limb-in" d="M62 108 L38 108"/>
    <g class="mv" style="--a: rotate(-90deg); transform-origin: 38px 108px">
      <path class="limb" d="M38 108 L38 80"/><path class="limb-in" d="M38 108 L38 80"/>
      <path class="limb" d="M38 80 L30 72" stroke-width="7"/>
      <path class="nerve" d="M38 104 L38 78"/>
    </g>
    <g class="mv" style="--a: rotate(-14deg); transform-origin: 100px 104px">${P.frontNeck}${P.frontHead}</g>
    ${P.frontTorso}
    <path class="nerve" d="M92 100 L64 107 L40 108"/>`),

  breath: () => svgWrap(`
    <circle class="orb-ring" cx="100" cy="80" r="70"/>
    <circle class="orb-ring" cx="100" cy="80" r="56"/>
    <circle class="orb" cx="100" cy="80" r="54" fill="url(#orbg)"/>`),
};

/* ---------- Fasbyggare ---------- */
const SIDES = ["höger", "vänster"];

function repsPlan(n, phases) {
  const out = [];
  for (let r = 1; r <= n; r++) {
    phases.forEach((p) => out.push({ ...p, rep: r, reps: n, kind: p.kind || "work" }));
  }
  return out;
}

function holdPlan({ secs, sets = 1, sides = null, rest = 8, label = "Håll stretchen", relax = "Släpp och vila" }) {
  const out = [];
  const sideList = sides || [null];
  for (let s = 1; s <= sets; s++) {
    sideList.forEach((side, i) => {
      out.push({ label, secs, pose: "a", kind: "work", rep: s, reps: sets, side, cue: side ? `${cap(side)} sida. ${label}` : label });
      const last = s === sets && i === sideList.length - 1;
      if (!last) out.push({ label: relax, secs: rest, pose: "b", kind: "rest", rep: s, reps: sets, side, cue: relax });
    });
  }
  return out;
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function scaleReps(n, level) { return level === "skonsam" ? Math.max(4, Math.round(n * 0.6)) : n; }
function scaleHold(s, level) { return level === "skonsam" ? Math.max(15, Math.round(s * 0.67)) : s; }

/* ---------- Övningar ---------- */
const EXERCISES = [
  {
    id: "roll",
    name: "Axelrullningar",
    area: "Uppvärmning",
    short: "Rulla axlarna mjukt upp, bakåt och ner.",
    steps: [
      "Sitt eller stå med armarna avslappnade längs sidorna.",
      "Dra axlarna upp mot öronen, rulla dem bakåt och sänk dem ner.",
      "Gör stora, lugna cirklar. Andas lugnt hela tiden.",
    ],
    why: "Ökar blodflödet och mjukar upp muskulaturen runt skuldra och nacke inför resten av passet.",
    art: "roll",
    plan: (lvl) => repsPlan(scaleReps(10, lvl), [
      { label: "Upp och bakåt", secs: 2, pose: "a", cue: "Upp och bak" },
      { label: "Ner", secs: 2, pose: "b", cue: "" },
    ]),
  },
  {
    id: "chin",
    name: "Hakindragning",
    area: "Nacke",
    short: "Dra in hakan rakt bakåt, som att göra dubbelhaka.",
    steps: [
      "Sitt rakt med blicken framåt, axlarna avslappnade.",
      "Glid huvudet rakt bakåt – som att göra en dubbelhaka. Nicka inte ner.",
      "Håll några sekunder, känn ett lätt drag i nackens överdel.",
      "Släpp långsamt tillbaka.",
    ],
    why: "Aktiverar de djupa nackböjarna och avlastar nervrötterna i nacken. En av de mest använda övningarna vid nervpåverkan från nacken.",
    caution: "Ska inte göra ont. Om pirret ut i fingret ökar – gör en mindre rörelse.",
    art: "chin",
    plan: (lvl) => repsPlan(scaleReps(10, lvl), [
      { label: "Dra in hakan", secs: 5, pose: "a", cue: "Dra in" },
      { label: "Släpp", secs: 3, pose: "b", cue: "Släpp", kind: "rest" },
    ]),
  },
  {
    id: "scap",
    name: "Skulderbladskläm",
    area: "Hållning",
    short: "Dra skulderbladen bakåt och nedåt, mot bakfickorna.",
    steps: [
      "Sitt eller stå rakt med armarna längs sidan.",
      "Dra skulderbladen bakåt och lite nedåt – tänk ”mot bakfickorna”.",
      "Håll utan att lyfta axlarna mot öronen.",
      "Släpp mjukt.",
    ],
    why: "Stärker musklerna mellan skulderbladen och öppnar utrymmet där nerverna passerar från nacken ut i armen.",
    art: "scap",
    plan: (lvl) => repsPlan(scaleReps(10, lvl), [
      { label: "Kläm ihop", secs: 5, pose: "a", cue: "Kläm" },
      { label: "Släpp", secs: 3, pose: "b", cue: "Släpp", kind: "rest" },
    ]),
  },
  {
    id: "thoracic",
    name: "Bröstryggsextension",
    area: "Bröstrygg",
    short: "Händerna bakom huvudet, böj dig bakåt över stolsryggen.",
    steps: [
      "Sitt på en stol med stadig rygg som når upp mot skulderbladen.",
      "Knäpp händerna bakom huvudet och peka armbågarna framåt.",
      "Andas in och böj bröstryggen bakåt över stolsryggen. Titta snett uppåt.",
      "Andas ut och kom tillbaka.",
    ],
    why: "En stel bröstrygg gör att nacken får jobba mer. Rörlighet här avlastar nacke och axlar.",
    art: "thoracic",
    plan: (lvl) => repsPlan(scaleReps(8, lvl), [
      { label: "Andas in, böj bakåt", secs: 4, pose: "a", cue: "Bakåt" },
      { label: "Andas ut, tillbaka", secs: 4, pose: "b", cue: "Tillbaka", kind: "rest" },
    ]),
  },
  {
    id: "wall",
    name: "Väggänglar",
    area: "Skuldra",
    short: "Rygg och armar mot väggen, glid armarna uppåt.",
    steps: [
      "Stå med ryggen mot en vägg, fötterna en liten bit ut. Bakhuvud, skulderblad och bäcken mot väggen.",
      "Lägg armarna i ”målstolpe”: armbågar i axelhöjd, underarmar uppåt mot väggen.",
      "Glid långsamt armarna uppåt utan att tappa kontakten med väggen.",
      "Glid tillbaka ner och dra skulderbladen nedåt.",
    ],
    why: "Tränar kontroll av skulderbladen och öppnar bröstet – bra för hållningen och utrymmet för nerverna.",
    caution: "Gå bara så högt du kan utan smärta eller ökat pirr. Det är okej om armarna inte når väggen.",
    art: "wall",
    plan: (lvl) => repsPlan(scaleReps(8, lvl), [
      { label: "Glid upp", secs: 4, pose: "a", cue: "Upp" },
      { label: "Glid ner", secs: 4, pose: "b", cue: "Ner", kind: "rest" },
    ]),
  },
  {
    id: "pec",
    name: "Bröststretch i dörrkarm",
    area: "Bröst",
    short: "Underarmarna mot dörrkarmen, luta dig sakta framåt.",
    steps: [
      "Ställ dig i en dörröppning och lägg underarmarna mot karmen, armbågarna strax under axelhöjd.",
      "Ta ett litet steg framåt tills du känner en behaglig stretch över bröstet.",
      "Håll ryggen rak och andas lugnt.",
    ],
    why: "Korta bröstmuskler drar axlarna framåt och kan trycka på nervbanorna under nyckelbenet och bröstmuskeln.",
    caution: "Om det domnar i handen under stretchen – sänk armbågarna lite eller ta ett kortare steg.",
    art: "pec",
    plan: (lvl) => holdPlan({ secs: scaleHold(30, lvl), sets: 2, rest: 10, label: "Luta framåt och håll" }),
  },
  {
    id: "trap",
    name: "Övre trapezius-stretch",
    area: "Nacke & skuldra",
    short: "Luta örat mot motsatt axel, låt axeln sjunka.",
    steps: [
      "Sitt rakt och håll i stolsitsen med handen på den sida du stretchar – det håller axeln nere.",
      "Luta örat mot motsatt axel tills du känner ett drag på sidan av nacken.",
      "Lägg gärna andra handen lätt på huvudet – utan att dra.",
      "Andas och låt axeln sjunka för varje utandning.",
    ],
    why: "Släpper spänningen i den övre kappmuskeln, som ofta blir överaktiv vid nack- och axelbesvär.",
    art: "trap",
    sided: true,
    plan: (lvl) => holdPlan({ secs: scaleHold(30, lvl), sets: 1, sides: SIDES, rest: 6 }),
  },
  {
    id: "levator",
    name: "Levator scapulae-stretch",
    area: "Nacke",
    short: "Vrid huvudet snett och titta ner mot motsatt armhåla.",
    steps: [
      "Sitt rakt och håll i stolsitsen med handen på den sida du stretchar.",
      "Vrid huvudet ca 45° åt motsatt håll och titta ner mot armhålan.",
      "Lägg andra handen lätt på bakhuvudet för en mjuk förstärkning.",
      "Känn draget snett bak i nacken mot skulderbladet.",
    ],
    why: "Skulderbladslyftaren går från nacken till skulderbladet och är ofta spänd vid nackbesvär.",
    art: "levator",
    sided: true,
    plan: (lvl) => holdPlan({ secs: scaleHold(30, lvl), sets: 1, sides: SIDES, rest: 6 }),
  },
  {
    id: "scalene",
    name: "Scalenus-stretch",
    area: "Främre nacke",
    short: "Håll nyckelbenet nere, luta huvudet bort och lätt bakåt.",
    steps: [
      "Lägg handen platt på nyckelbenet på den sida du stretchar och håll det nere.",
      "Luta huvudet åt motsatt håll och vinkla hakan lätt uppåt.",
      "Känn ett försiktigt drag på framsidan/sidan av halsen.",
      "Andas lugnt – det här är en mild stretch.",
    ],
    why: "Scalenusmusklerna sitter där nervflätan passerar till armen. Spänning här kan ge pirr och domningar i handen.",
    caution: "Mild stretch! Om det pirrar mer i fingrarna – minska vinkeln direkt.",
    art: "scalene",
    sided: true,
    plan: (lvl) => holdPlan({ secs: scaleHold(20, lvl), sets: 2, sides: SIDES, rest: 6 }),
  },
  {
    id: "nerve",
    name: "Nervglidning (höger arm)",
    area: "Nerv",
    short: "Sträck armen och luta huvudet mot armen. Böj tillbaka och luta bort.",
    steps: [
      "Sitt rakt. Lyft höger arm ut åt sidan i axelhöjd, armbågen böjd, handflatan uppåt.",
      "Sträck ut armbågen och böj handleden bakåt (fingrarna pekar ner/bak) – samtidigt lutar du huvudet MOT höger axel.",
      "Böj armbågen tillbaka och luta huvudet BORT från armen.",
      "Rörelsen ska vara mjuk och rytmisk – nerven ska glida, inte sträckas.",
    ],
    why: "En så kallad ”slider”: nerven glider fram och tillbaka utan att dras ut. Det minskar irritation och förbättrar nervens rörlighet – ofta effektivt vid domning i pekfingret.",
    caution: "Ett lätt pirr som släpper direkt är okej. Om domningen ökar eller sitter kvar efteråt – gör mindre rörelser eller hoppa över övningen tills vidare.",
    art: "nerve",
    plan: (lvl) => repsPlan(scaleReps(10, lvl), [
      { label: "Sträck armen, luta mot", secs: 3, pose: "a", cue: "Sträck" },
      { label: "Böj armen, luta bort", secs: 3, pose: "b", cue: "Böj" },
    ]),
  },
  {
    id: "breath",
    name: "Lugn andning",
    area: "Avslappning",
    short: "Andas in genom näsan ner i magen, ut långsamt.",
    steps: [
      "Sitt bekvämt, en hand på magen och en på bröstet.",
      "Andas in genom näsan så att magen – inte bröstet – höjs.",
      "Andas ut långsamt genom munnen och låt axlarna sjunka.",
    ],
    why: "Bröstandning överbelastar halsmusklerna (scalenus) där nerverna passerar. Magandning slappnar av och lugnar nervsystemet.",
    art: "breath",
    plan: (lvl) => repsPlan(lvl === "skonsam" ? 5 : 6, [
      { label: "Andas in", secs: 4, pose: "a", cue: "Andas in" },
      { label: "Andas ut", secs: 6, pose: "b", cue: "Andas ut", kind: "rest" },
    ]),
  },
];

const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

/* Mikropaus: kort variant för skrivbordet */
const MICRO = [
  { id: "roll", plan: () => repsPlan(6, EX_BY_ID.roll.plan("normal").slice(0, 2)) },
  { id: "chin", plan: () => repsPlan(5, EX_BY_ID.chin.plan("normal").slice(0, 2)) },
  { id: "scap", plan: () => repsPlan(5, EX_BY_ID.scap.plan("normal").slice(0, 2)) },
  { id: "breath", plan: () => repsPlan(3, EX_BY_ID.breath.plan("normal").slice(0, 2)) },
];

const PREP_SECS = 7;

function planSeconds(phases) { return phases.reduce((a, p) => a + p.secs, 0); }

const TIPS = [
  "Nervirritation läker långsamt – ofta veckor till månader. Det som gör skillnad är att du är snäll och konsekvent varje dag.",
  "Byt ställning var 30–45:e minut vid datorn. En mikropaus på två minuter räcker långt.",
  "Ställ skärmens överkant i ögonhöjd så att huvudet inte glider framåt.",
  "Sov gärna på rygg eller på vänster sida med en kudde som fyller ut nacken. Undvik att sova med höger arm över huvudet.",
  "Lätt pirr under en övning som släpper direkt är okej. Domning som ökar eller sitter kvar är en signal att backa.",
  "Värme över nacke och skuldra i 10–15 minuter kan göra stretcharna behagligare.",
  "Bär tunga kassar jämnt fördelat – eller i ryggsäck – istället för i höger hand.",
  "Undvik att ha telefonen klämd mellan örat och axeln. Använd hörlurar.",
  "Promenader ökar blodflödet till nerver och muskler. Låt armarna pendla fritt.",
  "Hellre 10 minuter varje dag än en timme en gång i veckan.",
  "Lägg märke till om du spänner axlarna mot öronen när du är stressad – och släpp.",
  "Musen nära kroppen och armbågen stödd minskar belastningen på höger skuldra.",
  "Trenden är viktigare än enskilda dagar. Bra och dåliga dagar är helt normalt.",
  "Drick vatten och rör på dig – nerver mår bra av cirkulation.",
];

const QUOTES = [
  "Små steg varje dag blir stora förändringar.",
  "Din nerv tackar dig för varje lugn rörelse.",
  "Kontinuitet slår intensitet.",
  "Du bygger något – en dag i taget.",
  "Mjukt och regelbundet vinner.",
  "Varje pass räknas, även de korta.",
  "Kroppen läker när du ger den rätt förutsättningar.",
];
