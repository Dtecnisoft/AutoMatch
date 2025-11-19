// Use global cars provided by vehicles-data.js (included before this script in index.html)
const cars = window.cars || [];

// Currency conversion: display prices in Colombian Pesos (COP)
// Assumption: 1 EUR = 4,500 COP (adjustable). If you want a different rate,
// change EXCHANGE_RATE_EUR_TO_COP below or wire to a live API.
const EXCHANGE_RATE_EUR_TO_COP = 4500;
const CURRENCY_LOCALE = "es-CO";
const CURRENCY_CODE = "COP";

function convertEurToCop(eur) {
  return Math.round((Number(eur) || 0) * EXCHANGE_RATE_EUR_TO_COP);
}

function formatCOP(amountCOP) {
  return amountCOP.toLocaleString(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
    maximumFractionDigits: 0,
  });
}

const state = {
  budget: "all",
  usage: "any",
  fuel: "any",
  transmission: "any",
  search: "",
  priorityKey: "totalScore",
  carA: null,
  carB: null,
};

const els = {
  budgetFilter: document.getElementById("budgetFilter"),
  usageSelect: document.getElementById("usageSelect"),
  fuelSelect: document.getElementById("fuelSelect"),
  transmissionSelect: document.getElementById("transmissionSelect"),
  searchInput: document.getElementById("searchInput"),
  priorityChips: document.getElementById("priorityChips"),
  carSelectA: document.getElementById("carSelectA"),
  carSelectB: document.getElementById("carSelectB"),
  summaryRow: document.getElementById("summaryRow"),
  cardA: document.getElementById("cardA"),
  cardB: document.getElementById("cardB"),
};

function formatPrice(value) {
  // value is in EUR in the data; convert to COP for display
  const cop = convertEurToCop(value);
  return formatCOP(cop);
}

function scoreToLabel(score) {
  if (score >= 9) return "Excelente";
  if (score >= 8) return "Muy bueno";
  if (score >= 7) return "Bueno";
  if (score >= 6) return "Aceptable";
  return "Por debajo de la media";
}

function budgetBucket(price) {
  if (price <= 15000) return "low";
  if (price <= 30000) return "mid";
  return "high";
}

function matchesFilters(car) {
  if (state.budget !== "all" && budgetBucket(car.price) !== state.budget)
    return false;
  if (state.usage !== "any" && !car.tags.includes(state.usage)) return false;
  if (state.fuel !== "any" && car.fuel !== state.fuel) return false;
  if (
    state.transmission !== "any" &&
    car.transmission !== state.transmission
  )
    return false;

  const q = state.search.trim().toLowerCase();
  if (q) {
    const text = `${car.brand} ${car.model}`.toLowerCase();
    if (!text.includes(q)) return false;
  }

  return true;
}

function filteredCars() {
  return cars.filter(matchesFilters).sort((a, b) => {
    const key = state.priorityKey;
    return (b[key] || 0) - (a[key] || 0);
  });
}

function populateCarSelects() {
  const options = filteredCars();
  const selects = [els.carSelectA, els.carSelectB];

  selects.forEach((sel) => {
    const prev = sel.value;
    sel.innerHTML = "";
    options.forEach((car) => {
      const opt = document.createElement("option");
      opt.value = car.id;
      opt.textContent = `${car.brand} ${car.model}`;
      sel.appendChild(opt);
    });
    if (options.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "Sin resultados";
      sel.appendChild(opt);
      sel.disabled = true;
    } else {
      sel.disabled = false;
      const foundPrev = options.find((c) => c.id === prev);
      if (foundPrev) {
        sel.value = prev;
      } else {
        sel.selectedIndex = sel === els.carSelectA ? 0 : Math.min(1, options.length - 1);
      }
    }
  });

  const list = filteredCars();
  state.carA = list[0] || null;
  state.carB = list[1] || list[0] || null;

  if (state.carA) els.carSelectA.value = state.carA.id;
  if (state.carB) els.carSelectB.value = state.carB.id;
}

