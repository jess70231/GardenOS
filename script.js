const CSV_FILE = "Plants.csv";
const PHOTO_FOLDER = "photos";
const EMPTY_VALUE = "Not added yet";

const page = document.body.dataset.page;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const plants = await loadPlants();

    if (page === "home") {
      renderHome(plants);
    }

    if (page === "detail") {
      renderDetail(plants);
    }
  } catch (error) {
    showLoadError(error);
  }
});

async function loadPlants() {
  const response = await fetch(`${CSV_FILE}?v=${Date.now()}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Plants.csv could not be loaded.");
  }

  const text = await response.text();
  return parseCsv(text).map(normalizePlant);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  const cleanText = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < cleanText.length; index += 1) {
    const char = cleanText[index];
    const nextChar = cleanText[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) {
        rows.push(row);
      }
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) {
    rows.push(row);
  }

  const headers = rows.shift().map((header) => header.trim());

  return rows.map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] || "").trim();
    });
    return record;
  });
}

function normalizePlant(row) {
  return {
    id: pick(row, ["Plant ID", "ID"]),
    chineseName: pick(row, ["Chinese Name", "Chinese"]),
    englishName: pick(row, ["English Name", "Name"]),
    variety: pick(row, ["Variety"]),
    location: pick(row, ["Location", "Area"]),
    quantity: pick(row, ["Quantity", "Qty", "Amounts", "Amount"]),
    plantingDate: pick(row, ["Planting Date", "Planting date", "Plant Date", "Plant date", "Date Planted", "Date planted", "Planted Date", "Planted date"]),
    purchasePrice: pick(row, ["Purchase Price", "Purchase price", "Price", "Cost"]),
    soilMix: pick(row, ["Soil Mix", "Soil mix", "Soil", "Potting Mix", "Potting mix"]),
    pots: pick(row, ["Pots", "Pot", "Pot Size", "Pot size"]),
    repottingDates: pick(row, ["Repotting Dates", "Repotting dates", "Repotting Date", "Repotting date", "Repoting Dates", "Repoting dates", "Repoting Date", "Repoting date"]),
    fertilisingDates: pick(row, ["Fertilising Dates", "Fertilising dates", "Fertilising Date", "Fertilising date", "Fertilizing Dates", "Fertilizing dates", "Fertilizer Dates", "Fertiliser Dates"]),
    fertiliserTypeUsed: pick(row, ["Fertiliser Type Used", "Fertiliser type used", "Fertilizer Type Used", "Fertilizer type used", "Fertiliser Type", "Fertilizer Type"]),
    sun: pick(row, ["Sun"]),
    water: pick(row, ["Water"]),
    fertiliser: pick(row, ["Fertiliser", "Fertilizer"]),
    pruning: pick(row, ["Pruning"]),
    flowering: pick(row, ["Flowering"]),
    notes: pick(row, ["Notes"]),
  };
}

function pick(row, names) {
  const rowKeys = Object.keys(row);
  const key = names.find((name) => Object.prototype.hasOwnProperty.call(row, name))
    || names
      .map((name) => rowKeys.find((rowKey) => rowKey.toLowerCase() === name.toLowerCase()))
      .find(Boolean);

  return key ? row[key] : "";
}

function renderHome(plants) {
  const searchInput = document.querySelector("#searchInput");
  const areaFilter = document.querySelector("#areaFilter");
  const plantCount = document.querySelector("#plantCount");
  const quantityCount = document.querySelector("#quantityCount");
  const areaCount = document.querySelector("#areaCount");

  plantCount.textContent = plants.length;
  quantityCount.textContent = totalQuantity(plants);
  areaCount.textContent = uniqueAreas(plants).length;
  buildAreaOptions(areaFilter, plants);

  const updateCatalog = () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const area = areaFilter.value;
    const filteredPlants = plants.filter((plant) => {
      const matchesSearch = searchableText(plant).includes(searchTerm);
      const matchesArea = area === "all" || plant.location === area;
      return matchesSearch && matchesArea;
    });

    renderPlantGrid(filteredPlants, plants.length);
  };

  searchInput.addEventListener("input", updateCatalog);
  areaFilter.addEventListener("change", updateCatalog);
  updateCatalog();
}

function buildAreaOptions(areaFilter, plants) {
  const areas = uniqueAreas(plants);

  areas.forEach((area) => {
    const option = document.createElement("option");
    option.value = area;
    option.textContent = area;
    areaFilter.append(option);
  });
}

function renderPlantGrid(plants, totalPlants) {
  const grid = document.querySelector("#plantGrid");
  const summary = document.querySelector("#resultsSummary");

  summary.textContent = `${plants.length} of ${totalPlants} plants shown`;
  grid.innerHTML = "";

  if (!plants.length) {
    grid.innerHTML = `<p class="empty-state">No plants match your search.</p>`;
    return;
  }

  plants.forEach((plant) => {
    const card = document.createElement("a");
    card.className = "plant-card";
    card.href = `plant.html?id=${encodeURIComponent(plant.id)}`;
    card.innerHTML = `
      <div class="card-photo">
        <img src="${photoPath(plant)}" alt="${escapeHtml(displayName(plant))}">
      </div>
      <div class="card-body">
        <div class="pill-row">
          <span class="pill">${escapeHtml(plant.id || EMPTY_VALUE)}</span>
        </div>
        <h2>${escapeHtml(displayName(plant))}</h2>
        <dl class="card-facts">
          ${smallFact("Area", plant.location)}
          ${smallFact("Qty", plant.quantity)}
          ${smallFact("Planted", plant.plantingDate)}
        </dl>
      </div>
    `;
    grid.append(card);
  });
}

function renderDetail(plants) {
  const detail = document.querySelector("#plantDetail");
  const plantId = new URLSearchParams(window.location.search).get("id");
  const plant = plants.find((item) => item.id === plantId);

  if (!plant) {
    detail.innerHTML = `<p class="empty-state">This plant could not be found. <a href="index.html">Return to the catalog.</a></p>`;
    return;
  }

  document.title = `${displayName(plant)} | Plant Catalog`;
  detail.innerHTML = `
    <section class="detail-hero">
      <div class="detail-photo">
        <img src="${photoPath(plant)}" alt="${escapeHtml(displayName(plant))}">
      </div>
      <div class="detail-intro">
        <p class="eyebrow">Plant ID ${escapeHtml(plant.id || EMPTY_VALUE)}</p>
        <h1>${escapeHtml(displayName(plant))}</h1>
        <p class="detail-meta">${escapeHtml(plant.location || EMPTY_VALUE)}</p>
        <div class="quick-stats">
          ${quickStat("Quantity", plant.quantity)}
          ${quickStat("Planted", plant.plantingDate)}
          ${quickStat("Price", formatPrice(plant.purchasePrice))}
        </div>
      </div>
    </section>
    <section class="detail-section">
      <div>
        <p class="section-kicker">Plant record</p>
        <h2>Identity and history</h2>
      </div>
      <dl class="details-list">
        ${detailItem("Plant ID", plant.id)}
        ${detailItem("Chinese Name", plant.chineseName)}
        ${detailItem("English Name", plant.englishName)}
        ${detailItem("Variety", plant.variety)}
        ${detailItem("Location", plant.location)}
        ${detailItem("Quantity", plant.quantity)}
        ${detailItem("Planting Date", plant.plantingDate)}
        ${detailItem("Purchase Price", formatPrice(plant.purchasePrice))}
        ${detailItem("Soil Mix", plant.soilMix)}
        ${detailItem("Pots", plant.pots)}
        ${detailItem("Repotting Dates", plant.repottingDates)}
        ${detailItem("Fertilising Dates", plant.fertilisingDates)}
        ${detailItem("Fertiliser Type Used", plant.fertiliserTypeUsed)}
      </dl>
    </section>
    <section class="detail-section care-section">
      <div>
        <p class="section-kicker">Care profile</p>
        <h2>How this plant likes to grow</h2>
      </div>
      <dl class="care-grid">
        ${careItem("Sun", plant.sun)}
        ${careItem("Water", plant.water)}
        ${careItem("Fertiliser", plant.fertiliser)}
        ${careItem("Pruning", plant.pruning)}
        ${careItem("Flowering", plant.flowering)}
      </dl>
    </section>
    <section class="detail-section notes-section">
      <div>
        <p class="section-kicker">Notes</p>
        <h2>Growing observations</h2>
      </div>
      <p>${escapeHtml(plant.notes || EMPTY_VALUE)}</p>
    </section>
  `;
}

function uniqueAreas(plants) {
  return [...new Set(plants.map((plant) => plant.location).filter(Boolean))].sort();
}

function totalQuantity(plants) {
  return plants.reduce((sum, plant) => {
    const quantity = Number(plant.quantity);
    return Number.isFinite(quantity) ? sum + quantity : sum;
  }, 0);
}

function smallFact(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || EMPTY_VALUE)}</dd>
    </div>
  `;
}

function quickStat(label, value) {
  return `
    <div class="quick-stat">
      <span>${escapeHtml(value || EMPTY_VALUE)}</span>
      <small>${escapeHtml(label)}</small>
    </div>
  `;
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || EMPTY_VALUE)}</dd>
    </div>
  `;
}

function careItem(label, value) {
  return `
    <div class="care-item">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || EMPTY_VALUE)}</dd>
    </div>
  `;
}

function searchableText(plant) {
  return [
    plant.id,
    plant.chineseName,
    plant.englishName,
    plant.variety,
    plant.location,
    plant.quantity,
    plant.plantingDate,
    plant.purchasePrice,
    plant.soilMix,
    plant.pots,
    plant.repottingDates,
    plant.fertilisingDates,
    plant.fertiliserTypeUsed,
    plant.sun,
    plant.water,
    plant.fertiliser,
    plant.pruning,
    plant.flowering,
    plant.notes,
  ]
    .join(" ")
    .toLowerCase();
}

function displayName(plant) {
  return [plant.englishName, plant.variety].filter(Boolean).join(" - ") || plant.id || "Plant";
}

function photoPath(plant) {
  return `${PHOTO_FOLDER}/${plant.id}.jpeg`;
}

function formatPrice(value) {
  if (!value) {
    return "";
  }

  const cleanedValue = value.replace(/[$,\s]/g, "");
  const numberValue = Number(cleanedValue);

  if (!Number.isFinite(numberValue)) {
    return value;
  }

  return `$${numberValue.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function showLoadError(error) {
  const target = page === "home" ? document.querySelector("#plantGrid") : document.querySelector("#plantDetail");
  const message = error.message || "The plant catalog could not be loaded.";

  target.innerHTML = `
    <p class="empty-state">
      ${escapeHtml(message)} If you opened this file by double-clicking, try using the local preview link instead.
    </p>
  `;
}
