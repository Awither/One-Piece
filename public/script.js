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

// --- Multi-character combo helpers ---
function createParticipantCard(initial = {}) {
  const container = document.getElementById("combo-participants-container");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "combo-participant-card";

  const header = document.createElement("div");
  header.className = "combo-participant-header";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Name";
  nameInput.className = "combo-participant-name";
  nameInput.value = initial.name || "";

  const roleInput = document.createElement("input");
  roleInput.type = "text";
  roleInput.placeholder = "Role (frontline, sniper, support, etc.)";
  roleInput.className = "combo-participant-role";
  roleInput.value = initial.role || "";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.className = "combo-remove-btn";
  removeBtn.addEventListener("click", () => {
    container.removeChild(card);
    updatePromptPreview();
  });

  header.appendChild(nameInput);
  header.appendChild(roleInput);
  header.appendChild(removeBtn);

  const row = document.createElement("div");
  row.className = "combo-participant-row";

  const hasFruitLabel = document.createElement("label");
  hasFruitLabel.className = "checkbox-inline";
  const hasFruitInput = document.createElement("input");
  hasFruitInput.type = "checkbox";
  hasFruitInput.className = "combo-participant-has-fruit";
  hasFruitInput.checked = !!initial.hasFruit;
  hasFruitLabel.appendChild(hasFruitInput);
  const hasFruitText = document.createElement("span");
  hasFruitText.textContent = "Devil fruit user";
  hasFruitLabel.appendChild(hasFruitText);

  const fruitInput = document.createElement("input");
  fruitInput.type = "text";
  fruitInput.placeholder = "Devil fruit / core power (if any)";
  fruitInput.className = "combo-participant-fruit";
  fruitInput.value = initial.fruitPower || "";

  const nonFruitInput = document.createElement("input");
  nonFruitInput.type = "text";
  nonFruitInput.placeholder = "Non-fruit skills / weapons";
  nonFruitInput.className = "combo-participant-nonfruit";
  nonFruitInput.value = initial.nonFruit || "";

  row.appendChild(hasFruitLabel);
  row.appendChild(fruitInput);
  row.appendChild(nonFruitInput);

  const notes = document.createElement("textarea");
  notes.rows = 2;
  notes.placeholder =
    "What they contribute to the combo: setup, damage, support, control, emotional beat, etc.";
  notes.className = "combo-participant-notes";
  notes.value = initial.notes || "";

  card.appendChild(header);
  card.appendChild(row);
  card.appendChild(notes);

  [nameInput, roleInput, hasFruitInput, fruitInput, nonFruitInput, notes].forEach((el) => {
    el.addEventListener("input", updatePromptPreview);
    el.addEventListener("change", updatePromptPreview);
  });

  container.appendChild(card);
}

function collectComboParticipants() {
  const container = document.getElementById("combo-participants-container");
  if (!container) return [];

  const cards = Array.from(container.querySelectorAll(".combo-participant-card"));
  return cards
    .map((card) => {
      const name = card.querySelector(".combo-participant-name")?.value.trim() || "";
      const role = card.querySelector(".combo-participant-role")?.value.trim() || "";
      const hasFruit = card.querySelector(".combo-participant-has-fruit")?.checked || false;
      const fruitPower =
        card.querySelector(".combo-participant-fruit")?.value.trim() || "";
      const nonFruit =
        card.querySelector(".combo-participant-nonfruit")?.value.trim() || "";
      const notes = card.querySelector(".combo-participant-notes")?.value.trim() || "";
      return { name, role, hasFruit, fruitPower, nonFruit, notes };
    })
    .filter(
      (p) =>
        p.name ||
        p.role ||
        p.fruitPower ||
        p.nonFruit ||
        p.notes
    );
}

