// --- Global state ---
let lastAbilities = [];
let lastModel = "gpt-4.1-mini";
let viewMode = "cards";
let lastAbilitiesBeforeReroll = null;
let uiComplexityLevel = 1; // 0 = basic, 1 = moderate, 2 = complex

const STORAGE_KEY = "df_ability_sets_v1";

// --- Helper to get checked checkbox values by name ---
function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (el) => el.value
  );
}

// --- Power level description for UI ---
function describePowerLevel(n) {
  const v = Number(n);
  if (v <= 1) return "1 – Trivial / weak";
  if (v === 2) return "2 – Very weak";
  if (v === 3) return "3 – Weak but useful";
  if (v === 4) return "4 – Low-tier, modest impact";
  if (v === 5) return "5 – Standard PC-level ability";
  if (v === 6) return "6 – Strong PC / elite enemy";
  if (v === 7) return "7 – Boss-tier with drawback";
  if (v === 8) return "8 – Very high, near-mythic";
  if (v === 9) return "9 – Mythic-level, encounter-defining";
  return "10 – Godlike, reality-warping with massive drawback";
}

// --- UI complexity (Basic / Moderate / Complex) ---
function applyUIComplexity() {
  const select = document.getElementById("ui-complexity");
  const val = select ? select.value : "moderate";
  const map = { basic: 0, moderate: 1, complex: 2 };
  uiComplexityLevel = map[val] ?? 1;

  document.querySelectorAll("[data-ui-min]").forEach((el) => {
    const required = parseInt(el.dataset.uiMin, 10) || 0;
    el.style.display = uiComplexityLevel >= required ? "" : "none";
  });
}

