// ──────────────────────────────────────────
// DATA  (loaded from players.js)
// ──────────────────────────────────────────
// Build a name-keyed map for fast lookup
const playerMap = Object.fromEntries(PLAYERS_DEFAULT.map((p) => [p.name, p]));
const KIDS = PLAYERS_DEFAULT.map((p) => p.name);
const TOTAL_QUARTERS = 4;

const FORMATIONS = {
  "2-3-2": {
    label: "2-3-2",
    assignmentOrder: [
      { role: "CMF", count: 1, preferredRole: "MID" },
      { role: "MID", count: 2, preferredRole: "MID" },
      { role: "DEF", count: 2, preferredRole: "DEF" },
      { role: "FWD", count: 2, preferredRole: "FWD" },
    ],
    fieldRows: [
      ["FWD", "FWD"],
      ["MID", "CMF", "MID"],
      ["DEF", "DEF"],
    ],
  },
  "3-3-1": {
    label: "3-3-1",
    assignmentOrder: [
      { role: "CMF", count: 1, preferredRole: "MID" },
      { role: "STP", count: 1, preferredRole: "DEF" },
      { role: "MID", count: 2, preferredRole: "MID" },
      { role: "DEF", count: 2, preferredRole: "DEF" },
      { role: "FWD", count: 1, preferredRole: "FWD" },
    ],
    fieldRows: [["FWD"], ["MID", "CMF", "MID"], ["DEF", "STP", "DEF"]],
  },
};

const ROLE_LABELS = {
  GK: "Goalkeeper",
  DEF: "Defender",
  STP: "Stopper",
  MID: "Midfielder",
  CMF: "Center Mid",
  FWD: "Forward",
  SUB: "Sub",
};

let gameLineup = null;
let activeFieldQ = 0;
let selectedGKs = [];
let selectedFormation = "2-3-2";
// Initialise CMF allowances from JSON; overridden by localStorage on load
let centerMidAllowed = new Set(
  PLAYERS_DEFAULT.filter((p) => p.canPlayCMF).map((p) => p.name),
);

// checkedIn: names in arrival order (first tapped = first in queue)
let checkedIn = [];
// lockedQuarters: set of quarter indices (0-3) that should not be reshuffled
let lockedQuarters = new Set();

// ──────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getSelectedGoalkeepers() {
  return [...new Set(selectedGKs)].filter((name) => checkedIn.includes(name));
}

function getFormationConfig() {
  return FORMATIONS[selectedFormation] || FORMATIONS["2-3-2"];
}

function buildGoalkeeperPlan() {
  const goalkeepers = getSelectedGoalkeepers().slice(0, 2);

  if (!goalkeepers.length) {
    return {
      goalkeepers: checkedIn.length ? [checkedIn[0]] : [],
      byQuarter: Array(TOTAL_QUARTERS).fill(checkedIn[0] || null),
    };
  }

  if (goalkeepers.length === 1) {
    return {
      goalkeepers,
      byQuarter: Array(TOTAL_QUARTERS).fill(goalkeepers[0]),
    };
  }

  return {
    goalkeepers,
    byQuarter: [goalkeepers[0], goalkeepers[0], goalkeepers[1], goalkeepers[1]],
  };
}

function buildLockedQuarter(existingQuarter, qi, goalkeeperPlan) {
  if (!existingQuarter) return null;

  const currentGK = goalkeeperPlan.byQuarter[qi];
  const preserved = [];
  const used = new Set();

  preserved.push({ name: currentGK, role: "GK" });
  used.add(currentGK);

  existingQuarter
    .filter(
      (player) =>
        player.role !== "GK" &&
        checkedIn.includes(player.name) &&
        player.name !== currentGK,
    )
    .forEach((player) => {
      if (!used.has(player.name)) {
        preserved.push({ name: player.name, role: player.role });
        used.add(player.name);
      }
    });

  checkedIn
    .filter((name) => !used.has(name))
    .forEach((name) => preserved.push({ name, role: "SUB" }));

  return preserved;
}

