const CSV_FILE = "Plants.csv";
const QR_FOLDER = "QR";

document.addEventListener("DOMContentLoaded", async () => {
  const labels = document.querySelector("#labels");

  try {
    const plants = await loadPlants();
    labels.innerHTML = "";

    plants.forEach((plant) => {
      const label = document.createElement("section");
      label.className = "label";
      label.innerHTML = `
        <div class="qr-code">
          <img src="${QR_FOLDER}/${escapeHtml(plant.id)}.svg" alt="QR code for ${escapeHtml(plant.id)}">
        </div>
        <div class="label-text">
          <div class="plant-id">${escapeHtml(plant.id)}</div>
          <div class="plant-name">${escapeHtml(plant.name || "Plant")}</div>
          <div class="variety">${escapeHtml(plant.variety || "No variety")}</div>
        </div>
      `;
      labels.append(label);
    });
  } catch (error) {
    labels.innerHTML = `<p class="loading">${escapeHtml(error.message || "Labels could not be loaded.")}</p>`;
  }
});

async function loadPlants() {
  const response = await fetch(CSV_FILE);

  if (!response.ok) {
    throw new Error("Plants.csv could not be loaded.");
  }

  const text = await response.text();
  return parseCsv(text).map((row) => ({
    id: pick(row, ["Plant ID", "ID"]),
    name: pick(row, ["English Name", "Name"]),
    variety: pick(row, ["Variety"]),
  }));
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

function pick(row, names) {
  const key = names.find((name) => Object.prototype.hasOwnProperty.call(row, name));
  return key ? row[key] : "";
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
