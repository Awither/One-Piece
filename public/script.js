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

  const comboFocusValues = getCheckedValues("comboFocus");
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
  if (charTheme) lines.push(`Theme / Vibe / Devil Fruit: ${charTheme}`);
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
  if (!comboFocusValues.length) {
    lines.push(
      "Combo style: Any combination style that feels thematically cool and appropriate for the chosen fruits."
    );
  } else {
    lines.push(
      "Combo styles to emphasize: " + comboFocusValues.join(", ") + "."
    );
    const comboDescriptions = [];
    if (comboFocusValues.includes("single")) {
      comboDescriptions.push(
        "Single-fruit techniques should feel like advanced or awakened uses of one core fruit."
      );
    }
    if (comboFocusValues.includes("combo")) {
      comboDescriptions.push(
        "Multi-fruit combo techniques should clearly showcase how multiple fruits or power sources interact in one move."
      );
    }
    if (comboFocusValues.includes("transformation")) {
      comboDescriptions.push(
        "Transformation mode should emphasize Zoan / hybrid forms, physicality, and powers expressed through that form."
      );
    }
    if (comboFocusValues.includes("awakening")) {
      comboDescriptions.push(
        "Environmental awakening should reshape terrain, environment, and battlefield space using the fruit powers."
      );
    }
    comboDescriptions.forEach((l) => lines.push(l));
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

  // Ability package description
  if (abilityPackage === "signature") {
    lines.push(
      "Ability package: 3 Signature Moves. Design a small set of iconic abilities that represent this character’s style. Try to cover different roles (offense, defense, mobility, etc.) where appropriate."
    );
  } else if (abilityPackage === "finisher") {
    lines.push(
      "Ability package: 1 Ultimate Finisher. Focus on a single, extremely memorable, high-impact move that can end or define an encounter, with a major drawback."
    );
  } else if (abilityPackage === "defense-mobility") {
    lines.push(
      "Ability package: 1 Defensive Reaction + 1 Mobility Tool. One ability should be clearly defensive or reactive; the other should help reposition, escape, or engage."
    );
  } else if (abilityPackage === "full-kit") {
    lines.push(
      "Ability package: A Full Kit (4–5 diverse abilities). Provide a mix of offense, defense, control, and/or utility so the character feels complete in combat."
    );
  }

  if (formatStyle === "stat-block") {
    lines.push(
      "Presentation preference: mechanics should read like a clear DnD 5e spell or feature — compact but structured and easy to scan."
    );
  } else if (formatStyle === "minimal") {
    lines.push(
      "Presentation preference: very minimal quick reference. Keep descriptions tight and avoid long paragraphs."
    );
  } else if (formatStyle === "cinematic") {
    lines.push(
      "Presentation preference: a bit more descriptive and cinematic, but still with clearly separated mechanics."
    );
  }

  lines.push(
    "Mechanics detail preference: " +
      (mechanicsDetail === "simple"
        ? "Simple: include action type, range, saving throw (if any), basic damage, and 1–2 core effects."
        : "Detailed: include action type, range, save, damage/scaling ideas, and any conditions or special rules.")
  );

  if (complexityLevel === "simple") {
    lines.push(
      "Complexity preference: Simple. Avoid multi-stage turns, stacking conditions, or tracking more than one resource or ongoing state per ability."
    );
  } else if (complexityLevel === "moderate") {
    lines.push(
      "Complexity preference: Moderate. You may include short-duration riders or simple conditions, but keep tracking light and easy to remember."
    );
  } else if (complexityLevel === "complex") {
    lines.push(
      "Complexity preference: Complex. You may include multi-stage effects, transformations, or lingering zones, but keep rules readable and avoid excessive bookkeeping."
    );
  }

  lines.push("Preferred model: " + modelChoice + " (used by the backend, if available).");

  lines.push(
    "Preferred DC: " +
      (preferredDc
        ? preferredDc +
          " (treat this as a target; you may adjust ±1–2 based on power level and effect, but stay near this unless you have a strong reason)."
        : "No fixed DC specified; choose DCs appropriate for the power level rating below.")
  );

  lines.push(
    "Desired power level (1–10): " +
      powerLevel +
      " where 1 = trivial/weak and 10 = godlike, reality-warping with massive drawbacks. Damage, DCs, area, conditions, and drawbacks must clearly scale with this rating."
  );

  if (outputNotes) {
    lines.push(`Additional output constraints: ${outputNotes}`);
  }

  lines.push("");
  lines.push("=== Power Level Mechanics Ladder (IMPORTANT) ===");
  lines.push(
    "Use this ladder as your primary guide for DC, damage, area, effects, and drawbacks. Do not downgrade high power levels to feel 'balanced' — they can be broken on purpose if drawbacks are appropriate."
  );
  lines.push("");
  lines.push(
    "1: DC 4–6. Very weak / trivial. 0–1 die or tiny effect. Mostly utility or soft flavor. No real drawback."
  );
  lines.push(
    "2: DC 6–7. Very weak but noticeable. 1–2 dice or a light debuff. Small area or single target. No real drawback."
  );
  lines.push(
    "3: DC 7–9. Weak but useful. 1–2 dice + minor rider or small control. Still feels like a low-impact trick."
  );
  lines.push(
    "4: DC 9–11. Low-tier solid move. 2–3 dice, small area or moderate utility. Could be a secondary attack option."
  );
  lines.push(
    "5: DC 11–13. Standard PC-level ability. 3–4 dice, clear and reliable effect. Good mainline combat option."
  );
  lines.push(
    "6: DC 13–16. Strong PC / elite enemy move. 4–5 dice or strong control in a modest area. No or light drawback."
  );
  lines.push(
    "7: DC 16–20. Boss-tier. 6–8 dice OR strong control in a decent area. Must include a meaningful drawback (HP cost, limited uses, self-debuff, etc.)."
  );
  lines.push(
    "8: DC 20–23. Very high, near-mythic. 8–10+ dice OR large area with strong conditions (stun, restrain, banish) or powerful battlefield control. Serious drawback is required."
  );
  lines.push(
    "9: DC 24–28. Mythic-level. May deal 100+ total damage across targets, combine multiple damage types and conditions, and create lasting hazards or terrain changes. Heavy drawback (HP or max HP cost, exhaustion, huge cooldown, chance of backfiring)."
  );
  lines.push(
    "10: DC 26–32. Godlike, shonen finisher. Encounter- or arc-defining. Massive or arena-scale area, multiple stages of damage, multiple conditions and long-lasting or semi-permanent battlefield impact. Damage can be extremely high (hundreds), but there must be a massive drawback (severe HP drain, permanent scar, once-per-arc usage, risk of losing control, etc.)."
  );

  lines.push("");
  lines.push("=== Mechanics Requirements (IMPORTANT) ===");
  lines.push(
    "- Use a DnD 5e-like structure (actions/bonus actions, saves, ranges, damage dice) but do not overcomplicate rules."
  );
  lines.push(
    "- Keep everything usable at the table: avoid walls of text, avoid complex tracking (no deep resource systems)."
  );
  lines.push("- Keep everything roughly at level 10–15 baseline, then scale intensity using the power ladder.");
  lines.push(
    "- Your #1 priority: mechanics (DC, damage, area, conditions, drawbacks) must visibly match the chosen power level."
  );
  lines.push(
    "- For each ability, explicitly assign a mechanical role field (Offense, Defense, Support, Control, Utility, Finisher, or hybrid tags like Offense/Control)."
  );
  lines.push("");

  lines.push("=== Output JSON Format (VERY IMPORTANT) ===");
  lines.push(
    "Respond ONLY with valid JSON in this exact structure, with no extra text before or after:"
  );
  lines.push(`
{
  "abilities": [
    {
      "name": "Ability Name",
      "role": "Offense, Defense, Support, Control, Utility, Finisher, etc.",
      "summary": "One-line summary of what the ability does.",
      "description": "Cinematic but concise description of how it looks and feels.",
      "combo_logic": "Optional short explanation of how the fruits/powers interact (include this if requested).",
      "mechanics": {
        "action_type": "Action, Bonus Action, Reaction, etc.",
        "range": "Range and area of effect.",
        "target": "Who or what is affected.",
        "save": "Saving throw type, if any (e.g. Dex save).",
        "dc": "Typical DC or formula (e.g. 16 or 8 + proficiency + ability modifier).",
        "damage": "Damage dice and type, if any.",
        "effect": "Main mechanical effect(s) in 1–2 sentences."
      }
    }
  ]
}`);
  lines.push(
    "Make sure it is valid JSON. Do NOT include any commentary or Markdown, only the JSON object."
  );

  return lines.join("\n");
}