// --- Safe JSON extractor for model output ---
function extractJsonFromRaw(raw) {
  if (!raw) throw new Error("Empty response text");

  let text = String(raw).trim();

  // Strip Markdown code fences ```json ... ```
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z0-9]*\s*/, "");
    const lastFence = text.lastIndexOf("```");
    if (lastFence !== -1) {
      text = text.slice(0, lastFence);
    }
    text = text.trim();
  }

  // Strip a leading 'json' token, e.g. "json { ... }"
  if (text.toLowerCase().startsWith("json")) {
    text = text.slice(4).trimStart();
  }

  // Grab from first '{' to last '}' (handles stray text)
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object braces found in response");
  }

  const jsonSlice = text.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonSlice);
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

  const multiComboCheckbox = document.getElementById("enable-multi-combo");
  const multiComboEnabled =
    uiComplexityLevel >= 2 && multiComboCheckbox && multiComboCheckbox.checked;
  const participants = multiComboEnabled ? collectComboParticipants() : [];

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

  if (multiComboEnabled && participants.length) {
    lines.push("=== Multi-Character Combo Attack (Complex Mode) ===");
    lines.push(
      "The abilities should assume a coordinated multi-character combo attack that is more powerful than all participants acting separately. Synergy and combined effects are crucial."
    );
    lines.push("Participants:");
    participants.forEach((p, idx) => {
      lines.push(
        `- Participant ${idx + 1}: ` +
          `Name: ${p.name || "Unnamed"}; ` +
          (p.role ? `Role: ${p.role}; ` : "") +
          (p.hasFruit ? "Devil fruit user; " : "No devil fruit; ") +
          (p.fruitPower ? `Fruit/Power: ${p.fruitPower}; ` : "") +
          (p.nonFruit ? `Non-fruit skills/weapons: ${p.nonFruit}; ` : "") +
          (p.notes ? `Combo contribution: ${p.notes}` : "")
      );
    });
    lines.push(
      "At least one major ability should explicitly require multiple participants to execute (timing, positioning, or layered effects), and its impact should clearly exceed the sum of their solo abilities."
    );
    lines.push(
      "Make the mechanics show this synergy: boosted or scaling DCs, extra riders, or amplified damage/area when all participants contribute."
    );
    lines.push("");
  }

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

  if (preferredDc) {
    lines.push(
      "Preferred DC override: " +
        preferredDc +
        ". If this is a single numeric DC (e.g. 30), then every saving throw DC you output must be either exactly that value or exactly 1 lower (e.g. 29–30 only). Do NOT go above it or more than 1 below it unless it is literally impossible to make the mechanics work."
    );
  } else {
    lines.push(
      "No fixed DC override specified; choose DCs strictly according to the power level ladder below."
    );
  }

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
    "Use this ladder to scale DC, damage, area, effects, and drawbacks. Do not downgrade high power levels to feel 'balanced' — they may be broken on purpose if drawbacks are appropriate."
  );
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
  lines.push("- Must use clear DnD-like action economy (Action / Bonus Action / Reaction, etc.).");
  lines.push("- Keep effects readable (no walls of text).");
  lines.push("- Mechanics (DC, damage, area, conditions, drawbacks) MUST visibly match the power level.");
  lines.push(
    "- For each ability, explicitly assign a mechanical role field (Offense, Defense, Support, Control, Utility, Finisher, or hybrid tags)."
  );
  if (preferredDc) {
    lines.push(
      "- All saving throw DCs must respect the strict Preferred DC override rule described above."
    );
  }
  const multiComboCheckbox = document.getElementById("enable-multi-combo");
  if (multiComboCheckbox && multiComboCheckbox.checked) {
    lines.push(
      "- At least one ability should clearly function as a multi-character combo whose impact is greater than all participants acting separately."
    );
  }
  lines.push("");

  lines.push("=== Output JSON Format (REQUIRED) ===");
  lines.push(
    "Respond ONLY with valid JSON in this exact structure, with no extra text before or after:"
  );
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

// Update the preview textarea
function updatePromptPreview() {
  const prompt = buildPrompt();
  const preview = document.getElementById("prompt-preview");
  if (preview) {
    preview.value = prompt;
  }
}

