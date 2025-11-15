// --- Helper to get checked checkbox values by name ---
function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (el) => el.value
  );
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
      "Tone: Epic, anime-style, cinematic, but still readable at the table in a few seconds."
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

  if (outputNotes) {
    lines.push(`Additional output constraints: ${outputNotes}`);
  }

  lines.push("");
  lines.push("=== Mechanics Requirements (IMPORTANT) ===");
  lines.push(
    "- Use a DnD 5e-like structure (actions/bonus actions, saves, ranges, damage dice) but do not overcomplicate rules."
  );
  lines.push(
    "- Keep everything usable at the table: avoid walls of text, avoid complex tracking (no deep resource systems)."
  );
  lines.push("- Keep everything balanced at roughly level 10–15 unless the context suggests otherwise.");
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

// Render abilities as separate cards
function renderAbilities(abilities) {
  const resultsBox = document.getElementById("results");
  if (!resultsBox) return;

  resultsBox.innerHTML = "";
  resultsBox.classList.add("ability-grid");

  abilities.forEach((ability, index) => {
    const card = document.createElement("div");
    card.className = "ability-card";

    const title = document.createElement("div");
    title.className = "ability-card-title";
    title.textContent = ability.name || `Ability ${index + 1}`;

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

    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(description);
    card.appendChild(mechContainer);

    resultsBox.appendChild(card);
  });
}

// Attach listeners once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Initial fill
  updatePromptPreview();

  // Rebuild the prompt anytime an input changes
  const inputs = document.querySelectorAll("input, textarea, select");
  inputs.forEach((el) => {
    el.addEventListener("input", updatePromptPreview);
    el.addEventListener("change", updatePromptPreview);
  });

  const generateBtn = document.getElementById("generate-btn");
  const statusText = document.getElementById("status-text");
  const resultsBox = document.getElementById("results");

  if (!generateBtn) return;

  generateBtn.addEventListener("click", async () => {
    const prompt = buildPrompt();
    document.getElementById("prompt-preview").value = prompt;

    const modelChoice = document.getElementById("model-choice").value || "gpt-4.1-mini";

    statusText.textContent = "Generating abilities...";
    resultsBox.textContent = "";

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
        renderAbilities(parsed.abilities);
      } else {
        // Fallback: just show raw text
        resultsBox.classList.remove("ability-grid");
        resultsBox.textContent =
          raw || "(No text returned from API, and no abilities parsed.)";
      }

      statusText.textContent = "Done.";
    } catch (err) {
      console.error(err);
      statusText.textContent = "Error.";
      resultsBox.classList.remove("ability-grid");
      resultsBox.textContent =
        "Error from API: " + (err && err.message ? err.message : "Unknown error");
    }
  });
});