// ──────────────────────────────────────────
// LINEUP GENERATION
// ──────────────────────────────────────────

// Assign positions to active players respecting preferences.
// Processes slots in most-constrained-first order.
function assignPositions(active) {
  const formation = getFormationConfig();
  const remaining = shuffle([...active]);
  const result = [];

  // Order depends on formation. CMF stays first. 3-3-1 also assigns the
  // stopper early so defender-only players are reserved for the back line.
  for (const { role, count, preferredRole } of formation.assignmentOrder) {
    let pool;
    if (role === "CMF") {
      const eligible = remaining.filter((n) => centerMidAllowed.has(n));
      // Prefer CMF-eligible who also like MID
      const prefMid = eligible.filter((n) =>
        playerMap[n]?.preferredPositions.includes("MID"),
      );
      pool =
        prefMid.length >= count
          ? prefMid
          : eligible.length >= count
            ? eligible
            : remaining;
    } else {
      const pref = remaining.filter((n) =>
        playerMap[n]?.preferredPositions.includes(preferredRole),
      );
      pool = pref.length >= count ? pref : remaining;
    }
    const picks = shuffle(pool).slice(0, count);
    picks.forEach((name) => {
      result.push({ name, role });
      remaining.splice(remaining.indexOf(name), 1);
    });
  }

  // Safety: assign any leftover players (shouldn't normally happen)
  remaining.forEach((name) => result.push({ name, role: "MID" }));
  return result;
}

function generateLineup() {
  if (checkedIn.length < 8) return null;
  const goalkeeperPlan = buildGoalkeeperPlan();

  const unlockedQs = Array.from({ length: TOTAL_QUARTERS }, (_, q) => q).filter(
    (q) => !lockedQuarters.has(q),
  );

  const playCount = Object.fromEntries(checkedIn.map((name) => [name, 0]));
  const quarters = Array(TOTAL_QUARTERS).fill(null);

  if (gameLineup && gameLineup.quarters) {
    Array.from({ length: TOTAL_QUARTERS }, (_, q) => q)
      .filter((q) => lockedQuarters.has(q))
      .forEach((q) => {
        const lockedQuarter = buildLockedQuarter(
          gameLineup.quarters[q],
          q,
          goalkeeperPlan,
        );
        if (!lockedQuarter) return;
        quarters[q] = lockedQuarter;
        lockedQuarter.forEach((player) => {
          if (player.role !== "SUB") playCount[player.name]++;
        });
      });
  }

  for (const q of unlockedQs) {
    const gk = goalkeeperPlan.byQuarter[q];
    const eligible = checkedIn.filter((name) => name !== gk);
    const activeCount = Math.min(7, eligible.length);
    const sorted = [...eligible].sort((a, b) =>
      playCount[a] !== playCount[b]
        ? playCount[a] - playCount[b]
        : checkedIn.indexOf(a) - checkedIn.indexOf(b),
    );
    const active = sorted.slice(0, activeCount);
    const benched = sorted.slice(activeCount);
    const assignments = assignPositions(active);

    playCount[gk]++;
    active.forEach((name) => playCount[name]++);

    quarters[q] = [
      { name: gk, role: "GK" },
      ...assignments,
      ...benched.map((name) => ({ name, role: "SUB" })),
    ];
  }

  return {
    formation: selectedFormation,
    goalkeepers: goalkeeperPlan.goalkeepers,
    goalkeeperByQuarter: goalkeeperPlan.byQuarter,
    quarters,
  };
}

const LS_KEY = "soccer-lineup-v1";

function saveLineup() {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      gameLineup,
      activeFieldQ,
      selectedGKs,
      selectedFormation,
      centerMidAllowed: [...centerMidAllowed],
      checkedIn,
      lockedQuarters: [...lockedQuarters],
    }),
  );
}