// --- Build the prompt text from all inputs ---
function buildPrompt() {
  const charName = document.getElementById("char-name").value.trim();
  const charRole = document.getElementById("char-role").value.trim();
  const charTheme = document.getElementById("char-theme").value.trim();
  const charBackstory = document.getElementById("char-backstory").value.trim();

  const effectTypes = getCheckedValues("effectTypes");
  const effectNotes = document.getElementById("effect-notes")?.value.trim() || "";

  const fruitTraits = getCheckedValues("fruitTraits");
  const fruitNotes = document.getElementById("fruit-notes")?.value.trim() || "";

  const styleMods = getCheckedValues("styleMods");
  const styleNotes = document.getElementById("style-notes")?.value.trim() || "";

  const numAbilities =
    parseInt(document.getElementById("num-abilities").value, 10) || 3;
  const formatStyle = document.getElementById("format-style")?.value || "stat-block";
  const mechanicsDetail =
    document.getElementById("mechanics-detail")?.value || "simple";
  const complexityLevel =
    document.getElementById("complexity-level")?.value || "moderate";
  const abilityPackage =
    document.getElementById("ability-package")?.value || "signature";
  const toneEpic = document.getElementById("tone-epic")?.checked ?? true;
  const outputNotes = document.getElementById("output-notes")?.value.trim() || "";
  const modelChoice = document.getElementById("model-choice")?.value || "gpt-4.1-mini";
  const preferredDc = document.getElementById("preferred-dc")?.value.trim() || "";
  const powerLevel =
    parseInt(document.getElementById("power-level").value, 10) || 6;

  const comboFocusChecks = Array.from(
    document.querySelectorAll('input[name="comboFocus"]:checked')
  ).map((el) => el.value);

  const includeComboExplanation = document.getElementById(
    "include-combo-explanation"
  )?.checked;

  const lines = [];

  lines.push(
    "Create " +
      numAbilities +
      " original, devil-fruit-based abilities for a One Piece–inspired DnD campaign."
  );
  lines.push("");

  lines.push("=== Character Context ===");
  lines.push(`Name: ${charName || "Unnamed PC"}`);
  if (charRole) lines.push(`Combat Role: ${charRole}`);
  if (charTheme)
    lines.push(`Theme / Vibe / Devil Fruit Focus: ${charTheme}`);
  if (charBackstory) lines.push(`Backstory / Notes: ${charBackstory}`);
  lines.push("");

  lines.push("=== Effect Types ===");
  lines.push(
    "Desired effect categories: " +
      (effectTypes.length ? effectTypes.join(", ") : "Use whatever fits best.")
  );
  if (effectNotes) lines.push(`Extra effect guidance: ${effectNotes}`);
  lines.push("");

  lines.push("=== Devil Fruit Types ===");
  lines.push(
    "Fruit type categories involved: " +
      (fruitTraits.length ? fruitTraits.join(", ") : "Any fruit types that fit the concept.")
  );
  if (fruitNotes) lines.push(`Extra fruit combo notes: ${fruitNotes}`);
  lines.push("");

  lines.push("=== Desired Outcome / Ability Shape ===");
  lines.push(
    "High-level outcomes / shapes desired: " +
      (styleMods.length ? styleMods.join(", ") : "Any shape that feels cool and thematic.")
  );
  if (styleNotes) lines.push(`Outcome / effect notes: ${styleNotes}`);
  if (toneEpic) {
    lines.push(
      "Tone: Epic, shonen-anime style, cinematic, but still readable at the table in a few seconds."
    );
  }
  lines.push("");

  lines.push("=== Combo Focus ===");
  if (comboFocusChecks.length) {
    lines.push("Combo style selections: " + comboFocusChecks.join(", "));
  } else {
    lines.push("Combo style: Any combination style that fits thematically.");
  }
  if (includeComboExplanation) {
    lines.push(
      "For each ability, include a short 'combo_logic' note in the JSON explaining how the fruits/powers interact mechanically and visually."
    );
  }
  lines.push("");

  lines.push("=== Output Style Preferences ===");
  lines.push(
    "Number of abilities: " +
      numAbilities +
      ". Each ability MUST include: (1) Ability Name, (2) Role, (3) Summary, (4) Cinematic Description, (5) Simple DnD mechanics."
  );

  // Ability package
  if (abilityPackage === "signature") {
    lines.push("Ability package: 3 Signature Moves. Build a set of iconic moves.");
  } else if (abilityPackage === "finisher") {
    lines.push(
      "Ability package: 1 Ultimate Finisher. One huge, high-impact move with a major drawback."
    );
  } else if (abilityPackage === "defense-mobility") {
    lines.push(
      "Ability package: 1 Defensive Reaction + 1 Mobility Tool. Two complementary moves."
    );
  } else if (abilityPackage === "full-kit") {
    lines.push("Ability package: A Full Kit (4–5 diverse abilities).");
  }

  if (formatStyle === "stat-block") {
    lines.push("Presentation: DnD style compact stat block.");
  } else if (formatStyle === "minimal") {
    lines.push("Presentation: Short minimal descriptions.");
  } else if (formatStyle === "cinematic") {
    lines.push("Presentation: More cinematic/flavorful.");
  }

  lines.push(
    "Mechanics detail preference: " +
      (mechanicsDetail === "simple"
        ? "Simple / lightweight mechanics."
        : "Detailed mechanics including scaling and conditions.")
  );

  if (complexityLevel === "simple") {
    lines.push("Complexity preference: Simple, no multi-stage effects.");
  } else if (complexityLevel === "moderate") {
    lines.push("Complexity preference: Moderate tracking allowed.");
  } else {
    lines.push("Complexity preference: Complex / multi-stage is allowed.");
  }

  lines.push("Preferred model: " + modelChoice);
  lines.push(
    "Preferred DC: " +
      (preferredDc || "Choose based on power level")
  );

  lines.push(
    "Desired power level (1–10): " +
      powerLevel +
      ". Higher power should increase DC, area, damage, impact, and drawback severity."
  );

  if (outputNotes) {
    lines.push(`Additional output constraints: ${outputNotes}`);
  }

  lines.push("");
  lines.push("=== Power Level Mechanics Ladder (IMPORTANT) ===");
  lines.push(
    "Use this ladder to scale DC, damage, area, effects, and drawbacks."
  );
  lines.push("1: DC 4–6...");
  lines.push("2: DC 6–7...");
  lines.push("3: DC 7–9...");
  lines.push("4: DC 9–11...");
  lines.push("5: DC 11–13...");
  lines.push("6: DC 13–16...");
  lines.push("7: DC 16–20...");
  lines.push("8: DC 20–23...");
  lines.push("9: DC 24–28...");
  lines.push("10: DC 26–32...");
  lines.push("");

  lines.push("=== Mechanics Requirements (IMPORTANT) ===");
  lines.push("- Must use clear DnD-like action economy.");
  lines.push("- Keep effects readable (no paragraphs).");
  lines.push("- Must match the power level.");
  lines.push("- Must include a role tag for each ability.");
  lines.push("");

  lines.push("=== Output JSON Format (REQUIRED) ===");
  lines.push(`
{
  "abilities": [
    {
      "name": "Ability Name",
      "role": "Offense / Defense / Support / Control / Utility / Finisher",
      "summary": "1-line summary.",
      "description": "Short cinematic description.",
      "combo_logic": "Optional short explanation.",
      "mechanics": {
        "action_type": "",
        "range": "",
        "target": "",
        "save": "",
        "dc": "",
        "damage": "",
        "effect": ""
      }
    }
  ]
}
  `);
  lines.push("Return ONLY valid JSON.");

  return lines.join("\n");
}