// Update the preview textarea
function updatePromptPreview() {
  const prompt = buildPrompt();
  const preview = document.getElementById("prompt-preview");
  if (preview) {
    preview.value = prompt;
  }
}

// --- Rendering ---

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
    tag.textContent = describePowerLevel(powerLevel) + (roleText ? " · " + roleText : "");

    header.appendChild(title);
    header.appendChild(tag);

    const summary = document.createElement("div");
    summary.className = "ability-card-summary";
    summary.textContent =
      ability.summary ||
      "No summary provided — consider adding a brief one-line explanation.";

    const description = document.createElement("div");
    description.className = "ability-card-description";
    description.textContent =
      ability.description || "No description provided.";

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
  } catch {
    // ignore
  }
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

  // Make a copy so we can undo
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
      console.warn("Failed to parse JSON on reroll; aborting reroll.", e);
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
    "Flame-Flame Fruit (fire logia)",
    "Sand-Sand Fruit (sand logia)",
    "Ice-Ice Fruit (frozen logia)",
    "Thunder-Thunder Fruit (storm logia)",
    "Light-Light Fruit (radiant logia)",
    "Dark-Dark Fruit (gravity darkness)",
    "Magma-Magma Fruit (volcanic logia)",
    "Smoke-Smoke Fruit (smoke logia)",
    "Gas-Gas Fruit (toxic gas)",
    "Snow-Snow Fruit (blizzard logia)",
    "Earth-Earth Fruit (stone & quake)",
    "Metal-Metal Fruit (living steel)",
    "Glass-Glass Fruit (shards & mirrors)",
    "Shadow-Shadow Fruit (dark silhouettes)",
    "Soul-Soul Fruit (soul manipulation)",
    "String-String Fruit (razor threads)",
    "Gravity-Gravity Fruit (space crushing)",
    "Time-Time Fruit (short rewinds)",
    "Memory-Memory Fruit (steal & edit memories)",
    "Copy-Copy Fruit (mimic devil fruits)",
    "Reflection Fruit (counter and rebound attacks)",
    "Echo-Echo Fruit (sound & vibration)",
    "Storm-Storm Fruit (wind and rain control)",
    "Forest-Forest Fruit (living trees & vines)",
    "Bloom-Bloom Fruit (instant plant growth)",
    "Beast-Beast Fruit: Ancient Dragon",
    "Beast-Beast Fruit: Mythical Phoenix",
    "Beast-Beast Fruit: Mythical Kirin",
    "Beast-Beast Fruit: Ancient Mammoth",
    "Beast-Beast Fruit: Ancient Tyrannosaur",
    "Beast-Beast Fruit: Ancient Spinosaurus",
    "Beast-Beast Fruit: Ancient Triceratops",
    "Beast-Beast Fruit: Mythical Nine-Tailed Fox",
    "Beast-Beast Fruit: Mythical Griffin",
    "Beast-Beast Fruit: Mythical Sea Serpent",
    "Zone-Zone Fruit: Shadow Panther",
    "Zone-Zone Fruit: Thunder Wolf",
    "Zone-Zone Fruit: Iron Rhino",
    "Zone-Zone Fruit: Glass Serpent",
    "Zone-Zone Fruit: Venom Spider",
    "Puppet-Puppet Fruit (string-control bodies)",
    "Forge-Forge Fruit (weapon creation)",
    "Ink-Ink Fruit (living drawings)",
    "Card-Card Fruit (summon from cards)",
    "Portal-Portal Fruit (short-range portals)",
    "Pocket-Pocket Fruit (spatial pockets)",
    "Chain-Chain Fruit (binding chains)",
    "Barrier-Barrier Fruit (forcefields)",
    "Mirror-Mirror Fruit (clones & warps)",
    "Blood-Blood Fruit (blood control)",
    "Bone-Bone Fruit (harden & reshape bones)",
    "Crystal-Crystal Fruit (piercing crystals)",
    "Magnet-Magnet Fruit (metal manipulation)",
    "Rust-Rust Fruit (decay metals)",
    "Virus-Virus Fruit (status conditions)",
    "Bloom-Blood Fruit (life-drain petals)",
    "Star-Star Fruit (light spears & gravity wells)",
    "Comet-Comet Fruit (impact meteors)",
    "Tide-Tide Fruit (water pressure & waves)",
    "Ink-Shadow Fruit (shadowy liquid forms)",
    "Wire-Wire Fruit (razor wires & traps)",
    "Dice-Dice Fruit (luck manipulation)",
    "Fate-Fate Fruit (probability nudging)",
    "Chain-Reaction Fruit (explosive tags & triggers)",
    "Gear-Gear Fruit (mechanical augmentation)",
    "Circuit-Circuit Fruit (bio-electric tech)",
    "Plasma-Plasma Fruit (hyper-heated energy)",
    "Mist-Mist Fruit (concealment & illusions)",
    "Dream-Dream Fruit (dream constructs)",
    "Nightmare Fruit (fear-based illusions)",
    "Ward-Ward Fruit (seals & talismans)",
    "Rune-Rune Fruit (sigils & glyphs)",
    "Grave-Grave Fruit (bones & ghosts)",
    "Soul-Forge Fruit (weaponized souls)",
    "Chain-Soul Fruit (tethered spirits)",
    "Mask-Mask Fruit (form & stat swapping)",
    "Script-Script Fruit (rewrite rules of a scene)",
    "Pulse-Pulse Fruit (shockwaves & heartbeats)",
    "Lens-Lens Fruit (focus & amplify beams)",
    "Orbit-Orbit Fruit (satellite projectiles)",
    "Seed-Seed Fruit (explosive seeds)",
    "Virus-Bloom Fruit (spreading debuff fields)",
    "Steam-Steam Fruit (scalding pressure)",
    "Graviton Fruit (localized black holes)",
    "Circuit-Beast Fruit (cybernetic zoan)",
    "Clock-Clock Fruit (slow/haste fields)",
    "Fuse-Fuse Fruit (merge objects or bodies)",
    "Copy-Beast Fruit (copy enemy zoans)",
    "Shard-Shard Fruit (splitting self into shards)",
    "Core-Core Fruit (anchor point body)",
    "Shell-Shell Fruit (layered armor forms)",
    "Page-Page Fruit (summon things from pages)",
    "Chain-Sky Fruit (hook onto clouds & air)",
    "Nebula-Nebula Fruit (gas and starlight)",
    "Obsidian-Obsidian Fruit (glass-black blades)",
    "Frost-Fire Fruit (cold + burn duality)",
    "Thunder-Dragon Fruit (mythical zone)",
    "Storm-Serpent Fruit (mythical sea dragon)",
    "Solar-Solar Fruit (sun flares & heat)",
    "Lunar-Lunar Fruit (gravity tides & illusions)",
    "Pulse-Beast Fruit (beating heart monster form)",
    "Blood-Forge Fruit (weapons from blood)",
    "Ink-Beast Fruit (living ink beast form)",
    "Magnet-Dragon Fruit (magnetic draconic form)",
    "Chain-Flame Fruit (fiery chains)",
    "Void-Void Fruit (erase space snippets)",
    "Echo-Dragon Fruit (sound dragon roars)",
    "Grave-Beast Fruit (undead beast form)",
    "Galaxy-Galaxy Fruit (microcosm space control)",
    "Toxin-Toxin Fruit (stacking poison debuffs)",
    "Nectar-Nectar Fruit (healing & toxic honey)",
    "Blossom-Dragon Fruit (floral dragon zone)",
    "Storm-Gear Fruit (mechanical storm armor)",
    "Solar-Beast Fruit (radiant beast zone)",
    "Chimera-Chimera Fruit (multi-beast hybrid)",
    "Rune-Beast Fruit (inscribed beast form)",
    "Relic-Relic Fruit (ancient artifact body)",
    "Circuit-Dragon Fruit (techno-dragon zone)",
    "Quantum-Quantum Fruit (shift positions & states)"
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

  // Combo focus (moderate+; now multi-select)
  const comboInputs = Array.from(
    document.querySelectorAll('input[name="comboFocus"]')
  );
  if (comboInputs.length && uiComplexityLevel >= 1) {
    comboInputs.forEach((el) => (el.checked = false));
    randomSample(comboInputs, randomInt(1, Math.min(2, comboInputs.length))).forEach(
      (el) => (el.checked = true)
    );
  }

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

  // Mechanics detail + ability complexity (moderate+)
  const mechDetail = document.getElementById("mechanics-detail");
  const complexitySelect = document.getElementById("complexity-level");
  if (mechDetail && uiComplexityLevel >= 1) {
    mechDetail.value = randomChoice(["simple", "detailed"]);
  }
  if (complexitySelect && uiComplexityLevel >= 1) {
    complexitySelect.value = randomChoice(["simple", "moderate", "complex"]);
  }

  // Tone epic (moderate+)
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

  // Power level: we intentionally DO NOT randomize this.
  // User can pick their desired power level and then hit Randomize.

  updatePromptPreview();
}