function loadLineup() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      gameLineup = parsed.gameLineup;
      activeFieldQ = parsed.activeFieldQ || 0;
      selectedGKs = Array.isArray(parsed.selectedGKs)
        ? parsed.selectedGKs
        : parsed.selectedGK
          ? [parsed.selectedGK]
          : [];
      if (FORMATIONS[parsed.selectedFormation]) {
        selectedFormation = parsed.selectedFormation;
      } else if (FORMATIONS[parsed.gameLineup?.formation]) {
        selectedFormation = parsed.gameLineup.formation;
      }
      if (Array.isArray(parsed.centerMidAllowed)) {
        centerMidAllowed = new Set(parsed.centerMidAllowed);
      }
      if (Array.isArray(parsed.checkedIn)) {
        checkedIn = parsed.checkedIn;
      }
      if (Array.isArray(parsed.lockedQuarters)) {
        lockedQuarters = new Set(parsed.lockedQuarters);
      }
      if (
        !gameLineup ||
        !Array.isArray(gameLineup.goalkeepers) ||
        !Array.isArray(gameLineup.goalkeeperByQuarter)
      ) {
        gameLineup = null;
      }
      return true;
    }
  } catch (e) {
    /* ignore corrupt data */
  }
  return false;
}

function setFormation(formationKey) {
  if (!FORMATIONS[formationKey] || formationKey === selectedFormation) {
    return;
  }
  selectedFormation = formationKey;
  activeFieldQ = 0;
  lockedQuarters = new Set();
  swapSelection = null;
  gameLineup = generateLineup();
  saveLineup();
  renderAll();
}

function renderFormationPicker() {
  const container = document.getElementById("formation-switcher");
  const formationKeys = Object.keys(FORMATIONS);
  container.innerHTML = formationKeys
    .map((key) => {
      const active = key === selectedFormation ? " active" : "";
      return `<button class="formation-btn${active}" onclick="setFormation('${key}')">${FORMATIONS[key].label}</button>`;
    })
    .join("");
  document.getElementById("formation-tag").textContent =
    getFormationConfig().label;
}

function toggleCMF(name) {
  if (centerMidAllowed.has(name)) {
    centerMidAllowed.delete(name);
  } else {
    centerMidAllowed.add(name);
  }
  activeFieldQ = 0;
  gameLineup = generateLineup();
  saveLineup();
  renderAll();
}

function renderCMFPicker() {
  if (!gameLineup) {
    document.getElementById("cmf-pills").innerHTML = "";
    return;
  }
  const container = document.getElementById("cmf-pills");
  container.innerHTML = checkedIn
    .filter((kid) => gameLineup.goalkeeperByQuarter.some((gk) => gk !== kid))
    .map((kid) => {
      const on = centerMidAllowed.has(kid);
      return `<button class="cmf-pill${on ? " selected" : ""}" onclick="toggleCMF('${kid}')">${kid}</button>`;
    })
    .join("");
}

function pickGK(name) {
  if (selectedGKs.includes(name)) {
    selectedGKs = selectedGKs.filter((kid) => kid !== name);
  } else if (selectedGKs.length < 2) {
    selectedGKs = [...selectedGKs, name];
  } else {
    return;
  }
  activeFieldQ = 0;
  gameLineup = generateLineup();
  saveLineup();
  renderAll();
}

function renderGKPicker() {
  if (!gameLineup) {
    document.getElementById("gk-pills").innerHTML = "";
    return;
  }
  const container = document.getElementById("gk-pills");
  const selected = new Set(getSelectedGoalkeepers());
  const selectionFull = selected.size >= 2;
  container.innerHTML = checkedIn
    .map((kid) => {
      const active = selected.has(kid);
      const disabled = selectionFull && !active ? " disabled" : "";
      return `<button class="gk-pill${active ? " selected" : ""}" onclick="pickGK('${kid}')"${disabled}>${kid}</button>`;
    })
    .join("");
}

function reshuffle() {
  activeFieldQ = 0;
  swapSelection = null;
  gameLineup = generateLineup();
  saveLineup();
  renderAll();
}