// Update preview
function updatePromptPreview() {
  const prompt = buildPrompt();
  const preview = document.getElementById("prompt-preview");
  if (preview) preview.value = prompt;
}

// --- Rendering Abilities (cards + table) ---
function renderCards(abilities, powerLevel) {
  const resultsBox = document.getElementById("results");
  if (!resultsBox) return;

  resultsBox.innerHTML = "";
  resultsBox.classList.add("ability-grid");

  abilities.forEach((ability, index) => {
    const card = document.createElement("div");
    card.className = "ability-card";

    const header = document.createElement("div");
    header.className = "ability-card-header";

    const title = document.createElement("div");
    title.className = "ability-card-title";
    title.textContent = ability.name || `Ability ${index + 1}`;

    const tag = document.createElement("div");
    tag.className = "ability-card-tag";
    const roleText = ability.role ? String(ability.role) : "";
    tag.textContent =
      describePowerLevel(powerLevel) + (roleText ? " · " + roleText : "");

    header.appendChild(title);
    header.appendChild(tag);

    // Summary
    const summary = document.createElement("div");
    summary.className = "ability-card-summary";
    summary.textContent =
      ability.summary ||
      "No summary provided — consider adding a brief one-line explanation.";

    // Description
    const description = document.createElement("div");
    description.className = "ability-card-description";
    description.textContent = ability.description || "No description provided.";

    // Mechanics
    const mech = ability.mechanics || {};
    const mechContainer = document.createElement("div");
    mechContainer.className = "ability-card-mech";

    function addMechItem(label, value) {
      const item = document.createElement("div");
      item.className = "ability-card-mech-item";

      const lbl = document.createElement("div");
      lbl.className = "ability-card-mech-label";
      lbl.textContent = label;

      const val = document.createElement("div");
      val.className = "ability-card-mech-value";
      val.textContent = value || "-";

      item.appendChild(lbl);
      item.appendChild(val);
      mechContainer.appendChild(item);
    }

    addMechItem("Action", mech.action_type);
    addMechItem("Range", mech.range);
    addMechItem("Target", mech.target);
    addMechItem("Save", mech.save);
    addMechItem("DC", mech.dc);
    addMechItem("Damage", mech.damage);
    addMechItem("Effect", mech.effect);

    card.appendChild(header);
    card.appendChild(summary);
    card.appendChild(description);
    card.appendChild(mechContainer);

    if (ability.combo_logic) {
      const comboLogic = document.createElement("div");
      comboLogic.className = "ability-card-combo-logic";
      comboLogic.textContent = "Combo logic: " + ability.combo_logic;
      card.appendChild(comboLogic);
    }

    const actions = document.createElement("div");
    actions.className = "ability-card-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "chip small";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () =>
      copySingleAbility(ability, powerLevel)
    );

    const rerollBtn = document.createElement("button");
    rerollBtn.className = "chip small";
    rerollBtn.textContent = "Reroll";
    rerollBtn.title =
      "Reroll = new ability with the same inputs & power level, but a different idea.";
    rerollBtn.addEventListener("click", () => rerollAbility(index));

    actions.appendChild(copyBtn);
    actions.appendChild(rerollBtn);

    card.appendChild(actions);

    resultsBox.appendChild(card);
  });
}

