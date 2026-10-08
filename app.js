/* Axelrehab – app-logik. All data sparas lokalt i localStorage. */
(() => {
  "use strict";

  /* ================= Hjälpfunktioner ================= */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const pad = (n) => String(n).padStart(2, "0");
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtShort = (d) => d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" }).replace(".", "");
  const fmtLong = (d) => d.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
  const fmtNum = (n) => n.toLocaleString("sv-SE", { maximumFractionDigits: 1 });
  const dayOfYear = (d = new Date()) => Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  /* ================= Lagring ================= */
  const KEY = "axelrehab.v1";
  const DEFAULTS = {
    v: 1,
    sessions: [],
    checkins: {},
    badges: [],
    installDismissed: false,
    settings: { name: "", level: "normal", goal: 5, voice: true, sound: true, theme: "auto", disabled: [], remind: "08:00" },
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const s = JSON.parse(raw);
      return { ...structuredClone(DEFAULTS), ...s, settings: { ...DEFAULTS.settings, ...(s.settings || {}) } };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast("Kunde inte spara – lagringen är full eller blockerad"); }
  }
  try { navigator.storage?.persist?.(); } catch {}

  /* ================= Härledd statistik ================= */
  const isFull = (s) => s.type === "full" && s.done.length / Math.max(1, s.total) >= 0.6;

  function dayStatus() {
    const map = {};
    for (const s of state.sessions) {
      const m = (map[s.date] ||= { full: 0, micro: 0, partial: 0 });
      if (isFull(s)) m.full++;
      else if (s.type === "micro") m.micro++;
      else m.partial++;
    }
    return map;
  }

  function streakInfo() {
    const ds = dayStatus();
    const has = (d) => (ds[dayKey(d)]?.full || 0) > 0;
    const today = new Date();
    let d = has(today) ? today : addDays(today, -1);
    let cur = 0;
    while (has(d)) { cur++; d = addDays(d, -1); }
    const days = Object.keys(ds).filter((k) => ds[k].full > 0).sort();
    let best = 0, run = 0, prev = null;
    for (const k of days) {
      const dt = parseKey(k);
      run = prev && Math.round((dt - prev) / 864e5) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = dt;
    }
    return { cur, best: Math.max(best, cur), doneToday: has(today) };
  }

  function weekInfo() {
    const ds = dayStatus();
    const mon = mondayOf(new Date());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(mon, i);
      const k = dayKey(d);
      days.push({ d, k, full: (ds[k]?.full || 0) > 0, micro: (ds[k]?.micro || 0) > 0, today: k === dayKey() });
    }
    return { days, count: days.filter((x) => x.full).length };
  }

  function totals() {
    const full = state.sessions.filter(isFull).length;
    const micro = state.sessions.filter((s) => s.type === "micro").length;
    const secs = state.sessions.reduce((a, s) => a + (s.secs || 0), 0);
    return { full, micro, all: state.sessions.length, mins: Math.round(secs / 60) };
  }

  function avg(arr) { const v = arr.filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }

  function checkinWindow(fromDaysAgo, toDaysAgo, field) {
    const out = [];
    for (let i = fromDaysAgo; i >= toDaysAgo; i--) {
      const c = state.checkins[dayKey(addDays(new Date(), -i))];
      if (c) out.push(c[field]);
    }
    return out;
  }

  function numbTrend() {
    const recent = avg(checkinWindow(6, 0, "numb"));
    const before = avg(checkinWindow(13, 7, "numb"));
    const keys = Object.keys(state.checkins).sort();
    const first = avg(keys.slice(0, 7).map((k) => state.checkins[k].numb));
    return { recent, before, first, n: keys.length };
  }

  /* ================= Utmärkelser ================= */
  const BADGES = [
    { id: "first", ico: "🌱", name: "Första passet", desc: "Kom igång", test: (t) => t.full >= 1 },
    { id: "s3", ico: "🔥", name: "3 dagar i rad", desc: "Rutinen tar form", test: (t, s) => s.best >= 3 },
    { id: "s7", ico: "⚡", name: "En hel vecka", desc: "7 dagar i rad", test: (t, s) => s.best >= 7 },
    { id: "s14", ico: "💪", name: "Två veckor", desc: "14 dagar i rad", test: (t, s) => s.best >= 14 },
    { id: "s30", ico: "🏆", name: "En månad", desc: "30 dagar i rad", test: (t, s) => s.best >= 30 },
    { id: "goal", ico: "🎯", name: "Veckomål", desc: "Nått veckomålet", test: () => weekInfo().count >= state.settings.goal || state.badges.includes("goal") },
    { id: "t10", ico: "⭐", name: "10 pass", desc: "Totalt", test: (t) => t.full >= 10 },
    { id: "t50", ico: "🌟", name: "50 pass", desc: "Totalt", test: (t) => t.full >= 50 },
    { id: "t100", ico: "👑", name: "100 pass", desc: "Totalt", test: (t) => t.full >= 100 },
    { id: "m10", ico: "⏱️", name: "Pausmästare", desc: "10 mikropauser", test: (t) => t.micro >= 10 },
    { id: "c7", ico: "📈", name: "Koll på läget", desc: "7 incheckningar", test: () => Object.keys(state.checkins).length >= 7 },
    { id: "better", ico: "🌈", name: "På rätt väg", desc: "Domningen −2 steg", test: () => { const tr = numbTrend(); return tr.n >= 10 && tr.first != null && tr.recent != null && tr.first - tr.recent >= 2; } },
  ];

  function checkBadges(announce = true) {
    const t = totals(), s = streakInfo();
    const fresh = [];
    for (const b of BADGES) {
      if (!state.badges.includes(b.id) && b.test(t, s)) { state.badges.push(b.id); fresh.push(b); }
    }
    if (fresh.length) {
      save();
      if (announce) fresh.forEach((b, i) => setTimeout(() => { toast(`${b.ico} Ny utmärkelse: ${b.name}`); confetti(90); }, 600 + i * 2200));
    }
  }

  /* ================= Tema ================= */
  function applyTheme() {
    const t = state.settings.theme;
    if (t === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }

  /* ================= Navigering ================= */
  function showView(name) {
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    window.scrollTo({ top: 0 });
    if (name === "progress") renderProgress();
    if (name === "today") renderToday();
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));

  /* ================= Program ================= */
  function buildProgram(type) {
    const lvl = state.settings.level;
    if (type === "micro") return MICRO.map((m) => ({ ex: EX_BY_ID[m.id], phases: m.plan() }));
    const items = EXERCISES.filter((e) => !state.settings.disabled.includes(e.id)).map((ex) => ({ ex, phases: ex.plan(lvl) }));
    return items.length ? items : EXERCISES.map((ex) => ({ ex, phases: ex.plan(lvl) }));
  }
  const programMinutes = (items) => Math.max(1, Math.round(items.reduce((a, it) => a + planSeconds(it.phases) + PREP_SECS, 0) / 60));

  /* ================= IDAG ================= */
  function greeting() {
    const h = new Date().getHours();
    const g = h < 5 ? "God natt" : h < 10 ? "God morgon" : h < 13 ? "Hej" : h < 18 ? "God eftermiddag" : "God kväll";
    return state.settings.name ? `${g}, ${state.settings.name}` : g;
  }

  function renderToday() {
    const now = new Date();
    $("#today-date").textContent = fmtLong(now);
    $("#greeting").textContent = greeting();

    const st = streakInfo();
    $("#streak-num").textContent = st.cur;
    $("#streak-label").textContent = st.cur === 1 ? "dag i rad 🔥" : st.cur > 1 ? "dagar i rad 🔥" : "dagar i rad – starta idag!";

    const wk = weekInfo();
    const goal = state.settings.goal;
    const C = 2 * Math.PI * 42;
    $("#week-ring-fg").style.strokeDashoffset = C * (1 - Math.min(1, wk.count / goal));
    $("#week-ring-fg").style.opacity = wk.count ? 1 : 0;
    $("#week-count").textContent = `${wk.count}/${goal}`;
    const names = ["M", "T", "O", "T", "F", "L", "S"];
    $("#week-dots").innerHTML = wk.days.map((d, i) =>
      `<div class="d ${d.full ? "done" : d.micro ? "micro" : ""} ${d.today ? "today" : ""}"><i>${d.full ? "✓" : ""}</i>${names[i]}</div>`).join("");

    const doy = dayOfYear(now);
    let quote = QUOTES[doy % QUOTES.length];
    if (st.doneToday) quote = "Dagens pass är klart. Snyggt jobbat – vila gott eller ta en mikropaus senare.";
    else if (st.cur >= 3) quote = `${st.cur} dagar i rad! Bryt inte kedjan – ${quote.charAt(0).toLowerCase()}${quote.slice(1)}`;
    $("#hero-quote").textContent = quote;

    const items = buildProgram("full");
    const btn = $("#start-full");
    btn.classList.toggle("done", st.doneToday);
    $("#start-full-title").textContent = st.doneToday ? "Dagens pass klart ✓" : "Starta dagens pass";
    $("#start-full-meta").textContent = st.doneToday
      ? "Kör gärna igen om det känns bra"
      : `${items.length} övningar · ca ${programMinutes(items)} min`;

    const microToday = state.sessions.filter((s) => s.type === "micro" && s.date === dayKey()).length;
    $("#micro-meta").textContent = `${programMinutes(buildProgram("micro"))} min vid skrivbordet${microToday ? ` · ${microToday} idag` : ""}`;

    // Anpassning om passen upplevs försämra
    const rated = state.sessions.filter((s) => s.type === "full" && s.feel).slice(-2);
    const worse = rated.length === 2 && rated.every((s) => s.feel === "worse");
    $("#adapt-card").classList.toggle("hidden", !worse);
    if (worse) {
      $("#adapt-text").textContent = state.settings.level === "normal"
        ? "Dina två senaste pass gav mer besvär. Byt till nivå Skonsam under Info, gör rörelserna mindre och stäng gärna av nervglidningen några dagar. Kvarstår det – kontakta en fysioterapeut."
        : "Dina två senaste pass gav mer besvär trots Skonsam nivå. Stäng av övningar som provocerar under Info och kontakta en fysioterapeut eller 1177 för bedömning.";
    }

    $("#install-card").classList.toggle("hidden", !(isIOS && !isStandalone && !state.installDismissed));

    // Incheckning
    const c = state.checkins[dayKey()];
    setSlider("numb", c ? c.numb : lastCheckinValue("numb"));
    setSlider("pain", c ? c.pain : lastCheckinValue("pain"));
    $("#checkin-note").value = c?.note || "";
    $("#checkin-status").innerHTML = c ? `<span class="saved-pill">✓ Incheckad ${esc(c.time || "")}</span>` : "Inte incheckad idag";
    $("#checkin-save").textContent = c ? "Uppdatera" : "Spara";

    $("#tip-text").textContent = TIPS[doy % TIPS.length];
  }

  function lastCheckinValue(field) {
    const keys = Object.keys(state.checkins).sort();
    return keys.length ? state.checkins[keys[keys.length - 1]][field] : 0;
  }

  function setSlider(name, v) {
    const r = $(`#r-${name}`);
    r.value = v;
    r.style.setProperty("--p", `${(v / 10) * 100}%`);
    $(`#v-${name}`).textContent = v;
  }
  ["numb", "pain"].forEach((n) => $(`#r-${n}`).addEventListener("input", (e) => setSlider(n, +e.target.value)));

  $("#checkin-save").addEventListener("click", () => {
    const now = new Date();
    state.checkins[dayKey(now)] = {
      numb: +$("#r-numb").value,
      pain: +$("#r-pain").value,
      note: $("#checkin-note").value.trim(),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    };
    save();
    toast("Incheckning sparad ✓");
    renderToday();
    checkBadges();
  });

  $("#start-full").addEventListener("click", () => startPlayer("full"));
  $("#start-micro").addEventListener("click", () => startPlayer("micro"));
  $("#install-dismiss").addEventListener("click", () => { state.installDismissed = true; save(); renderToday(); });

  /* ================= FRAMSTEG ================= */
  let chartRange = 30;
  $$("#range-seg button").forEach((b) => b.addEventListener("click", () => {
    chartRange = +b.dataset.r;
    $$("#range-seg button").forEach((x) => x.classList.toggle("on", x === b));
    renderChart();
  }));
  $("#table-toggle").addEventListener("click", () => {
    const t = $("#chart-table");
    t.classList.toggle("hidden");
    $("#table-toggle").textContent = t.classList.contains("hidden") ? "Visa som tabell" : "Dölj tabell";
  });

  function renderProgress() {
    const st = streakInfo(), t = totals();
    $("#s-streak").innerHTML = `${st.cur}<small>d</small>`;
    $("#s-best").innerHTML = `${st.best}<small>d</small>`;
    $("#s-total").innerHTML = `${t.full}${t.micro ? `<small>+${t.micro} mikro</small>` : ""}`;
    $("#s-mins").innerHTML = `${t.mins}<small>min</small>`;

    const tr = numbTrend();
    let txt = "Skatta dagligen för att se din trend.";
    if (tr.recent != null && tr.before != null) {
      const diff = tr.before - tr.recent;
      txt = Math.abs(diff) < 0.5
        ? `Domningen är stabil: snitt ${fmtNum(tr.recent)} senaste veckan.`
        : diff > 0
          ? `Domningen har minskat från ${fmtNum(tr.before)} till ${fmtNum(tr.recent)} i snitt jämfört med veckan innan. 🎉`
          : `Domningen har ökat från ${fmtNum(tr.before)} till ${fmtNum(tr.recent)} i snitt. Ta det lugnt, prova Skonsam nivå.`;
    } else if (tr.recent != null) {
      txt = `Snitt domning senaste veckan: ${fmtNum(tr.recent)}/10.`;
    }
    $("#trend-text").textContent = txt;

    renderChart();
    renderHeat();
    renderBadges();
  }

  function renderChart() {
    const box = $("#chart-box");
    const R = chartRange;
    const today = new Date();
    const days = [];
    for (let i = R - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      const c = state.checkins[dayKey(d)];
      days.push({ d, numb: c ? c.numb : null, pain: c ? c.pain : null, note: c?.note || "" });
    }
    const any = days.some((x) => x.numb != null);

    // Tabell
    const rows = days.filter((x) => x.numb != null).reverse();
    $("#chart-table").innerHTML = rows.length
      ? `<table class="data-table"><thead><tr><th>Datum</th><th>Domning</th><th>Smärta</th><th>Anteckning</th></tr></thead><tbody>${rows.map((r) =>
        `<tr><td>${fmtShort(r.d)}</td><td>${r.numb}</td><td>${r.pain}</td><td>${esc(r.note)}</td></tr>`).join("")}</tbody></table>`
      : `<p class="sub" style="margin-top:8px">Inga incheckningar i perioden.</p>`;

    if (!any) { box.innerHTML = `<div class="chart-empty">Inga incheckningar ännu – gör din första på Idag-fliken.</div>`; return; }

    const W = Math.max(280, box.clientWidth || 320), H = 220;
    const m = { l: 24, r: 14, t: 14, b: 26 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const x = (i) => m.l + (R === 1 ? iw / 2 : (i / (R - 1)) * iw);
    const y = (v) => m.t + ih - (v / 10) * ih;

    // Dagar utan incheckning hoppas över – linjen binder ihop de skattningar som finns
    const pathFor = (key) => days.reduce((d, p, i) =>
      p[key] == null ? d : `${d}${d ? "L" : "M"}${x(i).toFixed(1)} ${y(p[key]).toFixed(1)} `, "");
    const lonely = (key) => R > 30 ? "" : days.map((p, i) =>
      p[key] != null ? `<circle class="dot" cx="${x(i)}" cy="${y(p[key])}" r="3.5" fill="var(--s-${key})"/>` : "").join("");

    // Direktetiketter vid senaste punkten
    let lastI = -1;
    days.forEach((p, i) => { if (p.numb != null) lastI = i; });
    const ln = days[lastI];
    const numbAbove = ln.numb >= ln.pain;
    const lblX = Math.min(x(lastI), W - m.r);
    const lbl = (key, txt, above) => {
      const yy = y(ln[key]) + (above ? -9 : 17);
      return `<text class="lbl-t" x="${lblX}" y="${Math.max(10, Math.min(H - m.b - 2, yy))}" text-anchor="end">${txt}</text>`;
    };

    const ticks = [0, 5, 10].map((v) =>
      `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="axis-t" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("");
    const xl = [0, Math.floor((R - 1) / 2), R - 1].map((i, j) =>
      `<text class="axis-t" x="${x(i)}" y="${H - 6}" text-anchor="${j === 0 ? "start" : j === 2 ? "end" : "middle"}">${fmtShort(days[i].d)}</text>`).join("");

    box.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Linjediagram över domning och smärta, senaste ${R} dagarna">
        ${ticks}${xl}
        <path class="series" d="${pathFor("pain")}" stroke="var(--s-pain)"/>
        <path class="series" d="${pathFor("numb")}" stroke="var(--s-numb)"/>
        ${lonely("pain")}${lonely("numb")}
        <circle class="dot" cx="${x(lastI)}" cy="${y(ln.pain)}" r="4.5" fill="var(--s-pain)"/>
        <circle class="dot" cx="${x(lastI)}" cy="${y(ln.numb)}" r="4.5" fill="var(--s-numb)"/>
        ${lbl("numb", "Domning", numbAbove)}${lbl("pain", "Smärta", !numbAbove)}
        <g id="hover-g" style="display:none">
          <line class="xhair" id="hx" y1="${m.t}" y2="${m.t + ih}"/>
          <circle class="dot" id="hp" r="5" fill="var(--s-pain)"/>
          <circle class="dot" id="hn" r="5" fill="var(--s-numb)"/>
        </g>
      </svg>
      <div class="tooltip hidden" id="tt"></div>`;

    const svg = box.querySelector("svg");
    const hg = $("#hover-g"), tt = $("#tt");
    const onMove = (e) => {
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      let i = Math.round(((px - m.l) / iw) * (R - 1));
      i = Math.max(0, Math.min(R - 1, i));
      // närmaste dag med data
      let best = -1, bd = 1e9;
      days.forEach((p, j) => { if (p.numb != null && Math.abs(j - i) < bd) { bd = Math.abs(j - i); best = j; } });
      if (best < 0) return;
      const p = days[best];
      hg.style.display = "";
      $("#hx").setAttribute("x1", x(best)); $("#hx").setAttribute("x2", x(best));
      $("#hn").setAttribute("cx", x(best)); $("#hn").setAttribute("cy", y(p.numb));
      $("#hp").setAttribute("cx", x(best)); $("#hp").setAttribute("cy", y(p.pain));
      tt.classList.remove("hidden");
      tt.innerHTML = `<b>${fmtShort(p.d)}</b><br><i style="background:var(--s-numb)"></i>Domning ${p.numb}<br><i style="background:var(--s-pain)"></i>Smärta ${p.pain}`;
      const leftPx = (x(best) / W) * rect.width;
      tt.style.left = `${Math.max(60, Math.min(rect.width - 60, leftPx))}px`;
      tt.style.top = `-8px`;
    };
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerdown", onMove);
    svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { hg.style.display = "none"; tt.classList.add("hidden"); } });
  }

  function renderHeat() {
    const ds = dayStatus();
    const weeks = 16;
    const start = addDays(mondayOf(new Date()), -(weeks - 1) * 7);
    const todayK = dayKey();
    let html = "";
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i);
      const k = dayKey(d);
      const s = ds[k];
      const future = d > new Date() && k !== todayK;
      const lvl = !s ? 0 : s.full && s.micro ? 3 : s.full ? 2 : (s.micro || s.partial) ? 1 : 0;
      html += `<button class="c ${future ? "future" : `l${lvl}`} ${k === todayK ? "today" : ""}" data-k="${k}" aria-label="${k}"></button>`;
    }
    const heat = $("#heat");
    heat.innerHTML = html;
    heat.onclick = (e) => {
      const c = e.target.closest(".c");
      if (!c || c.classList.contains("future")) return;
      $$(".c.sel", heat).forEach((x) => x.classList.remove("sel"));
      c.classList.add("sel");
      const s = ds[c.dataset.k];
      const ci = state.checkins[c.dataset.k];
      const parts = [];
      if (s?.full) parts.push(`${s.full} pass`);
      if (s?.micro) parts.push(`${s.micro} mikropaus${s.micro > 1 ? "er" : ""}`);
      if (s?.partial) parts.push("påbörjat pass");
      if (ci) parts.push(`domning ${ci.numb}, smärta ${ci.pain}`);
      $("#heat-info").textContent = `${fmtLong(parseKey(c.dataset.k))}: ${parts.length ? parts.join(" · ") : "vila"}`;
    };
  }

  function renderBadges() {
    $("#badges").innerHTML = BADGES.map((b) => {
      const on = state.badges.includes(b.id);
      return `<div class="badge ${on ? "on" : ""}"><div class="b-ico">${b.ico}</div><b>${b.name}</b><span>${b.desc}</span></div>`;
    }).join("");
  }

  let rTimer;
  window.addEventListener("resize", () => { clearTimeout(rTimer); rTimer = setTimeout(() => { if ($("#view-progress").classList.contains("active")) renderChart(); }, 150); });

  /* ================= INFO / INSTÄLLNINGAR ================= */
  function renderSettings() {
    const s = state.settings;
    $("#set-name").value = s.name;
    $$("#set-level button").forEach((b) => b.classList.toggle("on", b.dataset.v === s.level));
    $$("#set-theme button").forEach((b) => b.classList.toggle("on", b.dataset.v === s.theme));
    $("#set-goal").value = String(s.goal);
    $("#set-voice").checked = s.voice;
    $("#set-sound").checked = s.sound;
    $("#set-remind").value = s.remind;
    $("#ex-toggles").innerHTML = EXERCISES.map((e) => `
      <div class="ex-toggle">
        <div class="mini-art">${ART[e.art]()}</div>
        <div class="t"><b>${e.name}</b><span>${e.area}</span></div>
        <label class="switch"><input type="checkbox" data-ex="${e.id}" ${s.disabled.includes(e.id) ? "" : "checked"}><span></span></label>
      </div>`).join("");
  }

  const setS = (k, v) => { state.settings[k] = v; save(); };
  $("#set-name").addEventListener("change", (e) => { setS("name", e.target.value.trim()); renderToday(); });
  $("#set-goal").addEventListener("change", (e) => { setS("goal", +e.target.value); renderToday(); });
  $("#set-voice").addEventListener("change", (e) => setS("voice", e.target.checked));
  $("#set-sound").addEventListener("change", (e) => setS("sound", e.target.checked));
  $("#set-remind").addEventListener("change", (e) => setS("remind", e.target.value));
  $$("#set-level button").forEach((b) => b.addEventListener("click", () => { setS("level", b.dataset.v); renderSettings(); renderToday(); }));
  $$("#set-theme button").forEach((b) => b.addEventListener("click", () => { setS("theme", b.dataset.v); applyTheme(); renderSettings(); }));
  $("#ex-toggles").addEventListener("change", (e) => {
    const id = e.target.dataset.ex;
    if (!id) return;
    const dis = new Set(state.settings.disabled);
    e.target.checked ? dis.delete(id) : dis.add(id);
    if (dis.size >= EXERCISES.length) { e.target.checked = true; toast("Minst en övning behöver vara på"); return; }
    setS("disabled", [...dis]);
    renderToday();
  });

  // Påminnelse: färdiga .ics-filer (var 30:e minut) som Safari öppnar i Kalender-appen
  $("#set-remind").innerHTML = Array.from({ length: 37 }, (_, i) => {
    const h = 5 + Math.floor(i / 2), m = i % 2 ? "30" : "00";
    return `<option value="${pad(h)}:${m}">${pad(h)}:${m}</option>`;
  }).join("");
  $("#remind-btn").addEventListener("click", () => {
    const hm = (state.settings.remind || "08:00").replace(":", "");
    window.open(`reminders/axelrehab-${hm}.ics`, "_blank");
  });

  async function deliverFile(text, filename, type) {
    const file = new File([text], filename, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: filename }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  $("#export-btn").addEventListener("click", () => {
    deliverFile(JSON.stringify(state, null, 2), `axelrehab-backup-${dayKey()}.json`, "application/json");
  });
  $("#import-file").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data.sessions) || typeof data.checkins !== "object") throw new Error("format");
      sheet({
        title: "Importera säkerhetskopia?",
        text: `Filen innehåller ${data.sessions.length} pass och ${Object.keys(data.checkins).length} incheckningar. Det ersätter all nuvarande data.`,
        actions: [
          { label: "Importera", cls: "primary", fn: () => {
            state = { ...structuredClone(DEFAULTS), ...data, settings: { ...DEFAULTS.settings, ...(data.settings || {}) } };
            save(); applyTheme(); renderAll(); toast("Data importerad ✓");
          } },
          { label: "Avbryt" },
        ],
      });
    } catch { toast("Kunde inte läsa filen"); }
  });
  $("#reset-btn").addEventListener("click", () => sheet({
    title: "Rensa all data?",
    text: "All historik, incheckningar och utmärkelser raderas från telefonen. Det går inte att ångra.",
    actions: [
      { label: "Rensa allt", cls: "danger", fn: () => { state = structuredClone(DEFAULTS); save(); applyTheme(); renderAll(); toast("All data rensad"); } },
      { label: "Avbryt" },
    ],
  }));

  /* ================= Ljud & röst ================= */
  let actx = null;
  function unlockAudio() {
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const b = actx.createBuffer(1, 1, 22050), src = actx.createBufferSource();
      src.buffer = b; src.connect(actx.destination); src.start(0);
    } catch {}
    try {
      if (state.settings.voice && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0; speechSynthesis.speak(u);
      }
    } catch {}
  }
  function beep(freq = 880, dur = 0.12, vol = 0.18, when = 0) {
    if (!state.settings.sound || !actx) return;
    try {
      const t = actx.currentTime + when;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch {}
  }
  const chime = () => { beep(660, 0.18, 0.18, 0); beep(880, 0.18, 0.18, 0.14); beep(1175, 0.35, 0.16, 0.28); };

  let svVoice = null;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    svVoice = vs.find((v) => /sv[-_]SE/i.test(v.lang) && /alva|klara/i.test(v.name)) || vs.find((v) => /^sv/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function speak(text) {
    if (!text || !state.settings.voice || !("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "sv-SE"; if (svVoice) u.voice = svVoice;
      u.rate = 1.0; u.pitch = 1.0;
      speechSynthesis.speak(u);
    } catch {}
  }

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch {}
  }

  /* ================= Spelaren ================= */
  const RING_C = 2 * Math.PI * 80;
  let P = null;
  const playerEl = $("#player");
  const ICONS = {
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    prev: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2v14H6zM20 6.2v11.6a1 1 0 0 1-1.5.86L9.6 13a1.2 1.2 0 0 1 0-2l8.9-5.66A1 1 0 0 1 20 6.2z"/></svg>`,
    next: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 5h2v14h-2zM4 6.2v11.6a1 1 0 0 0 1.5.86L14.4 13a1.2 1.2 0 0 0 0-2L5.5 5.34A1 1 0 0 0 4 6.2z"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4.5" height="14" rx="1.5"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.5"/></svg>`,
  };

  function startPlayer(type) {
    unlockAudio();
    const items = buildProgram(type);
    P = { type, items, i: 0, j: -1, acc: 0, t0: performance.now(), paused: false, active: 0, last: performance.now(), done: new Set(), lastSec: null, raf: 0, finished: false };
    playerEl.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    keepAwake(true);
    renderExercise();
    enterPhase();
    loop();
  }

  function curPhase() {
    const it = P.items[P.i];
    if (P.j < 0) return { label: "Gör dig redo", secs: PREP_SECS, pose: "b", kind: "prep" };
    return it.phases[P.j];
  }

  function renderExercise() {
    const it = P.items[P.i], ex = it.ex;
    const n = P.items.length;
    playerEl.innerHTML = `
      <div class="player-inner">
        <div class="p-top">
          <button class="icon-btn" id="p-close" aria-label="Avsluta">${ICONS.close}</button>
          <div class="p-progress">${P.items.map((_, k) => `<i class="${k < P.i ? "done" : k === P.i ? "cur" : ""}"></i>`).join("")}</div>
          <div class="p-count">${P.i + 1}/${n}</div>
        </div>
        <div class="p-head">
          <span class="p-area">${ex.area}</span>
          <h2 class="p-name">${ex.name}</h2>
        </div>
        <div class="p-art" id="p-art">${ART[ex.art]()}</div>
        <div class="p-timer" id="p-timer">
          <svg viewBox="0 0 188 188">
            <defs><linearGradient id="tgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#14b8a6"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs>
            <circle class="t-bg" cx="94" cy="94" r="80" fill="none" stroke-width="12"/>
            <circle class="t-fg" id="t-fg" cx="94" cy="94" r="80" fill="none" stroke="url(#tgrad)" stroke-width="12" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/>
          </svg>
          <div class="t-mid"><div class="t-sec" id="t-sec">0</div><div class="t-lbl" id="t-lbl"></div></div>
        </div>
        <div class="p-meta" id="p-meta"></div>
        <div class="p-controls">
          <button class="icon-btn" id="p-prev" aria-label="Föregående övning">${ICONS.prev}</button>
          <button class="big" id="p-play" aria-label="Pausa">${ICONS.pause}</button>
          <button class="icon-btn" id="p-next" aria-label="Nästa övning">${ICONS.next}</button>
        </div>
        <details class="card p-howto" ${P.i === 0 && P.type === "full" ? "open" : ""}>
          <summary>Så gör du</summary>
          <ol>${ex.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
          <p class="why"><b>Varför:</b> ${ex.why}</p>
          ${ex.caution ? `<p class="caution">⚠️ ${ex.caution}</p>` : ""}
        </details>
      </div>`;
    $("#p-close").onclick = askExit;
    $("#p-play").onclick = togglePause;
    $("#p-next").onclick = () => skipExercise(1);
    $("#p-prev").onclick = () => skipExercise(-1);
    $("#p-timer").onclick = () => { if (P.j < 0) { P.j = 0; enterPhase(); } };
    $("#p-art").onclick = $("#p-timer").onclick;
  }

  function enterPhase() {
    const it = P.items[P.i], ph = curPhase();
    P.acc = 0; P.t0 = performance.now(); P.lastSec = null;
    const art = $("#p-art .art");
    if (art) {
      art.classList.toggle("demo", ph.kind === "prep");
      art.classList.toggle("pose-a", ph.pose === "a" && ph.kind !== "prep");
      const side = ph.side || (P.j < 0 ? it.phases[0]?.side : null);
      art.classList.toggle("mirror", side === "vänster");
    }
    $("#p-timer").classList.toggle("rest", ph.kind === "rest" || ph.kind === "prep");
    $("#t-lbl").textContent = ph.kind === "prep" ? "Gör dig redo · tryck för att starta" : ph.label;
    const meta = [];
    if (ph.kind !== "prep" && ph.reps > 1) meta.push(`${it.phases.some((p) => p.side) ? "Omgång" : it.ex.id === "breath" ? "Andetag" : "Rep"} ${ph.rep} av ${ph.reps}`);
    if (ph.side) meta.push(`${ph.side[0].toUpperCase()}${ph.side.slice(1)} sida`);
    if (ph.kind === "prep") meta.push(it.ex.short);
    $("#p-meta").textContent = meta.join(" · ");

    if (ph.kind === "prep") {
      speak(`${P.i === 0 ? "" : "Nästa: "}${it.ex.name}. ${it.ex.short}`);
    } else {
      if (ph.cue) speak(ph.cue);
      beep(ph.kind === "rest" ? 620 : 880, 0.12);
    }
    tick(true);
  }

  function loop() {
    cancelAnimationFrame(P.raf);
    const step = () => {
      if (!P || P.finished) return;
      tick();
      P.raf = requestAnimationFrame(step);
    };
    P.raf = requestAnimationFrame(step);
  }

  function tick(force = false) {
    const now = performance.now();
    if (!P.paused) P.active += now - P.last;
    P.last = now;
    const ph = curPhase();
    const el = P.paused ? P.acc : P.acc + (now - P.t0);
    const remain = Math.max(0, ph.secs - el / 1000);
    const sec = Math.ceil(remain);
    if (sec !== P.lastSec || force) {
      $("#t-sec").textContent = sec;
      if (!force && P.lastSec != null && sec > 0 && sec <= 3 && (ph.secs >= 10 || ph.kind === "prep")) beep(520, 0.07, 0.12);
      P.lastSec = sec;
    }
    $("#t-fg").style.strokeDashoffset = RING_C * (1 - remain / ph.secs);
    const it = P.items[P.i];
    const total = planSeconds(it.phases);
    const doneSecs = P.j < 0 ? 0 : it.phases.slice(0, P.j).reduce((a, p) => a + p.secs, 0) + el / 1000;
    const cur = $(".p-progress i.cur");
    if (cur) cur.style.setProperty("--w", `${Math.min(100, (doneSecs / total) * 100)}%`);
    if (!P.paused && remain <= 0) advance();
  }

  function advance() {
    const it = P.items[P.i];
    if (P.j < it.phases.length - 1) { P.j++; enterPhase(); return; }
    P.done.add(P.i);
    chime();
    if (P.i < P.items.length - 1) { P.i++; P.j = -1; renderExercise(); enterPhase(); }
    else finish();
  }

  function skipExercise(dir) {
    const it = P.items[P.i];
    if (dir > 0 && P.j >= Math.floor(it.phases.length / 2)) P.done.add(P.i);
    const ni = P.i + dir;
    if (ni < 0) { P.j = -1; enterPhase(); return; }
    if (ni >= P.items.length) { finish(); return; }
    P.i = ni; P.j = -1;
    if (P.paused) togglePause();
    renderExercise(); enterPhase();
  }

  function togglePause() {
    const now = performance.now();
    if (P.paused) { P.paused = false; P.t0 = now; speak("Fortsätter"); }
    else { P.paused = true; P.acc += now - P.t0; try { speechSynthesis.cancel(); } catch {} }
    $("#p-play").innerHTML = P.paused ? ICONS.play : ICONS.pause;
    $("#p-play").setAttribute("aria-label", P.paused ? "Fortsätt" : "Pausa");
  }

  function askExit() {
    if (!P.paused) togglePause();
    if (P.done.size === 0) { closePlayer(); return; }
    sheet({
      title: "Avsluta passet?",
      text: `Du har gjort ${P.done.size} av ${P.items.length} övningar.`,
      actions: [
        { label: "Fortsätt passet", cls: "primary", fn: () => togglePause() },
        { label: "Avsluta och spara", fn: () => finish() },
        { label: "Avsluta utan att spara", cls: "danger", fn: () => closePlayer() },
      ],
    });
  }

  function closePlayer() {
    if (P) { P.finished = true; cancelAnimationFrame(P.raf); }
    try { speechSynthesis.cancel(); } catch {}
    keepAwake(false);
    playerEl.classList.add("hidden");
    playerEl.innerHTML = "";
    document.body.style.overflow = "";
    P = null;
    renderToday();
    checkBadges();
  }

  function finish() {
    P.finished = true;
    cancelAnimationFrame(P.raf);
    const rec = {
      id: Date.now().toString(36),
      date: dayKey(),
      ts: Date.now(),
      type: P.type,
      done: [...P.done].map((k) => P.items[k].ex.id),
      total: P.items.length,
      secs: Math.round(P.active / 1000),
      feel: null,
    };
    state.sessions.push(rec);
    save();
    const st = streakInfo();
    const full = isFull(rec);
    const name = state.settings.name ? `, ${state.settings.name}` : "";
    const title = P.type === "micro" ? "Mikropaus klar!" : full ? `Bra jobbat${name}!` : "Bra försök!";
    const lead = P.type === "micro"
      ? "Två minuter som din nacke tackar dig för. Ta gärna en till om en timme."
      : full
        ? st.cur > 1 ? `Det är ${st.cur} dagar i rad. Du bygger en rutin som läker.` : "Första steget i en ny svit. Imorgon gör vi det igen!"
        : "Allt räknas. Försök göra fler övningar nästa gång.";
    speak(`${title} ${P.type === "full" && full && st.cur > 1 ? `${st.cur} dagar i rad.` : ""}`);
    chime();
    playerEl.innerHTML = `
      <div class="player-inner summary">
        <div class="trophy">${P.type === "micro" ? "⏱️" : full ? "🏆" : "👏"}</div>
        <h2>${title}</h2>
        <p class="lead">${lead}</p>
        <div class="sum-stats">
          <div class="stat"><div class="k">Tid</div><div class="v">${Math.max(1, Math.round(rec.secs / 60))}<small>min</small></div></div>
          <div class="stat"><div class="k">Övningar</div><div class="v">${rec.done.length}<small>/${rec.total}</small></div></div>
          <div class="stat"><div class="k">Svit</div><div class="v">${st.cur}<small>d</small></div></div>
        </div>
        <div class="card" style="text-align:left">
          <h3>Hur känns domningen nu?</h3>
          <p class="sub">Jämfört med innan passet.</p>
          <div class="feel" id="feel">
            <button data-f="better"><span class="e">😊</span>Bättre</button>
            <button data-f="same"><span class="e">😐</span>Som innan</button>
            <button data-f="worse"><span class="e">😣</span>Sämre</button>
          </div>
          <p class="sub hidden" id="feel-msg" style="margin-top:12px"></p>
        </div>
        <button class="btn-primary" id="sum-done" style="justify-content:center; margin-top:8px">Klar</button>
      </div>`;
    $("#feel").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      rec.feel = b.dataset.f;
      save();
      $$("#feel button").forEach((x) => x.classList.toggle("on", x === b));
      const msg = $("#feel-msg");
      msg.classList.remove("hidden");
      msg.textContent = {
        better: "Toppen! Det tyder på att nerven gillar rörelsen.",
        same: "Helt normalt. Effekten kommer gradvis över veckor.",
        worse: "Okej, bra att veta. Gör rörelserna mindre nästa gång och välj gärna nivå Skonsam. Om det sitter kvar till imorgon – hoppa över nervglidningen.",
      }[rec.feel];
    };
    $("#sum-done").onclick = closePlayer;
    if (full || P.type === "micro") confetti(full ? 160 : 70);
  }

  document.addEventListener("visibilitychange", () => {
    if (!P || P.finished) return;
    if (document.hidden) { if (!P.paused) togglePause(); }
    else keepAwake(true);
  });

  /* ================= UI-komponenter ================= */
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .4s"; t.style.opacity = "0"; }, 2200);
    setTimeout(() => t.remove(), 2700);
  }

  function sheet({ title, text, actions }) {
    const bd = document.createElement("div");
    bd.className = "sheet-backdrop";
    bd.innerHTML = `<div class="sheet"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="actions">${actions.map((a, i) => `<button data-i="${i}" class="${a.cls || ""}">${esc(a.label)}</button>`).join("")}</div></div>`;
    document.body.appendChild(bd);
    bd.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-i]");
      if (!b && e.target !== bd) return;
      bd.remove();
      if (b) actions[+b.dataset.i].fn?.();
      else if (actions[0].cls === "primary" && P && !P.finished) actions[0].fn?.();
    });
  }

  function confetti(n = 140) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = $("#confetti"), ctx = cv.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#14b8a6", "#6366f1", "#f59e0b", "#ec4899", "#22c55e", "#38bdf8"];
    const parts = Array.from({ length: n }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
      s: Math.random() * 6 + 4, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
      c: colors[(Math.random() * colors.length) | 0],
    }));
    const t0 = performance.now();
    const draw = (t) => {
      const age = t - t0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of parts) {
        p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.globalAlpha = Math.max(0, 1 - age / 2600);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66);
        ctx.restore();
      }
      if (age < 2600) requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    requestAnimationFrame(draw);
  }

  /* ================= Start ================= */
  function renderAll() { renderToday(); renderSettings(); if ($("#view-progress").classList.contains("active")) renderProgress(); }

  applyTheme();
  renderAll();
  checkBadges(false);

  // Uppdatera vid ny dag (appen kan ligga öppen i bakgrunden)
  let lastDay = dayKey();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && dayKey() !== lastDay) { lastDay = dayKey(); renderAll(); }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