function resetApp() {
  if (
    !window.confirm(
      "Clear all check-ins, goalkeeper picks, locks, and saved lineup?",
    )
  ) {
    return;
  }

  localStorage.removeItem(LS_KEY);
  gameLineup = null;
  activeFieldQ = 0;
  selectedGKs = [];
  centerMidAllowed = new Set(
    PLAYERS_DEFAULT.filter((p) => p.canPlayCMF).map((p) => p.name),
  );
  checkedIn = [];
  lockedQuarters = new Set();
  swapSelection = null;
  renderAll();
}

// ──────────────────────────────────────────
// CHECK IN
// ──────────────────────────────────────────
function toggleCheckIn(name) {
  const idx = checkedIn.indexOf(name);
  if (idx === -1) {
    checkedIn.push(name);
  } else {
    checkedIn.splice(idx, 1);
    selectedGKs = selectedGKs.filter((kid) => kid !== name);
  }
  activeFieldQ = 0;
  swapSelection = null;
  gameLineup = generateLineup();
  saveLineup();
  renderAll();
}

function renderCheckIn() {
  const container = document.getElementById("checkin-view");
  const total = PLAYERS_DEFAULT.length;
  const count = checkedIn.length;
  let html = `<div class="checkin-count">${count} of ${total} checked in</div><div class="checkin-list">`;
  const notChecked = PLAYERS_DEFAULT.map((p) => p.name).filter(
    (n) => !checkedIn.includes(n),
  );
  [...checkedIn, ...notChecked].forEach((name) => {
    const pos = checkedIn.indexOf(name);
    const checked = pos !== -1;
    html += `<div class="checkin-row${checked ? " checked" : ""}" onclick="toggleCheckIn('${name}')">
      <span class="checkin-name">${name}</span>
      ${checked ? `<span class="checkin-num">#${pos + 1}</span>` : ""}
    </div>`;
  });
  html += "</div>";
  if (count < 8) {
    html += `<div class="not-enough-msg">Check in at least 8 players<br>to generate a lineup.</div>`;
  }
  container.innerHTML = html;
}

// ──────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────
function showScreen(id, btn) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
  document
    .querySelectorAll(".nav-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
}

// ──────────────────────────────────────────
// RENDER: QUARTERS LIST
// ──────────────────────────────────────────
function getRoleOrder() {
  return ["GK", "DEF", "STP", "MID", "CMF", "FWD", "SUB"];
}

function renderQuarters() {
  const container = document.getElementById("quarters-list");
  container.innerHTML = "";
  if (!gameLineup) {
    container.innerHTML = `<div class="not-enough-msg">Check in at least 8 players<br>to see the lineup.</div>`;
    return;
  }

  gameLineup.quarters.forEach((quarter, qi) => {
    const card = document.createElement("div");
    card.className = "quarter-card";

    const sorted = [...quarter].sort(
      (a, b) => getRoleOrder().indexOf(a.role) - getRoleOrder().indexOf(b.role),
    );

    let html = `<div class="quarter-title"><span class="q-num">Q${qi + 1}</span> Quarter ${qi + 1}</div>`;
    sorted.forEach((p) => {
      html += `
  <div class="player-row">
    <span class="player-name">${p.name}</span>
    <span class="badge role-${p.role}">${ROLE_LABELS[p.role]}</span>
  </div>`;
    });
    card.innerHTML = html;
    container.appendChild(card);
  });
}

// ──────────────────────────────────────────
// RENDER: FIELD VIEW
// ──────────────────────────────────────────
function renderField() {
  const tabs = document.getElementById("field-tabs");
  tabs.innerHTML = "";
  if (!gameLineup) {
    document.getElementById("field-view").innerHTML =
      `<div class="not-enough-msg">Check in at least 8 players<br>to see the field view.</div>`;
    return;
  }
  [1, 2, 3, 4].forEach((q, i) => {
    const btn = document.createElement("button");
    btn.className = "q-tab" + (i === activeFieldQ ? " active" : "");
    btn.textContent = "Q" + q;
    btn.onclick = () => {
      document
        .querySelectorAll(".q-tab")
        .forEach((t) => t.classList.remove("active"));
      btn.classList.add("active");
      activeFieldQ = i;
      renderFieldForQ(i);
    };
    tabs.appendChild(btn);
  });
  renderFieldForQ(activeFieldQ);
}

function chipHTML(p) {
  return `<div class="player-chip chip-${p.role}">
<span class="chip-role">${p.role}</span>
<span class="chip-name">${p.name}</span>
</div>`;
}

function renderFieldForQ(qi) {
  const q = gameLineup.quarters[qi];
  const formation = getFormationConfig();
  const byRole = Object.fromEntries(
    ["GK", "DEF", "STP", "MID", "CMF", "FWD", "SUB"].map((role) => [
      role,
      q.filter((p) => p.role === role),
    ]),
  );
  const gk = byRole.GK[0];
  const subs = q.filter((p) => p.role === "SUB");
  const rows = formation.fieldRows.map((row) =>
    row.map((role) => byRole[role].shift()).filter(Boolean),
  );

  document.getElementById("field-view").innerHTML = `
<div class="soccer-field">
  <div class="field-label">Opponent's Goal</div>
  <div class="goal-rect top"></div>
  ${rows.map((row) => `<div class="field-row">${row.map(chipHTML).join("")}</div>`).join("")}
  <div class="field-row">${gk ? chipHTML(gk) : ""}</div>
  <div class="goal-rect bottom"></div>
  <div class="field-label">Our Goal</div>
</div>
<div class="bench">
  <h3>On the Bench</h3>
  <div class="bench-players">
    ${subs.map((p) => `<div class="bench-chip">${p.name}</div>`).join("")}
  </div>
</div>`;
}

// ──────────────────────────────────────────
// GAME TABLE SWAP
// ──────────────────────────────────────────
let swapSelection = null;

function selectCell(qi, name) {
  const cell = gameLineup.quarters[qi].find((player) => player.name === name);
  if (cell?.role === "GK") return;
  if (
    swapSelection &&
    swapSelection.quarter === qi &&
    swapSelection.name === name
  ) {
    swapSelection = null;
    renderGame();
    return;
  }
  if (swapSelection && swapSelection.quarter === qi) {
    const q = gameLineup.quarters[qi];
    const a = q.find((p) => p.name === swapSelection.name);
    const b = q.find((p) => p.name === name);
    if (a && b) {
      [a.role, b.role] = [b.role, a.role];
      saveLineup();
    }
    swapSelection = null;
    renderAll();
    return;
  }
  swapSelection = { quarter: qi, name };
  renderGame();
}

function toggleLockQuarter(qi) {
  if (lockedQuarters.has(qi)) {
    lockedQuarters.delete(qi);
  } else {
    lockedQuarters.add(qi);
  }
  saveLineup();
  renderGame();
}

function renderGame() {
  if (!gameLineup) {
    document.getElementById("game-view").innerHTML =
      `<div class="not-enough-msg">Check in at least 8 players<br>to see the game table.</div>`;
    return;
  }
  let html = `<table class="game-table">
<thead><tr>
  <th>Player</th>
  ${[0, 1, 2, 3]
    .map((qi) => {
      const locked = lockedQuarters.has(qi);
      return `<th>Q${qi + 1}<button class="q-lock-btn${locked ? " locked" : ""}" onclick="toggleLockQuarter(${qi})" title="${locked ? "Unlock" : "Lock"} Q${qi + 1}">${locked ? "🔒" : "🔓"}</button></th>`;
    })
    .join("")}
</tr></thead><tbody>`;

  const keeperFirst = [
    ...gameLineup.goalkeepers,
    ...checkedIn.filter((k) => !gameLineup.goalkeepers.includes(k)),
  ];
  keeperFirst.forEach((kid) => {
    const isKeeper = gameLineup.goalkeepers.includes(kid);
    html += `<tr class="${isKeeper ? "is-gk" : ""}">`;
    html += `<td>${kid}${isKeeper ? " 🥅" : ""}</td>`;
    gameLineup.quarters.forEach((q, qi) => {
      const p = q.find((pl) => pl.name === kid);
      const role = p ? p.role : "SUB";
      const isSelected =
        swapSelection &&
        swapSelection.quarter === qi &&
        swapSelection.name === kid;
      const cellClass =
        (role !== "GK" ? " swappable" : "") +
        (isSelected ? " swap-selected" : "");
      const badgeExtra = isSelected ? " selected-swap" : "";
      const click =
        role !== "GK" ? ` onclick="selectCell(${qi},'${kid}')"` : "";
      html += `<td class="${cellClass}"${click}><span class="badge badge-sm role-${role}${badgeExtra}">${role}</span></td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  document.getElementById("game-view").innerHTML = html;
}

// ──────────────────────────────────────────
// RENDER: SUMMARY
// ──────────────────────────────────────────
const ROLE_COLORS = {
  GK: "var(--gk)",
  DEF: "var(--def)",
  STP: "var(--def)",
  MID: "var(--mid)",
  CMF: "var(--mid)",
  FWD: "var(--fwd)",
};

function renderSummary() {
  if (!gameLineup) {
    document.getElementById("summary-view").innerHTML =
      `<div class="not-enough-msg">Check in at least 8 players<br>to see the summary.</div>`;
    return;
  }
  const stats = checkedIn
    .map((kid) => {
      const active = gameLineup.quarters.filter((q) =>
        q.some((p) => p.name === kid && p.role !== "SUB"),
      );
      const positions = active.map((q) => q.find((p) => p.name === kid).role);
      const arrival = checkedIn.indexOf(kid) + 1;
      return { name: kid, count: active.length, positions, arrival };
    })
    .sort((a, b) => a.arrival - b.arrival);

  const keeperSummary = gameLineup.goalkeepers
    .map((kid) => {
      const quarters = gameLineup.goalkeeperByQuarter
        .map((gk, qi) => (gk === kid ? `Q${qi + 1}` : null))
        .filter(Boolean)
        .join(", ");
      return `${kid} (${quarters})`;
    })
    .join(" · ");

  const dots = (positions) =>
    positions
      .map(
        (r) =>
          `<div class="pos-dot" style="background:${ROLE_COLORS[r] || "var(--sub)"};" title="${ROLE_LABELS[r] || r}"></div>`,
      )
      .join("");

  let html = `
    <div class="gk-note">Goalkeeping plan: <strong>${keeperSummary}</strong></div>
<div class="summary-card">
  <div class="summary-col-header"><span>Player</span><span>Quarters</span></div>`;

  stats.forEach(({ name, count, positions, arrival }) => {
    html += `
<div class="summary-row">
  <div>
    <div class="summary-name">${name} <span style="color:var(--text-muted);font-size:0.78rem;font-weight:500;">#${arrival}</span></div>
    <div class="pos-dots">${dots(positions)}</div>
  </div>
  <div class="summary-right">
    <div class="bar-bg"><div class="bar-fill" style="width:${(count / 4) * 100}%"></div></div>
    <span class="play-count">${count}/4</span>
  </div>
</div>`;
  });

  html += "</div>";
  document.getElementById("summary-view").innerHTML = html;
}

// ──────────────────────────────────────────
// RENDER ALL
// ──────────────────────────────────────────
function renderAll() {
  renderCheckIn();
  renderFormationPicker();
  renderCMFPicker();
  renderGKPicker();
  renderField();
  renderGame();
  renderSummary();
}

// ── Init ──
loadLineup();
if (!gameLineup && checkedIn.length >= 8) {
  gameLineup = generateLineup();
  saveLineup();
}
renderAll();