function renderTable(abilities, powerLevel) {
  const resultsBox = document.getElementById("results");
  if (!resultsBox) return;

  resultsBox.innerHTML = "";
  resultsBox.classList.remove("ability-grid");

  const table = document.createElement("table");
  table.className = "results-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  ["Name", "Power", "Role", "Action", "Range", "DC", "Damage", "Effect"].forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  abilities.forEach((ability) => {
    const mech = ability.mechanics || {};
    const row = document.createElement("tr");

    function addCell(text) {
      const td = document.createElement("td");
      td.textContent = text || "-";
      row.appendChild(td);
    }

    addCell(ability.name || "");
    addCell(describePowerLevel(powerLevel));
    addCell(ability.role || "");
    addCell(mech.action_type || "");
    addCell(mech.range || "");
    addCell(mech.dc || "");
    addCell(mech.damage || "");
    addCell(mech.effect || ability.summary || "");

    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  resultsBox.appendChild(table);
}

function renderAbilitiesView() {
  const powerLevel =
    parseInt(document.getElementById("power-level").value, 10) || 6;

  if (!lastAbilities || lastAbilities.length === 0) {
    const resultsBox = document.getElementById("results");
    if (resultsBox) {
      resultsBox.classList.remove("ability-grid");
      resultsBox.innerHTML =
        '<p class="hint">No abilities to show yet. Generate some first.</p>';
    }
    return;
  }

  if (viewMode === "table") {
    renderTable(lastAbilities, powerLevel);
  } else {
    renderCards(lastAbilities, powerLevel);
  }
}

// --- Copy helpers ---
function formatAbilityText(ability, powerLevel) {
  const mech = ability.mechanics || {};
  const roleText = ability.role ? `Role: ${ability.role}\n` : "";
  const comboText = ability.combo_logic ? `Combo logic: ${ability.combo_logic}\n` : "";
  return (
    `[${ability.name || "Unnamed Ability"}] – ${describePowerLevel(
      powerLevel
    )}\n` +
    roleText +
    `Action: ${mech.action_type || "-"} | Range: ${mech.range || "-"} | Target: ${
      mech.target || "-"
    }\n` +
    `Save: ${mech.save || "-"} | DC: ${mech.dc || "-"} | Damage: ${
      mech.damage || "-"
    }\n` +
    `Effect: ${mech.effect || "-"}\n` +
    comboText +
    (ability.description ? `Description: ${ability.description}\n` : "")
  );
}

function copySingleAbility(ability, powerLevel) {
  const text = formatAbilityText(ability, powerLevel);
  navigator.clipboard?.writeText(text).catch(() => {});
}

function copyAllAbilities() {
  const powerLevel =
    parseInt(document.getElementById("power-level").value, 10) || 6;
  if (!lastAbilities.length) return;

  const blocks = lastAbilities.map((a) => formatAbilityText(a, powerLevel));
  const text = blocks.join("\n------------------------------\n\n");
  navigator.clipboard?.writeText(text).catch(() => {});
}

