// --- THEME / VIBE / DEVIL FRUIT RANDOM POOL (100+ options) ---
const themePool = [
  "Storm-Wreathed Soul Tree Logia",
  "Gravity-Bending Orchard Paramecia",
  "Mechanical World-Tree Mythical Zoan",
  "Clockwork Time-Sap Fruit",
  "Blood-Tide Sandstorm Logia",
  "Celestial Forge Flame Fruit",
  "Abyssal Tide Leviathan Zoan",
  "Quantum Rift Space Fruit",
  "Dream-Thread Marionette Fruit",
  "Bone-Garden Necrotic Zoan",
  "Eclipse-Shadow Phantom Logia",
  "Aurora Pulse Light Paramecia",
  "Obsidian Thorn Dragon Zoan",
  "Ink-Sea Reality Rewriter",
  "Ironwood Titan Golem Fruit",
  "Mirror-Shard Reflection Fruit",
  "Soul-Lantern Reaping Fruit",
  "Chain-Storm Gravity Paramecia",
  "Thunder-Bloom Storm Paramecia",
  "Blood-Root Parasite Plant Zoan",
  "Starforge Meteor Logia",
  "Rust-Eater Corrosion Fruit",
  "Severed-Space Guillotine Fruit",
  "Machina Seraph Cybernetic Zoan",
  "Glass-World Fracture Paramecia",
  "Siren-Tide Voice Logia",
  "Loom-of-Fates Thread Paramecia",
  "Lotus-of-Deaths Rebirth Fruit",
  "Cardinal Wind Phoenix Zoan",
  "Demon-Forged Flame Oni Fruit",
  "Oblivion Dust Decay Logia",
  "Circuit-Vine Cyber Nature Fruit",
  "Spectral Chain Prison Fruit",
  "Star-Root Navigator Fruit",
  "Forest-of-Blades Thorn Fruit",
  "Clocktower Heartbeat Fruit",
  "Solar Flare Dragon Logia",
  "Moonlit Mirage Illusion Fruit",
  "Warp-Pocket Spacefold Fruit",
  "Cataclysm Quake-Storm Hybrid",
  "Iron-Sand Blood Desert Logia",
  "Worldsong Echo Paramecia",
  "Soul-Forge Blacksmith Fruit",
  "Living Arsenal Weapon Zoan",
  "Siege Engine Colossus Zoan",
  "Kingmaker Conqueror’s Crown Fruit",
  "Rune-Bloom Glyph Fruit",
  "Plague Garden Toxic Flora Fruit",
  "Tidal Rift Abyss Fruit",
  "Chimeric Beast Library Zoan",
  "Time-Spiral Vortex Fruit",
  "Soul-Anchor Gravewarden Fruit",
  "Voltage Serpent Thunder Zoan",
  "Venom Orchid Poison Fruit",
  "Crystal Spine Dragon Zoan",
  "Astral Chain Warden Fruit",
  "Sandstorm Glass Reaver Fruit",
  "Sky-Sunder Lightning Logia",
  "Seismic Root Earthquake Fruit",
  "Blood-Contract Pact Fruit",
  "Living Shadow Armory Fruit",
  "Iron Halo Gravity Knight Fruit",
  "Chaos Bloom Entropy Fruit",
  "Starvine Navigator Mythical Zoan",
  "Sky-Tyrant Tempest Zoan",
  "Frostbrand Winter Wolf Zoan",
  "Solar Thorn Sunfire Fruit",
  "Black Hole Core Gravity Logia",
  "Reality Stitcher Seam Fruit",
  "Soul Carnival Masked Fruit",
  "Mirage Highway Illusion Fruit",
  "Thunder Orchard Storm Tree Fruit",
  "Sands-of-Fate Hourglass Fruit",
  "Rune-Shell Fortress Turtle Zoan",
  "Meteor Swarm Comet Fruit",
  "Dragonforge Volcano Fruit",
  "Neon Circuit Runner Fruit",
  "World-Anchor Colossal Tree Fruit",
  "Blood Moon Eclipse Fruit",
  "Scarab Sun-Guard Beetle Zoan",
  "Feral Storm Wind Beast Zoan",
  "Dimensional Lantern Gate Fruit",
  "Shard-Rain Crystal Logia",
  "Leviathan Spine Ocean Fruit",
  "Tyrant-King Titan Zoan",
  "Obsidian Mirage Blade Fruit",
  "Carnivorous Orchard Predator Fruit",
  "Soul-Archive Librarian Fruit",
  "Aurora Chain Polar Light Fruit",
  "Starfall Executioner Fruit",
  "Iron-Bloom Battlefield Flower Fruit",
  "Reactor Core Plasma Fruit",
  "Voidroot Cosmic Tree Mythical Zoan",
  "Gunmetal Hydra Weapon Zoan",
  "Chronicle Page Story-Weaver Fruit",
  "Specter Bloom Wraith Fruit",
  "Thunder-Rail Storm Engine Fruit",
  "Aether Crown Sky Ruler Fruit",
  "Sea-of-Blades Water Logia",
  "Venom Gear Alchemical Fruit",
  "Titan Bark Colossus Tree Fruit",
  "Solar Sail Tempest Fruit",
  "Astral Orchid Cosmic Plant Fruit",
  "Living Arsenal Gunslinger Fruit",
  "Chain-World Prison Warder Fruit",
  "Crystal Bloom Healing Fruit",
  "World-Tree of Wano Soul Fruit",
  "Mechanical Druid Cyborg Nature Fruit",
  "Red-Lightning Conqueror’s Storm Fruit",
  "Spirit Orchard Reincarnation Fruit",
  "Eternal Wano Guardian Tree Fruit"
];

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  const complexitySelect = document.getElementById('complexity');
  const complexityDescription = document.getElementById('complexity-description');
  const themeVibeInput = document.getElementById('themeVibe');
  const randomThemeBtn = document.getElementById('randomThemeBtn');
  const randomBtn = document.getElementById('randomBtn');
  const clearBtn = document.getElementById('clearBtn');

  const effectType = document.getElementById('effectType');
  const devilFruitType = document.getElementById('devilFruitType');
  const numAbilities = document.getElementById('numAbilities');
  const powerLevel = document.getElementById('powerLevel');
  const desiredOutcomeContainer = document.getElementById('desiredOutcome');
  const comboFocusContainer = document.getElementById('comboFocus');

  // Helper to toggle sections based on complexity
  function applyComplexity(level) {
    const basicOnly = document.querySelectorAll('.basic-only');
    const moderateOnly = document.querySelectorAll('.moderate-only');
    const complexOnly = document.querySelectorAll('.complex-only');

    if (level === 'basic') {
      basicOnly.forEach(el => el.classList.remove('hidden'));
      moderateOnly.forEach(el => el.classList.add('hidden'));
      complexOnly.forEach(el => el.classList.add('hidden'));
      complexityDescription.textContent =
        "Basic: Pick effect type, Devil Fruit type, number of abilities, and power level. Desired Outcome + comment boxes A–D still visible.";
    } else if (level === 'moderate') {
      basicOnly.forEach(el => el.classList.remove('hidden'));
      moderateOnly.forEach(el => el.classList.remove('hidden'));
      complexOnly.forEach(el => el.classList.add('hidden'));
      complexityDescription.textContent =
        "Moderate: Adds combo focus (multi-select), limitations, and signature visuals, plus everything from Basic.";
    } else {
      // complex
      basicOnly.forEach(el => el.classList.remove('hidden'));
      moderateOnly.forEach(el => el.classList.remove('hidden'));
      complexOnly.forEach(el => el.classList.remove('hidden'));
      complexityDescription.textContent =
        "Complex: Full access – all boxes, combo focus multi-select, costs, visuals, rules hooks, and more.";
    }
  }

  complexitySelect.addEventListener('change', () => {
    applyComplexity(complexitySelect.value);
  });

  // Initial state
  applyComplexity(complexitySelect.value);

  // --- RANDOM THEME / VIBE / DEVIL FRUIT ---
  function randomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function randomizeThemeOnly() {
    themeVibeInput.value = randomFromArray(themePool);
  }

  randomThemeBtn.addEventListener('click', randomizeThemeOnly);

  // --- RANDOMIZE MANY FIELDS ---
  function randomizeGenerator() {
    // Effect type
    const effectOptions = ["logia", "paramecia", "zoan", "mythical", "ancient", "special"];
    effectType.value = randomFromArray(effectOptions);

    // Fruit type string – lightly themed to effect type
    const suffixMap = {
      logia: "Logia",
      paramecia: "Paramecia",
      zoan: "Zoan",
      mythical: "Mythical Zoan",
      ancient: "Ancient Zoan",
      special: "Special Paramecia"
    };
    devilFruitType.value = randomFromArray([
      "Soul-Soul Fruit, Model: World-Tree",
      "Sand-Sand Fruit, Model: Blood Desert",
      "Storm-Storm Fruit, Model: Red Lightning",
      "Gravity-Gravity Fruit, Model: Black Star",
      "Bloom-Bloom Fruit, Model: Spirit Orchard",
      "Machine-Machine Fruit, Model: Forest Titan",
      "Flame-Flame Fruit, Model: Sun Reactor"
    ]) + " (" + suffixMap[effectType.value] + ")";

    // Number of abilities
    numAbilities.value = randomFromArray(["1","2","3","4"]);

    // Power level (bias slightly toward high / broken)
    powerLevel.value = randomFromArray(["mid","high","high","broken"]);

    // Desired outcome – random subset including maybe High Damage
    const allDesired = Array.from(desiredOutcomeContainer.querySelectorAll('input[type="checkbox"]'));
    allDesired.forEach(cb => cb.checked = false);
    const numDesired = 2 + Math.floor(Math.random() * 3); // 2–4 tags
    for (let i = 0; i < numDesired; i++) {
      const cb = randomFromArray(allDesired);
      cb.checked = true;
    }

    // Combo focus multi-select (checkboxes)
    if (comboFocusContainer) {
      const allCombo = Array.from(comboFocusContainer.querySelectorAll('input[type="checkbox"]'));
      allCombo.forEach(cb => cb.checked = false);
      const numCombo = 1 + Math.floor(Math.random() * 4); // 1–4 focuses
      for (let i = 0; i < numCombo; i++) {
        const cb = randomFromArray(allCombo);
        cb.checked = true;
      }
    }

    // Theme / Vibe / Devil Fruit (critical requirement)
    randomizeThemeOnly();
  }

  randomBtn.addEventListener('click', randomizeGenerator);

  // --- CLEAR FORM ---
  function clearAll() {
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    inputs.forEach(el => el.value = '');

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = false);

    effectType.value = "";
    devilFruitType.value = "";
    numAbilities.value = "2";
    powerLevel.value = "high";

    // keep complexity as-is, just ensure correct visibility
    applyComplexity(complexitySelect.value);
  }

  clearBtn.addEventListener('click', clearAll);
});