function renderSummary() {
  const { carA, carB } = state;
  els.summaryRow.innerHTML = "";

  if (!carA || !carB) {
    els.summaryRow.innerHTML = `
      <div class="summary-main">
        <div class="summary-title">Explora opciones para tu perfil</div>
        <div class="summary-sub">Ajusta filtros para ver coincidencias claras con tus prioridades.</div>
      </div>
    `;
    return;
  }

  const diffPrice = carB.price - carA.price;
  const winner =
    carA.totalScore === carB.totalScore
      ? null
      : carA.totalScore > carB.totalScore
      ? carA
      : carB;

  const advantageKey = state.priorityKey;
  const advWinner =
    carA[advantageKey] === carB[advantageKey]
      ? null
      : carA[advantageKey] > carB[advantageKey]
      ? carA
      : carB;

  const container = document.createElement("div");
  container.className = "summary-main";

  const title = document.createElement("div");
  title.className = "summary-title";
  title.textContent = winner
    ? `${winner.brand} ${winner.model} encaja mejor con lo que valoras`
    : "Ambas opciones son muy similares";

  const sub = document.createElement("div");
  sub.className = "summary-sub";
  const keyLabelMap = {
    totalScore: "equilibrio general",
    safetyScore: "seguridad",
    economyScore: "coste total",
    comfortScore: "comodidad",
  };
  const keyLabel = keyLabelMap[advantageKey] || "equilibrio general";

  sub.textContent = advWinner
    ? `${advWinner.brand} destaca ligeramente en ${keyLabel}, según tus prioridades.`
    : "No hay una diferencia clara según tus prioridades actuales.";

  container.appendChild(title);
  container.appendChild(sub);

  const pillRow = document.createElement("div");
  pillRow.className = "summary-pill-row";

  if (diffPrice !== 0) {
    const p = document.createElement("div");
    p.className =
      diffPrice > 0 ? "summary-pill negative" : "summary-pill positive";
    const cheaper = diffPrice > 0 ? carA : carB;
    p.textContent = `${cheaper.brand} ahorra ${formatPrice(Math.abs(diffPrice))}`;
    pillRow.appendChild(p);
  }

  const safetyGap = carA.safetyScore - carB.safetyScore;
  if (Math.abs(safetyGap) >= 0.5) {
    const safer = safetyGap > 0 ? carA : carB;
    const p = document.createElement("div");
    p.className = "summary-pill positive";
    p.textContent = `${safer.brand} ofrece mejor seguridad`;
    pillRow.appendChild(p);
  }

  const economyGap = carA.economyScore - carB.economyScore;
  if (Math.abs(economyGap) >= 0.5) {
    const eco = economyGap > 0 ? carA : carB;
    const p = document.createElement("div");
    p.className = "summary-pill positive";
    p.textContent = `${eco.brand} optimiza mejor el consumo`;
    pillRow.appendChild(p);
  }

  els.summaryRow.appendChild(container);
  if (pillRow.childElementCount > 0) {
    els.summaryRow.appendChild(pillRow);
  }
}

function renderCard(targetEl, car, sideLabel) {
  if (!car) {
    targetEl.innerHTML =
      '<div class="empty-card">Selecciona al menos un vehículo para ver detalles claros y comparables.</div>';
    return;
  }

  const scoreLabel = scoreToLabel(car.totalScore);
  const monthlyEstimateCOP = Math.round(convertEurToCop(car.price) * 0.022);

  targetEl.innerHTML = `
    <div class="car-header">
      <div class="car-title">
        <div class="car-name">${car.brand} ${car.model}</div>
        <div class="car-segment">${car.segment} • ${car.fuelLabel}</div>
      </div>
      <div class="car-price">
        ${formatPrice(car.price)}
        <div><span>≈ ${formatCOP(monthlyEstimateCOP)} /mes</span></div>
      </div>
    </div>

    <div class="badges-row">
      <div class="badge primary">${sideLabel}</div>
      <div class="badge">${scoreLabel}</div>
      <div class="badge">${car.transmissionLabel}</div>
      <div class="badge">${car.tagsLabel}</div>
    </div>

    <div class="score-bar">
      <div class="score-bar-fill" style="width:${(car.totalScore / 10) * 100}%"></div>
    </div>

    <div class="metrics-grid">
      <div class="metric-col">
        <div class="metric-row">
          <span>Seguridad</span>
          <strong>${car.safetyScore.toFixed(1)}/10</strong>
        </div>
        <div class="metric-row">
          <span>Consumo medio</span>
          <strong>${car.consumption} l/100km</strong>
        </div>
        <div class="metric-row">
          <span>Coste anual aprox.</span>
          <strong>${formatPrice(car.yearlyCost)} /año</strong>
        </div>
      </div>
      <div class="metric-col">
        <div class="metric-row">
          <span>Economía</span>
          <strong>${car.economyScore.toFixed(1)}/10</strong>
        </div>
        <div class="metric-row">
          <span>Comodidad</span>
          <strong>${car.comfortScore.toFixed(1)}/10</strong>
        </div>
        <div class="metric-row">
          <span>Maletero</span>
          <strong>${car.boot} L</strong>
        </div>
      </div>
    </div>

    <div class="metric-tagline">${car.highlight}</div>
  `;
}

function renderAll() {
  populateCarSelects();
  renderSummary();

  const labelA = "Opción A";
  const labelB = "Opción B";
  renderCard(els.cardA, state.carA, labelA);
  renderCard(els.cardB, state.carB, labelB);
}

/* EVENT LISTENERS */

els.budgetFilter.addEventListener("change", () => {
  state.budget = els.budgetFilter.value;
  renderAll();
});

els.usageSelect.addEventListener("change", () => {
  state.usage = els.usageSelect.value;
  renderAll();
});

els.fuelSelect.addEventListener("change", () => {
  state.fuel = els.fuelSelect.value;
  renderAll();
});

els.transmissionSelect.addEventListener("change", () => {
  state.transmission = els.transmissionSelect.value;
  renderAll();
});

let searchTimeout;
els.searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.search = els.searchInput.value;
    renderAll();
  }, 150);
});

els.priorityChips.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (!btn) return;
  state.priorityKey = btn.dataset.key;
  [...els.priorityChips.querySelectorAll(".chip")].forEach((c) =>
    c.classList.toggle("chip-active", c === btn)
  );
  renderAll();
});

els.carSelectA.addEventListener("change", () => {
  const id = els.carSelectA.value;
  state.carA = cars.find((c) => c.id === id) || null;
  renderSummary();
  renderCard(els.cardA, state.carA, "Opción A");
});

els.carSelectB.addEventListener("change", () => {
  const id = els.carSelectB.value;
  state.carB = cars.find((c) => c.id === id) || null;
  renderSummary();
  renderCard(els.cardB, state.carB, "Opción B");
});

/* INIT */

renderAll();