// --- Download stat sheet as .txt ---
function downloadStatSheet() {
  const powerLevel =
    parseInt(document.getElementById("power-level").value, 10) || 6;
  if (!lastAbilities.length) return;

  const blocks = lastAbilities.map((a) => formatAbilityText(a, powerLevel));
  const text = blocks.join("\n------------------------------\n\n");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "devil-fruit-abilities.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Saved sets (localStorage databank) ---
function loadSavedSetsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSetsToStorage(sets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {}
}

function refreshSavedSetsDropdown() {
  const select = document.getElementById("load-set-select");
  if (!select) return;

  const sets = loadSavedSetsFromStorage();
  select.innerHTML = '<option value="">Load saved set…</option>';

  sets.forEach((set) => {
    const opt = document.createElement("option");
    opt.value = String(set.id);
    opt.textContent = set.name;
    select.appendChild(opt);
  });
}

function handleSaveSet() {
  if (!lastAbilities.length) return;

  const name = prompt("Name this ability set:");
  if (!name) return;

  const powerLevel =
    parseInt(document.getElementById("power-level").value, 10) || 6;

  const sets = loadSavedSetsFromStorage();
  const newSet = {
    id: Date.now(),
    name,
    abilities: lastAbilities,
    powerLevel
  };
  sets.push(newSet);
  saveSetsToStorage(sets);
  refreshSavedSetsDropdown();
}

function handleLoadSet() {
  const select = document.getElementById("load-set-select");
  if (!select) return;

  const id = select.value;
  if (!id) return;

  const sets = loadSavedSetsFromStorage();
  const set = sets.find((s) => String(s.id) === id);
  if (!set) return;

  lastAbilities = set.abilities || [];
  const powerInput = document.getElementById("power-level");
  if (powerInput && set.powerLevel) {
    powerInput.value = set.powerLevel;
    const display = document.getElementById("power-level-display");
    if (display) {
      display.textContent = describePowerLevel(set.powerLevel);
    }
  }

  renderAbilitiesView();
}

function handleDeleteSet() {
  const select = document.getElementById("load-set-select");
  if (!select) return;

  const id = select.value;
  if (!id) return;

  const sets = loadSavedSetsFromStorage();
  const remaining = sets.filter((s) => String(s.id) !== id);
  saveSetsToStorage(remaining);
  refreshSavedSetsDropdown();
  select.value = "";
}

// --- Reroll a single ability ---
async function rerollAbility(index) {
  if (!lastAbilities.length) return;

  const promptBase = buildPrompt();
  const powerLevel =
    parseInt(document.getElementById("power-level").value, 10) || 6;

  const otherNames = lastAbilities
    .map((a, i) => (i === index ? null : a.name || `Ability ${i + 1}`))
    .filter(Boolean)
    .join(", ");

  const rerollPrompt =
    promptBase +
    "\n\n=== REROLL REQUEST ===\n" +
    "Ignore the earlier instruction about the number of abilities.\n" +
    "Generate EXACTLY 1 new ability in the JSON 'abilities' array.\n" +
    "It must match the same character, fruit types, effect types, outcome preferences, and power level (" +
    powerLevel +
    ").\n" +
    (otherNames
      ? "It must be distinct from these existing abilities: " + otherNames + ".\n"
      : "") +
    "Follow the same JSON output format as specified above.";

  const statusText = document.getElementById("status-text");
  if (statusText) statusText.textContent = "Rerolling ability " + (index + 1) + "...";

  lastAbilitiesBeforeReroll = lastAbilities.map((a) => ({
    ...a,
    mechanics: { ...(a.mechanics || {}) }
  }));

  const undoBtn = document.getElementById("undo-reroll-btn");
  if (undoBtn) undoBtn.disabled = true;

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: rerollPrompt, model: lastModel })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const raw = data.result || "";

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse JSON on reroll.", e);
      return;
    }

    if (parsed && Array.isArray(parsed.abilities) && parsed.abilities[0]) {
      lastAbilities[index] = parsed.abilities[0];
      renderAbilitiesView();
      if (statusText) statusText.textContent = "Done.";
      if (undoBtn) undoBtn.disabled = false;
    }
  } catch (err) {
    console.error(err);
    if (statusText) {
      statusText.textContent =
        "Error on reroll: " + (err && err.message ? err.message : "Unknown error");
    }
  }
}

// --- Undo last reroll ---
function undoLastReroll() {
  if (!lastAbilitiesBeforeReroll) return;
  lastAbilities = lastAbilitiesBeforeReroll;
  lastAbilitiesBeforeReroll = null;
  const undoBtn = document.getElementById("undo-reroll-btn");
  if (undoBtn) undoBtn.disabled = true;
  renderAbilitiesView();
}

