function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (el) => el.value
  );
}

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

  lines.push("=== Devil Fruit Traits & Inspirations ===");
  lines.push(
    "Desired fruit traits / inspirations: " +
      (fruitTraits.length ? fruitTraits.join(", ") : "Any type that fits the concept.")
  );
  if (fruitNotes) lines.push(`Extra fruit combo notes: ${fruitNotes}`);
  lines.push("");

  lines.push("=== Style, Visuals & Tone ===");
  lines.push(
    "Style / visual modifiers: " +
      (styleMods.length ? styleMods.join(", ") : "Any style that feels cinematic.")
  );
  if (styleNotes) lines.push(`Visual flavor notes: ${styleNotes}`);
  if (toneEpic) {
    lines.push(
      "Tone: Epic, anime-style, cinematic, but still readable at the table in a few seconds."
    );
  }
  lines.push("");

  lines.push("=== Output Format ===");
  lines.push(
    "Number of abilities: " +
      numAbilities +
      ". Each ability MUST include: (1) Ability Name, (2) Cinematic Description, (3) Simple DnD mechanics."
  );
  lines.push("Formatting style preference: " + formatStyle);
  lines.push(
    "Mechanics style preference: " +
      (mechanicsDetail === "simple"
        ? "Simple: include action type, range, saving throw (if any), basic damage, and 1–2 core effects."
        : "Detailed: include action type, range, save, damage/scaling ideas, and any conditions or special rules.")
  );
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
  lines.push("=== Presentation ===");
  if (formatStyle === "markdown") {
    lines.push(
      "Use Markdown. For each ability, start with a heading like `### Ability Name` followed by description and mechanics."
    );
  } else if (formatStyle === "bullets") {
    lines.push(
      "Present each ability with the name, then a short paragraph of description, then bullet points for mechanics."
    );
  } else {
    lines.push(
      "Plain text is fine but clearly separate each ability with a blank line and a clear name."
    );
  }

  return lines.join("\n");
}

function updatePromptPreview() {
  const prompt = buildPrompt();
  document.getElementById("prompt-preview").value = prompt;
}

document.addEventListener("DOMContentLoaded", () => {
  updatePromptPreview();

  const inputs = document.querySelectorAll("input, textarea, select");
  inputs.forEach((el) => {
    el.addEventListener("input", updatePromptPreview);
    el.addEventListener("change", updatePromptPreview);
  });

  const generateBtn = document.getElementById("generate-btn");
  const statusText = document.getElementById("status-text");
  const resultsBox = document.getElementById("results");

  generateBtn.addEventListener("click", async () => {
    const prompt = buildPrompt();
    document.getElementById("prompt-preview").value = prompt;

    statusText.textContent = "Generating abilities...";
    resultsBox.textContent = "";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      resultsBox.textContent = data.result || "(No text returned from API.)";
      statusText.textContent = "Done.";
    } catch (err) {
      console.error(err);
      statusText.textContent = "Error.";
      resultsBox.textContent =
        "Failed to generate abilities. Check your internet connection and that your API key is set correctly on the server.";
    }
  });
});