// --- helper: editable block (no scroll, grows with text) ---
function createEditableBlock(initialText, placeholder, onChange, extraClass) {
  const div = document.createElement("div");
  div.className = "ability-edit-block" + (extraClass ? " " + extraClass : "");
  div.contentEditable = "true";
  div.textContent = initialText ? String(initialText) : "";
  if (placeholder) {
    div.dataset.placeholder = placeholder;
  }
  div.addEventListener("input", () => {
    onChange(div.textContent);
  });
  return div;
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

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "ability-card-title-input";
    titleInput.value = ability.name || `Ability ${index + 1}`;
    titleInput.placeholder = "Ability Name";
    titleInput.addEventListener("input", (e) => {
      ability.name = e.target.value;
    });

    const tag = document.createElement("div");
    tag.className = "ability-card-tag";
    const roleText = ability.role ? String(ability.role) : "";
    tag.textContent =
      describePowerLevel(powerLevel) + (roleText ? " · " + roleText : "");

    header.appendChild(titleInput);
    header.appendChild(tag);

    const roleInput = document.createElement("input");
    roleInput.type = "text";
    roleInput.className = "ability-edit-input ability-role-input";
    roleInput.placeholder = "Role: Offense / Defense / Support / Control / Utility / Finisher";
    roleInput.value = ability.role || "";
    roleInput.addEventListener("input", (e) => {
      ability.role = e.target.value;
      const rText = e.target.value ? String(e.target.value) : "";
      tag.textContent =
        describePowerLevel(powerLevel) + (rText ? " · " + rText : "");
    });

    const summaryBlock = createEditableBlock(
      ability.summary || "",
      "One-line summary of what the ability does.",
      (text) => {
        ability.summary = text;
      },
      "ability-card-summary"
    );

    const descriptionBlock = createEditableBlock(
      ability.description || "",
      "Cinematic but concise description of how it looks and feels.",
      (text) => {
        ability.description = text;
      },
      "ability-card-description"
    );

    const mech = ability.mechanics || (ability.mechanics = {});
    const mechContainer = document.createElement("div");
    mechContainer.className = "ability-card-mech";

    function addEditableMechItem(label, key) {
      const item = document.createElement("div");
      item.className = "ability-card-mech-item";

      const lbl = document.createElement("div");
      lbl.className = "ability-card-mech-label";
      lbl.textContent = label;

      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "ability-edit-input ability-card-mech-value";
      inp.value = mech[key] || "";
      inp.placeholder = "-";
      inp.addEventListener("input", (e) => {
        ability.mechanics = ability.mechanics || {};
        ability.mechanics[key] = e.target.value;
      });

      item.appendChild(lbl);
      item.appendChild(inp);
      mechContainer.appendChild(item);
    }

    addEditableMechItem("Action", "action_type");
    addEditableMechItem("Range", "range");
    addEditableMechItem("Target", "target");
    addEditableMechItem("Save", "save");
    addEditableMechItem("DC", "dc");
    addEditableMechItem("Damage", "damage");
    addEditableMechItem("Effect", "effect");

    const comboLogicBlock = createEditableBlock(
      ability.combo_logic || "",
      "Optional: how the fruits/powers interact (combo logic).",
      (text) => {
        ability.combo_logic = text;
      },
      "ability-card-combo-logic"
    );

    card.appendChild(header);
    card.appendChild(roleInput);
    card.appendChild(summaryBlock);
    card.appendChild(descriptionBlock);
    card.appendChild(mechContainer);
    card.appendChild(comboLogicBlock);

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
      parsed = extractJsonFromRaw(raw);
    } catch (e) {
      console.warn("Failed to parse JSON on reroll; aborting reroll.", e);
      const resultsBox = document.getElementById("results");
      if (resultsBox) {
        resultsBox.classList.remove("ability-grid");
        resultsBox.textContent =
          raw || "(No text returned from API, and no abilities parsed.)";
      }
      if (statusText) statusText.textContent = "Error parsing reroll JSON.";
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
  const comboOptions = ["any", "single", "combo", "transformation", "awakening"];
  const chosenCombo = randomSample(comboOptions, randomInt(1, 3));
  comboChecks.forEach((el) => {
    if (chosenCombo.includes(el.value)) el.checked = true;
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

  // Multi-character combo controls
  const enableMultiCombo = document.getElementById("enable-multi-combo");
  const addParticipantBtn = document.getElementById("add-participant-btn");

  if (enableMultiCombo) {
    enableMultiCombo.addEventListener("change", () => {
      const container = document.getElementById("combo-participants-container");
      if (enableMultiCombo.checked && container && container.children.length === 0) {
        // Start with 2 participants by default
        createParticipantCard();
        createParticipantCard();
      }
      updatePromptPreview();
    });
  }

  if (addParticipantBtn) {
    addParticipantBtn.addEventListener("click", () => {
      createParticipantCard();
      updatePromptPreview();
    });
  }

  // Initial power label (mobile-friendly)
  const powerInput = document.getElementById("power-level");
  const powerDisplay = document.getElementById("power-level-display");
  if (powerInput && powerDisplay) {
    const updatePowerUI = () => {
      const raw = powerInput.value;

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

    powerDisplay.textContent = describePowerLevel(powerInput.value || 6);
    powerInput.addEventListener("input", updatePowerUI);
    powerInput.addEventListener("change", updatePowerUI);
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
        parsed = extractJsonFromRaw(raw);
      } catch (e) {
        console.warn("Failed to parse JSON abilities, falling back to raw text.", e);
        if (resultsBox) {
          resultsBox.classList.remove("ability-grid");
          resultsBox.textContent =
            raw || "(No text returned from API, and no abilities parsed.)";
        }
        if (statusText) statusText.textContent = "Error parsing JSON.";
        return;
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
