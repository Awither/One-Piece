// --- Global state ---
let lastAbilities = [];
let lastModel = "gpt-4.1-mini";
let viewMode = "cards";

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

// --- Build the prompt text from all inputs ---
function buildPrompt() {
  const charName = document.getElementById("char-name").value.trim();
  const charRole = document.getElementById("char-role").value.trim();
  const charTheme = document.getElementById("char-theme").value.trim();
  const charBackstory = document.getElementById("char-backstory").value.trim();

  const effectTypes = getCheckedValues("effectTypes");
  const effectNotes = document.getElementById("effect-notes").value.trim();

  const fruitTraits = getCheckedValues("fruitTraits");
  const fruitNotes = document.getElementById("fruit-notes").value.trim();

  const styleMods = getCheckedValues("styleMods");
  const styleNotes = document.getElementById("style-notes").value.trim();

  const numAbilities =
    parseInt(document.getElementById("num-abilities").value, 10) || 3;
  const formatStyle = document.getElementById("format-style").value;
  const mechanicsDetail = document.getElementById("mechanics-detail").value;
  const toneEpic = document.getElementById("tone-epic").checked;
  const outputNotes = document.getElementById("output-notes").value.trim();
  const modelChoice = document.getElementById("model-choice").value;
  const preferredDc = document.getElementById("preferred-dc").value.trim();
  const powerLevel =
    parseInt(document.getElementById("power-level").value, 10) || 6;

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
  if (charTheme) lines.push(`Theme / Vibe: ${charTheme}`);
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

  lines.push("=== Output Style Preferences ===");
  lines.push(
    "Number of abilities: " +
      numAbilities +
      ". Each ability MUST include: (1) Ability Name, (2) Summary, (3) Cinematic Description, (4) Simple DnD mechanics."
  );

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
      "summary": "One-line summary of what the ability does.",
      "description": "Cinematic but concise description of how it looks and feels.",
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
    tag.textContent = describePowerLevel(powerLevel);

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

    const actions = document.createElement("div");
    actions.className = "ability-card-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "chip small";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => copySingleAbility(ability, powerLevel));

    const rerollBtn = document.createElement("button");
    rerollBtn.className = "chip small";
    rerollBtn.textContent = "Reroll";
    rerollBtn.addEventListener("click", () => rerollAbility(index));

    actions.appendChild(copyBtn);
    actions.appendChild(rerollBtn);

    card.appendChild(header);
    card.appendChild(summary);
    card.appendChild(description);
    card.appendChild(mechContainer);
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
  ["Name", "Power", "Action", "Range", "DC", "Damage", "Effect"].forEach((h) => {
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
    addCell(mech.action_type || "");
    addCell(mech.range || "");
    addCell(mech.dc || "");
    addCell(mech.damage || "");
    addCell(mech.effect || mech.summary || "");

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
  return (
    `[${ability.name || "Unnamed Ability"}] – ${describePowerLevel(powerLevel)}\n` +
    `Action: ${mech.action_type || "-"} | Range: ${mech.range || "-"} | Target: ${
      mech.target || "-"
    }\n` +
    `Save: ${mech.save || "-"} | DC: ${mech.dc || "-"} | Damage: ${
      mech.damage || "-"
    }\n` +
    `Effect: ${mech.effect || "-"}\n` +
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
    }
  } catch (err) {
    console.error(err);
    if (statusText) {
      statusText.textContent =
        "Error on reroll: " + (err && err.message ? err.message : "Unknown error");
    }
  }
}

// --- Attach listeners once the DOM is ready ---
document.addEventListener("DOMContentLoaded", () => {
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

    const modelChoice = document.getElementById("model-choice").value || "gpt-4.1-mini";
    lastModel = modelChoice;

    if (statusText) statusText.textContent = "Generating abilities...";

    const resultsBox = document.getElementById("results");
    if (resultsBox) {
      resultsBox.classList.remove("ability-grid");
      resultsBox.textContent = "";
    }

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