// --- Randomizer helpers ---
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(array) {
  return array[randomInt(0, array.length - 1)];
}

function randomSample(array, count) {
  const copy = [...array];
  const out = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = randomInt(0, copy.length - 1);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function randomizeInputs() {
  // optional: simple random theme/role
  const roles = [
    "Frontline bruiser",
    "Sniper",
    "Support caster",
    "Agile skirmisher",
    "Tank",
    "Battlefield controller"
  ];

  const themes = [
    "Red lightning",
    "Sandstorm titan",
    "Molten magma core",
    "Crystalline ice beast",
    "Soul lantern reaper",
    "Shattered glass serpent",
    "Temporal fracture",
    "Vortex gravity spiral",
    "Static tempest aura",
    "Abyssal ink hydra",
    "Thunder god's pulse",
    "Spectral mirror shard",
    "Iron cyclone",
    "Void distortion field",
    "Corrosion mist bloom",
    "Solar flare bloom",
    "Phantom chain ghostfire",
    "Obsidian horn leviathan",
    "Blood-forge titan",
    "Echo rift avatar",
    "Night-wisp swarm",
    "Ember-scale phoenix",
    "Blight bramble warden",
    "Geomantic quake fist",
    "Hollow puppet strings",
    "Star-pulse beam",
    "Frost-fang predator",
    "Neon plasma shredder",
    "Razor-tide shark spirit",
    "Astral compression aura",
    "Venom aurora spiral",
    "Eclipse dragon shell",
    "Living whirlpool core",
    "Tidal geyser breaker",
    "Toxic orchid bloom",
    "Bio-circuit override",
    "Marble golem heart",
    "Steam locomotive beast",
    "Wireframe spectra",
    "Bone-forge architect",
    "Demon-fruit mimicry",
    "Dark-matter eruption",
    "Solar halo dancer",
    "Rotwood bloom titan",
    "Star serpent conduit",
    "Hurricane jet raptor",
    "Fractured reality stitch",
    "Shadow forge armor",
    "Arc reactor pulse",
    "Moonlit blade phantom",
    "Polar aurora wolf",
    "Verdant overgrowth tyrant",
    "Oblivion wave channeler",
    "Sand glass chronos",
    "Storm-forge leviathan",
    "Crystal bloom oracle",
    "Electric railgun body",
    "Volcanic iron hound",
    "Dream-veil entity",
    "Mist reaper harrow",
    "Warped spatial coil",
    "Spectral thunder bow",
    "Particle blender core",
    "Plasma fang tiger",
    "Sun-flare knight",
    "Marionette bloom husk",
    "Prism breaker siege",
    "Seismic knuckle beast",
    "Flowing ink phantom",
    "Shatter-pulse brute",
    "Starborn reef golem",
    "Rune-forge brawler",
    "Ozone wing raptor",
    "Dread-coil chimera",
    "Sky-swallow dragon",
    "Ferrite storm sentinel",
    "Cosmic scream idol",
    "Astral bloom artist",
    "Fission lariat form",
    "Photon burst striker",
    "Ether-thread stalker",
    "Revenant ember wolf",
    "Bone-storm raider",
    "Gale-glass striker",
    "Fracture wraithling",
    "Thunder lotus titan",
    "Verdant swarm prowler",
    "Nebula tendril wyrm",
    "Blizzard armor shaman",
    "Inferno-chisel avatar",
    "Lightning spool runner",
    "Anvil-spirit breaker",
    "Warp-coil panther",
    "Frost-flare chimera",
    "Specter lantern tiger",
    "Techno-pulse djinn",
    "Magnetic storm shell",
    "Soul-forge arbiter",
    "Aerial cyclone caller",
    "Hallowed mirror beast"
  ];

  const charRole = document.getElementById("char-role");
  const charTheme = document.getElementById("char-theme");
  if (charRole) charRole.value = randomChoice(roles);
  if (charTheme) charTheme.value = randomChoice(themes);

  // Effect types
  const effectInputs = Array.from(
    document.querySelectorAll('input[name="effectTypes"]')
  );
  effectInputs.forEach((el) => (el.checked = false));
  randomSample(effectInputs, randomInt(1, 3)).forEach((el) => (el.checked = true));

  // Fruit traits
  const fruitInputs = Array.from(
    document.querySelectorAll('input[name="fruitTraits"]')
  );
  fruitInputs.forEach((el) => (el.checked = false));
  randomSample(fruitInputs, randomInt(1, 3)).forEach((el) => (el.checked = true));

  // Style mods (only if moderate+)
  if (uiComplexityLevel >= 1) {
    const styleInputs = Array.from(
      document.querySelectorAll('input[name="styleMods"]')
    );
    styleInputs.forEach((el) => (el.checked = false));
    randomSample(styleInputs, randomInt(1, 3)).forEach((el) => (el.checked = true));
  }

  // Combo focus (multi-select)
  const comboChecks = document.querySelectorAll('input[name="comboFocus"]');
  comboChecks.forEach((el) => (el.checked = false));
  const options = ["any", "single", "combo", "transformation", "awakening"];
  const chosen = randomSample(options, randomInt(1, 3));
  comboChecks.forEach((el) => {
    if (chosen.includes(el.value)) el.checked = true;
  });

  // Number of abilities + package type
  const numInput = document.getElementById("num-abilities");
  const packageSelect = document.getElementById("ability-package");
  if (numInput && packageSelect) {
    const packages = ["signature", "finisher", "defense-mobility", "full-kit"];
    const pkg = randomChoice(packages);
    packageSelect.value = pkg;

    let n = 3;
    if (pkg === "finisher") n = 1;
    else if (pkg === "defense-mobility") n = 2;
    else if (pkg === "full-kit") n = randomInt(4, 5);
    else n = randomInt(2, 4);

    numInput.value = n;
  }

  // Output style (moderate+)
  const styleSelect = document.getElementById("format-style");
  if (styleSelect && uiComplexityLevel >= 1) {
    const opts = ["stat-block", "minimal", "cinematic"];
    styleSelect.value = randomChoice(opts);
  }

  // Mechanics detail + ability complexity
  const mechDetail = document.getElementById("mechanics-detail");
  const complexitySelect = document.getElementById("complexity-level");
  if (mechDetail && uiComplexityLevel >= 1) {
    mechDetail.value = randomChoice(["simple", "detailed"]);
  }
  if (complexitySelect && uiComplexityLevel >= 1) {
    complexitySelect.value = randomChoice(["simple", "moderate", "complex"]);
  }

  // Tone epic
  const toneEpic = document.getElementById("tone-epic");
  if (toneEpic && uiComplexityLevel >= 1) {
    toneEpic.checked = true;
  }

  // Model choice (complex only)
  const modelChoice = document.getElementById("model-choice");
  if (modelChoice && uiComplexityLevel >= 2) {
    const models = ["gpt-4.1-mini", "gpt-4.1", "gpt-5.1"];
    modelChoice.value = randomChoice(models);
  }

  updatePromptPreview();
}

// --- Attach listeners (DOM Ready) ---
document.addEventListener("DOMContentLoaded", () => {
  // Apply UI complexity
  applyUIComplexity();

  const uiComplexSelect = document.getElementById("ui-complexity");
  if (uiComplexSelect) {
    uiComplexSelect.addEventListener("change", () => {
      applyUIComplexity();
      updatePromptPreview();
    });
  }

  // --- FIXED POWER LEVEL INPUT (mobile friendly) ---
  const powerInput = document.getElementById("power-level");
  const powerDisplay = document.getElementById("power-level-display");

  if (powerInput && powerDisplay) {
    const updatePowerUI = () => {
      const raw = powerInput.value;

      // Allow empty on mobile while typing
      if (raw === "") {
        powerDisplay.textContent = "Choose a power level (1–10)";
        updatePromptPreview();
        return;
      }

      let val = parseInt(raw, 10);
      if (Number.isNaN(val)) return;

      if (val > 10) val = 10;
      if (val < 1) val = 1;

      powerInput.value = String(val);
      powerDisplay.textContent = describePowerLevel(val);
      updatePromptPreview();
    };

    // Initial display text
    powerDisplay.textContent = describePowerLevel(powerInput.value || 6);

    powerInput.addEventListener("input", updatePowerUI);
    powerInput.addEventListener("change", updatePowerUI);
  }

  // Initial prompt
  updatePromptPreview();

  // Rebuild prompt on input changes
  const inputs = document.querySelectorAll("input, textarea, select");
  inputs.forEach((el) => {
    el.addEventListener("input", updatePromptPreview);
    el.addEventListener("change", updatePromptPreview);
  });

  // View toggle
  const cardsBtn = document.getElementById("view-cards-btn");
  const tableBtn = document.getElementById("view-table-btn");
  if (cardsBtn && tableBtn) {
    cardsBtn.addEventListener("click", () => {
      viewMode = "cards";
      cardsBtn.classList.add("active");
      tableBtn.classList.remove("active");
      renderAbilitiesView();
    });
    tableBtn.addEventListener("click", () => {
      viewMode = "table";
      tableBtn.classList.add("active");
      cardsBtn.classList.remove("active");
      renderAbilitiesView();
    });
  }

  // Buttons
  const copyAllBtn = document.getElementById("copy-all-btn");
  if (copyAllBtn) {
    copyAllBtn.addEventListener("click", copyAllAbilities);
  }

  const downloadTxtBtn = document.getElementById("download-txt-btn");
  if (downloadTxtBtn) {
    downloadTxtBtn.addEventListener("click", downloadStatSheet);
  }

  const printBtn = document.getElementById("print-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  const undoBtn = document.getElementById("undo-reroll-btn");
  if (undoBtn) undoBtn.addEventListener("click", undoLastReroll);

  const randomizeBtn = document.getElementById("randomize-btn");
  if (randomizeBtn) randomizeBtn.addEventListener("click", randomizeInputs);

  // Saved sets
  refreshSavedSetsDropdown();

  const saveSetBtn = document.getElementById("save-set-btn");
  if (saveSetBtn) saveSetBtn.addEventListener("click", handleSaveSet);

  const loadSetSelect = document.getElementById("load-set-select");
  if (loadSetSelect) loadSetSelect.addEventListener("change", handleLoadSet);

  const deleteSetBtn = document.getElementById("delete-set-btn");
  if (deleteSetBtn) deleteSetBtn.addEventListener("click", handleDeleteSet);

  // Generate button
  const generateBtn = document.getElementById("generate-btn");
  const statusText = document.getElementById("status-text");

  if (!generateBtn) return;

  generateBtn.addEventListener("click", async () => {
    const prompt = buildPrompt();
    document.getElementById("prompt-preview").value = prompt;

    const modelChoice = document.getElementById("model-choice")?.value || "gpt-4.1-mini";
    lastModel = modelChoice;

    if (statusText) statusText.textContent = "Generating abilities...";

    const resultsBox = document.getElementById("results");
    if (resultsBox) {
      resultsBox.classList.remove("ability-grid");
      resultsBox.textContent = "";
    }

    lastAbilitiesBeforeReroll = null;
    const undoBtnInner = document.getElementById("undo-reroll-btn");
    if (undoBtnInner) undoBtnInner.disabled = true;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt, model: modelChoice })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const raw = data.result || "";

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to parse JSON abilities.", e);
      }

      if (parsed && Array.isArray(parsed.abilities)) {
        lastAbilities = parsed.abilities;
        renderAbilitiesView();
      } else {
        if (resultsBox) {
          resultsBox.classList.remove("ability-grid");
          resultsBox.textContent =
            raw || "(No text returned from API, and no abilities parsed.)";
        }
      }

      if (statusText) statusText.textContent = "Done.";
    } catch (err) {
      console.error(err);
      if (statusText) statusText.textContent = "Error.";
      const resultsBox2 = document.getElementById("results");
      if (resultsBox2) {
        resultsBox2.classList.remove("ability-grid");
        resultsBox2.textContent =
          "Error from API: " +
          (err && err.message ? err.message : "Unknown error");
      }
    }
  });
});