// --- Attach listeners once the DOM is ready ---
document.addEventListener("DOMContentLoaded", () => {
  // Apply initial UI complexity
  applyUIComplexity();

  // Complexity selector change
  const uiComplexSelect = document.getElementById("ui-complexity");
  if (uiComplexSelect) {
    uiComplexSelect.addEventListener("change", () => {
      applyUIComplexity();
      updatePromptPreview();
    });
  }

  // Initial power label
  const powerInput = document.getElementById("power-level");
  const powerDisplay = document.getElementById("power-level-display");
  if (powerInput && powerDisplay) {
    powerDisplay.textContent = describePowerLevel(powerInput.value);
    powerInput.addEventListener("input", () => {
      if (powerInput.value > 10) powerInput.value = 10;
      if (powerInput.value < 1) powerInput.value = 1;
      powerDisplay.textContent = describePowerLevel(powerInput.value);
      updatePromptPreview();
    });
  }

  // Initial prompt fill
  updatePromptPreview();

  // Rebuild the prompt anytime an input changes
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

  // Export / copy buttons
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

  // Undo reroll
  const undoBtn = document.getElementById("undo-reroll-btn");
  if (undoBtn) {
    undoBtn.addEventListener("click", undoLastReroll);
  }

  // Randomize button
  const randomizeBtn = document.getElementById("randomize-btn");
  if (randomizeBtn) {
    randomizeBtn.addEventListener("click", randomizeInputs);
  }

  // Saved sets
  refreshSavedSetsDropdown();

  const saveSetBtn = document.getElementById("save-set-btn");
  if (saveSetBtn) {
    saveSetBtn.addEventListener("click", handleSaveSet);
  }

  const loadSetSelect = document.getElementById("load-set-select");
  if (loadSetSelect) {
    loadSetSelect.addEventListener("change", handleLoadSet);
  }

  const deleteSetBtn = document.getElementById("delete-set-btn");
  if (deleteSetBtn) {
    deleteSetBtn.addEventListener("click", handleDeleteSet);
  }

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
        console.warn("Failed to parse JSON abilities, falling back to raw text.", e);
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
          "Error from API: " + (err && err.message ? err.message : "Unknown error");
      }
    }
  });
});
