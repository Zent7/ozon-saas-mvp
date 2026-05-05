let clientModalSelectedServices = new Set();
let clientModalServiceDetails = {};
let clientModalManualTotal = null;
let clientModalSubmitAction = "save";

const CLIENT_DRIVER_DEFAULT_CATEGORIES = ["A", "B", "C", "D", "BE", "M"];
const CLIENT_DRIVER_LIMITATIONS = [
  "Категории A, M, A1, B1",
  "Категории B, BE, B1",
  "Категории C, CE, D, DE, Tm, Tb, C1, D1, C1E, D1E",
];
const CLIENT_DRIVER_INDICATIONS = [
  "С ручным упр-ем",
  "С автоматич. трансмиссией",
  "Акустич. парковочная система",
  "ТС мед. изд. для коррекции зрения",
  "ТС мед. изд. для компенсации потери слуха",
];
const CLIENT_ADDRESS_STORAGE_KEY = "vova-medcenter-address-suggestions-v1";
const CLIENT_DEFAULT_COUNTRY = "Россия";
const CLIENT_ADDRESS_PRESETS = [
  { city: "Санкт-Петербург", subject: "Санкт-Петербург", district: "" },
  { city: "Кудрово", subject: "Ленинградская область", district: "Всеволожский район" },
  { city: "Мурино", subject: "Ленинградская область", district: "Всеволожский район" },
  { city: "Янино-1", subject: "Ленинградская область", district: "Всеволожский район" },
  { city: "Всеволожск", subject: "Ленинградская область", district: "Всеволожский район" },
  { city: "Шушары", subject: "Санкт-Петербург", district: "Пушкинский район" },
  { city: "Пушкин", subject: "Санкт-Петербург", district: "Пушкинский район" },
  { city: "Колпино", subject: "Санкт-Петербург", district: "Колпинский район" },
  { city: "Петергоф", subject: "Санкт-Петербург", district: "Петродворцовый район" },
];

function loadClientAddressSuggestions() {
  try {
    const parsed = JSON.parse(window.localStorage?.getItem(CLIENT_ADDRESS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveClientAddressSuggestion(entry = {}) {
  const city = String(entry.city || "").trim();
  if (!city) return;
  const nextEntry = {
    city,
    subject: String(entry.subject || "").trim(),
    district: String(entry.district || "").trim(),
    street: String(entry.street || "").trim(),
  };
  const existing = loadClientAddressSuggestions().filter((item) => String(item.city || "").toLowerCase() !== city.toLowerCase());
  window.localStorage?.setItem(CLIENT_ADDRESS_STORAGE_KEY, JSON.stringify([nextEntry, ...existing].slice(0, 60)));
}

function parseClientAddressSuggestion(addressText = "") {
  const parts = String(addressText || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;

  const isCountryValue = (value = "") => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\./g, "");
    return ["россия", "рф", "российская федерация"].includes(normalized);
  };

  if (isCountryValue(parts[0])) {
    return {
      country: parts[0] || CLIENT_DEFAULT_COUNTRY,
      subject: parts[1] || "",
      district: parts[2] || "",
      city: parts[3] || "",
      street: parts[4] || "",
      house: parts[5] || "",
      building: parts[6] || "",
      flat: parts[7] || "",
    };
  }

  return {
    country: CLIENT_DEFAULT_COUNTRY,
    subject: "",
    district: parts[1] || "",
    city: parts[0] || "",
    street: parts[2] || "",
    house: parts[3] || "",
    building: parts[4] || "",
    flat: parts[5] || "",
  };
}

function getClientAddressSuggestionsFromClients() {
  const clients = [...(data?.backendClients || []), ...(data?.clients || [])];
  return clients
    .map((client) => {
      const raw = client?.rawApiClient || {};
      return parseClientAddressSuggestion(client?.registration || raw.registration_text || raw.address_text || "");
    })
    .filter((item) => item?.city);
}

function getClientAddressOptions() {
  const saved = loadClientAddressSuggestions();
  const byCity = new Map();
  [...saved, ...getClientAddressSuggestionsFromClients(), ...CLIENT_ADDRESS_PRESETS].forEach((item) => {
    const city = String(item.city || "").trim();
    if (!city || byCity.has(city.toLowerCase())) return;
    byCity.set(city.toLowerCase(), item);
  });
  return Array.from(byCity.values());
}

function renderClientAddressDatalists() {
  const options = getClientAddressOptions();
  const streetOptions = [...loadClientAddressSuggestions(), ...getClientAddressSuggestionsFromClients()]
    .map((item) => String(item.street || "").trim())
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
  return `
    <datalist id="clientCitySuggestions">
      ${options.map((item) => `<option value="${escapeHtml(item.city)}">${escapeHtml([item.subject, item.district].filter(Boolean).join(", "))}</option>`).join("")}
    </datalist>
    <datalist id="clientStreetSuggestions">
      ${streetOptions.map((street) => `<option value="${escapeHtml(street)}"></option>`).join("")}
    </datalist>
  `;
}

function bindClientAddressAutocomplete(form) {
  const countryInput = form?.elements.country;
  const cityInput = form?.elements.city;
  const subjectInput = form?.elements.subject;
  const districtInput = form?.elements.district;
  if (!cityInput || !subjectInput || !districtInput) return;

  if (countryInput && !String(countryInput.value || "").trim()) {
    countryInput.value = CLIENT_DEFAULT_COUNTRY;
  }

  const applyPreset = () => {
    const city = String(cityInput.value || "").trim().toLowerCase();
    const preset = getClientAddressOptions().find((item) => String(item.city || "").trim().toLowerCase() === city);
    if (!preset) {
      if (subjectInput.dataset.autofilled === "true") subjectInput.value = "";
      if (districtInput.dataset.autofilled === "true") districtInput.value = "";
      delete subjectInput.dataset.autofilled;
      delete districtInput.dataset.autofilled;
      return;
    }

    subjectInput.value = preset.subject || "";
    districtInput.value = preset.district || "";
    subjectInput.dataset.autofilled = "true";
    districtInput.dataset.autofilled = "true";
  };

  cityInput.addEventListener("input", applyPreset);
  cityInput.addEventListener("change", applyPreset);
  cityInput.addEventListener("blur", applyPreset);

  const saveCurrentAddress = () => {
    saveClientAddressSuggestion({
      subject: form.elements.subject?.value,
      district: form.elements.district?.value,
      city: form.elements.city?.value,
      street: form.elements.street?.value,
    });
  };
  ["subject", "district", "city", "street"].forEach((name) => {
    const input = form.elements[name];
    input?.addEventListener("change", saveCurrentAddress);
    input?.addEventListener("blur", saveCurrentAddress);
  });
}

function getActiveClientServiceGroups() {
  return serviceGroups
    .filter((group) => group.isActive !== false)
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function getVisibleClientServices(groupId) {
  const visibleServices = structuredServices
    .filter((service) => service.isActive !== false)
    .filter((service) => String(service.groupId) === String(groupId))
    .filter((service) => {
      const normalizedName = String(service.name || "").trim().toLowerCase();
      return !normalizedName.includes("дубл");
    })
    .slice();

  const uniqueVisibleServices = [];
  const seenServiceNames = new Set();

  visibleServices.forEach((service) => {
    const normalizedName = String(service.name || "").trim().toLowerCase();
    if (!normalizedName || seenServiceNames.has(normalizedName)) return;
    seenServiceNames.add(normalizedName);
    uniqueVisibleServices.push(service);
  });

  return uniqueVisibleServices;
}

function getClientModalSelectedServicesFromDom() {
  actionModalContent.querySelectorAll('#serviceSelectorContainer input[name="services"]').forEach((input) => {
    if (input.checked) {
      clientModalSelectedServices.add(input.value);
    } else {
      clientModalSelectedServices.delete(input.value);
    }
  });
  return Array.from(clientModalSelectedServices);
}

function getClientSelectedDriverService(selectedServices = []) {
  return selectedServices
    .map((name) => getServerServiceByName(name) || structuredServices.find((service) => service.name === name))
    .find((service) => service && isDriverService(service)) || null;
}

function getClientDriverCategoriesFromForm() {
  const checked = Array.from(actionModalContent.querySelectorAll('input[name="clientDriverCategory"]:checked'))
    .map((input) => input.value);
  return checked.length ? checked : CLIENT_DRIVER_DEFAULT_CATEGORIES.slice();
}

function renderClientClassicCheckbox(name, value, label, checked = false) {
  return `
    <label class="client-classic-checkbox">
      <span>${escapeHtml(label)}</span>
      <input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(value)}" ${checked ? "checked" : ""} />
    </label>
  `;
}

function renderClientDriverClassicPanel(selectedServices = [], selectedCategories = CLIENT_DRIVER_DEFAULT_CATEGORIES) {
  const selectedDriverService = getClientSelectedDriverService(selectedServices);
  if (!selectedDriverService) return "";

  const normalizedCategories = Array.isArray(selectedCategories)
    ? DRIVER_CATEGORY_OPTIONS.filter((item) => selectedCategories.includes(item))
    : CLIENT_DRIVER_DEFAULT_CATEGORIES.slice();

  return `
    <div class="client-driver-classic">
      <div class="client-driver-tabs">
        <button type="button">Основное</button>
        <button type="button" class="active">Водительская</button>
        <button type="button">Тракторная</button>
      </div>

      <div class="client-driver-layout">
        <div class="client-driver-doctors">
          ${["Терапевт", "Офтальмолог", "Невролог", "Оториноларинголог", "Инструментальное исследование"]
            .map(
              (label) => `
                <label class="client-driver-doctor-field">
                  <span>${label}</span>
                  <select>
                    <option>-</option>
                  </select>
                </label>
              `,
            )
            .join("")}
          <label class="client-driver-doctor-field">
            <span>Лабораторные исследования</span>
            <input value="Не установлено" />
          </label>
        </div>

        <div class="client-driver-categories">
          <div class="client-driver-category-row client-driver-category-row--top">
            ${["A", "B", "C", "D"].map((category) => renderClientClassicCheckbox("clientDriverCategory", category, category, normalizedCategories.includes(category))).join("")}
          </div>
          <div class="client-driver-category-row">
            ${["BE", "CE", "DE"].map((category) => renderClientClassicCheckbox("clientDriverCategory", category, category, normalizedCategories.includes(category))).join("")}
          </div>
          <div class="client-driver-category-row">
            ${["M", "Tm", "Tb"].map((category) => renderClientClassicCheckbox("clientDriverCategory", category, category, normalizedCategories.includes(category))).join("")}
          </div>
        </div>

        <div class="client-driver-box client-driver-box--limits">
          <strong>Мед. ограничения к упр-ию ТС</strong>
          ${CLIENT_DRIVER_LIMITATIONS.map((item) => renderClientClassicCheckbox("clientDriverLimit", item, item, false)).join("")}
          <span class="client-driver-red-dot">•</span>
        </div>

        <div class="client-driver-box client-driver-box--indications">
          <strong>Мед. показания к упр-ию ТС</strong>
          ${CLIENT_DRIVER_INDICATIONS.map((item) => renderClientClassicCheckbox("clientDriverIndication", item, item, false)).join("")}
        </div>
      </div>

      <div class="client-driver-footer">
        <label class="client-classic-checkbox client-classic-checkbox--inline">
          <span>Годен к упр-ю маломер. судами</span>
          <input type="checkbox" name="clientDriverBoatFit" />
        </label>
        <label class="client-driver-chief">
          <span>Гл.врач</span>
          <input value="Сибирцев Вячеслав Александрович" />
        </label>
      </div>
    </div>
  `;
}

function refreshClientDriverPanel() {
  const container = document.getElementById("clientDriverPanelContainer");
  if (!container) return;
  const selectedServices = getClientModalSelectedServicesFromDom();
  const selectedCategories = getClientDriverCategoriesFromForm();
  container.innerHTML = renderClientDriverClassicPanel(selectedServices, selectedCategories);
  bindClientDriverCategoryCheckboxes();
}

function bindClientDriverCategoryCheckboxes() {
  actionModalContent.querySelectorAll('input[name="clientDriverCategory"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const selectedServices = getClientModalSelectedServicesFromDom();
      const container = document.getElementById("clientDriverPanelContainer");
      if (container) {
        container.innerHTML = renderClientDriverClassicPanel(selectedServices, getClientDriverCategoriesFromForm());
        bindClientDriverCategoryCheckboxes();
      }
      refreshClientPaymentPanel({ driverCategoriesChanged: true });
    });
  });
}

function getClientServiceItemsByNames(selectedServices = []) {
  return selectedServices
    .map((name) => getServerServiceByName(name) || structuredServices.find((service) => service.name === name))
    .filter(Boolean);
}

function getClientServiceDetailKey(service) {
  return String(getServiceToken(service) || service?.name || "");
}

function getDefaultServiceUnitPrice(service) {
  if (service && isDriverService(service)) {
    return getDriverCategoryPrice(normalizeDriverCategories(getClientDriverCategoriesFromForm()));
  }
  return Number(service?.price || 0);
}

function syncClientPaymentRowsFromDom() {
  actionModalContent.querySelectorAll("[data-client-payment-service]").forEach((row) => {
    const serviceKey = row.dataset.clientPaymentService;
    if (!serviceKey) return;
    const current = clientModalServiceDetails[serviceKey] || {};
    clientModalServiceDetails[serviceKey] = {
      ...current,
      unitPrice: Number(row.querySelector('[name="clientServicePrice"]')?.value || 0),
      paymentType: row.querySelector('[name="clientServicePaymentType"]')?.value || current.paymentType || "cash",
      comment: row.querySelector('[name="clientServiceComment"]')?.value || "",
    };
  });
}

function getClientServiceDraftDetail(service) {
  const key = getClientServiceDetailKey(service);
  const existing = clientModalServiceDetails[key] || {};
  const defaultUnitPrice = getDefaultServiceUnitPrice(service);
  return {
    ...existing,
    unitPrice: Number(existing.unitPrice ?? defaultUnitPrice ?? 0),
    paymentType: existing.paymentType || "cash",
    comment: existing.comment || "",
  };
}

function getClientPaymentRowsTotal() {
  return Array.from(actionModalContent.querySelectorAll('[name="clientServicePrice"]'))
    .reduce((sum, input) => sum + Number(input.value || 0), 0);
}

function updateClientPaymentTotal() {
  const totalInput = document.getElementById("clientPaymentTotalInput");
  const totalNode = document.getElementById("clientPaymentTotalValue");
  if (!totalInput) return;
  const total = clientModalManualTotal ?? getClientPaymentRowsTotal();
  totalInput.value = Number(total || 0);
  if (totalNode) totalNode.textContent = Number(total || 0).toLocaleString("ru-RU");
}

function getClientPaymentTotalOverride() {
  const totalInput = document.getElementById("clientPaymentTotalInput");
  if (!totalInput) return clientModalManualTotal;
  const rawValue = String(totalInput.value || "").replace(",", ".");
  if (!rawValue.trim()) return null;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : null;
}

function renderClientPaymentRows(selectedServices = []) {
  const serviceItems = getClientServiceItemsByNames(selectedServices);
  if (!serviceItems.length) {
    return "";
  }

  const rows = serviceItems.map((service) => {
    const serviceKey = getClientServiceDetailKey(service);
    const detail = getClientServiceDraftDetail(service);
    return `
      <div class="client-payment-row" data-client-payment-service="${escapeHtml(serviceKey)}">
        <div class="client-payment-row__service">${escapeHtml(service.name)}</div>
        <label class="field">
          <span>Цена</span>
          <input name="clientServicePrice" type="number" min="0" step="0.01" value="${Number(detail.unitPrice || 0)}" />
        </label>
        <label class="field">
          <span>Оплата</span>
          <select name="clientServicePaymentType">
            <option value="cash" ${detail.paymentType === "cash" ? "selected" : ""}>нал</option>
            <option value="card" ${detail.paymentType === "card" ? "selected" : ""}>карта</option>
            <option value="invoice" ${detail.paymentType === "invoice" ? "selected" : ""}>безнал</option>
          </select>
        </label>
        <label class="field client-payment-row__comment">
          <span>Комментарий</span>
          <input name="clientServiceComment" value="${escapeHtml(detail.comment || "")}" placeholder="скидка, договоренность" />
        </label>
      </div>
    `;
  }).join("");

  return `
    <div class="client-payment-block">
      <div class="client-payment-block__head">
        <label class="client-payment-total">
          <span>Итоговая цена</span>
          <input id="clientPaymentTotalInput" name="clientPaymentTotal" type="number" min="0" step="0.01" value="0" />
          <b>₽</b>
        </label>
        <strong>Выбранные услуги</strong>
        <span>Итого: <b id="clientPaymentTotalValue">0</b> ₽</span>
      </div>
      <div class="client-payment-list">${rows}</div>
    </div>
  `;
}

function bindClientPaymentRows() {
  actionModalContent.querySelectorAll("[data-client-payment-service]").forEach((row) => {
    row.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", () => {
        if (input.name === "clientServicePrice") {
          clientModalManualTotal = null;
        }
        syncClientPaymentRowsFromDom();
        if (input.name === "clientServicePrice") updateClientPaymentTotal();
      });
      input.addEventListener("change", () => {
        if (input.name === "clientServicePrice") {
          clientModalManualTotal = null;
        }
        syncClientPaymentRowsFromDom();
        if (input.name === "clientServicePrice") updateClientPaymentTotal();
      });
    });
  });
  const totalInput = document.getElementById("clientPaymentTotalInput");
  if (totalInput) {
    totalInput.addEventListener("input", () => {
      clientModalManualTotal = getClientPaymentTotalOverride();
      updateClientPaymentTotal();
    });
    totalInput.addEventListener("change", () => {
      clientModalManualTotal = getClientPaymentTotalOverride();
      updateClientPaymentTotal();
    });
  }
  updateClientPaymentTotal();
}

function refreshClientPaymentPanel({ driverCategoriesChanged = false } = {}) {
  syncClientPaymentRowsFromDom();
  const selectedServices = getClientModalSelectedServicesFromDom();
  const selectedDriverService = getClientSelectedDriverService(selectedServices);
  if (driverCategoriesChanged && selectedDriverService) {
    const driverKey = getClientServiceDetailKey(selectedDriverService);
    const current = clientModalServiceDetails[driverKey] || {};
    clientModalServiceDetails[driverKey] = {
      ...current,
      unitPrice: getDefaultServiceUnitPrice(selectedDriverService),
    };
  }
  const container = document.getElementById("clientPaymentContainer");
  if (!container) return;
  container.innerHTML = renderClientPaymentRows(selectedServices);
  bindClientPaymentRows();
}

function buildClientServiceDetails(selectedServices = []) {
  syncClientPaymentRowsFromDom();
  const details = {};
  const serviceItems = getClientServiceItemsByNames(selectedServices);
  serviceItems.forEach((service) => {
    const serviceId = getClientServiceDetailKey(service);
    const draft = getClientServiceDraftDetail(service);
    details[serviceId] = {
      unitPrice: Number(draft.unitPrice || 0),
      paymentType: draft.paymentType || "cash",
      comment: draft.comment || "",
    };
  });

  const selectedDriverService = getClientSelectedDriverService(selectedServices);
  if (selectedDriverService) {
    const categories = normalizeDriverCategories(getClientDriverCategoriesFromForm());
    const serviceId = getClientServiceDetailKey(selectedDriverService);
    details[serviceId] = {
      ...(details[serviceId] || {}),
      categories,
      unitPrice: Number(details[serviceId]?.unitPrice ?? getDriverCategoryPrice(categories)),
      autoDoctorRoles: getDriverRoleCodes(categories),
    };
  }

  if (clientModalManualTotal === null) return details;

  const normalizedTotal = Math.round(Number(clientModalManualTotal || 0) * 100) / 100;
  if (!Number.isFinite(normalizedTotal) || !serviceItems.length) return details;

  const detailKeys = serviceItems.map((service) => getClientServiceDetailKey(service));
  const sourceTotal = detailKeys.reduce((sum, key) => sum + Number(details[key]?.unitPrice || 0), 0);

  if (sourceTotal > 0) {
    let distributedTotal = 0;
    detailKeys.forEach((key, index) => {
      const currentValue = Number(details[key]?.unitPrice || 0);
      const nextValue = index === detailKeys.length - 1
        ? Math.round((normalizedTotal - distributedTotal) * 100) / 100
        : Math.round(((currentValue / sourceTotal) * normalizedTotal) * 100) / 100;
      details[key] = {
        ...(details[key] || {}),
        unitPrice: nextValue,
      };
      distributedTotal = Math.round((distributedTotal + nextValue) * 100) / 100;
    });
    return details;
  }

  const evenValue = Math.round((normalizedTotal / detailKeys.length) * 100) / 100;
  let distributedTotal = 0;
  detailKeys.forEach((key, index) => {
    const nextValue = index === detailKeys.length - 1
      ? Math.round((normalizedTotal - distributedTotal) * 100) / 100
      : evenValue;
    details[key] = {
      ...(details[key] || {}),
      unitPrice: nextValue,
    };
    distributedTotal = Math.round((distributedTotal + nextValue) * 100) / 100;
  });

  return details;
}

function getClientVisitPaymentSummary(selectedServices = [], serviceDetails = {}, baseComment = "") {
  const serviceItems = getClientServiceItemsByNames(selectedServices);
  const firstPaymentType = serviceItems
    .map((service) => serviceDetails[getClientServiceDetailKey(service)]?.paymentType)
    .find(Boolean) || "cash";
  const comments = serviceItems
    .map((service) => {
      const comment = serviceDetails[getClientServiceDetailKey(service)]?.comment;
      return comment ? `${service.name}: ${comment}` : "";
    })
    .filter(Boolean);
  return {
    paymentType: firstPaymentType,
    comment: [String(baseComment || "").trim(), ...comments].filter(Boolean).join("; "),
  };
}

function getClientServiceIdsByNames(selectedServices = []) {
  return selectedServices
    .map((name) => getServerServiceByName(name))
    .filter(Boolean)
    .map((service) => getServiceToken(service));
}

function renderClientServiceSelector(selectedServices = []) {
  const selectedSet = new Set(selectedServices);
  const groups = getActiveClientServiceGroups();
  const availableGroupIds = new Set(groups.map((group) => String(group.id)));
  const fallbackGroupId = groups.length ? String(groups[0].id) : "";
  const currentGroup = availableGroupIds.has(String(appState.clientServiceGroupFilter || ""))
    ? String(appState.clientServiceGroupFilter)
    : fallbackGroupId;

  appState.clientServiceGroupFilter = currentGroup;

  const visibleServices = currentGroup ? getVisibleClientServices(currentGroup) : [];

  return `
    <div class="client-services-block">
      <div class="client-services-block__title">Услуги</div>

      <div class="sketch-doctors sketch-doctors--top" style="margin-bottom:12px;">
        ${groups
          .map(
            (group) => `
              <button
                type="button"
                class="doctor-pill ${String(currentGroup) === String(group.id) ? "active" : ""}"
                data-client-service-group="${group.id}"
              >
                ${escapeHtml(group.name)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="client-services-list">
        ${
          visibleServices.length
            ? visibleServices
                .map(
                  (service) => `
                    <label class="client-service-chip">
                      <input
                        type="checkbox"
                        name="services"
                        value="${escapeHtml(service.name)}"
                        ${selectedSet.has(service.name) ? "checked" : ""}
                      />
                      <span>${escapeHtml(service.name)}</span>
                    </label>
                  `,
                )
                .join("")
            : '<div class="muted">В этой группе услуг пока нет</div>'
        }
      </div>
    </div>
  `;
}

function bindClientServiceGroupButtons() {
  actionModalContent.querySelectorAll('#serviceSelectorContainer input[name="services"]').forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      refreshClientDriverPanel();
      refreshClientPaymentPanel();
    });
  });

  actionModalContent.querySelectorAll("[data-client-service-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedNow = getClientModalSelectedServicesFromDom();

      appState.clientServiceGroupFilter = button.dataset.clientServiceGroup;

      const container = document.getElementById("serviceSelectorContainer");
      if (container) {
        container.outerHTML = `<div id="serviceSelectorContainer">${renderClientServiceSelector(selectedNow)}</div>`;
      }

      bindClientServiceGroupButtons();
      refreshClientDriverPanel();
      refreshClientPaymentPanel();
    });
  });
}

function openClientModal(clientId = null) {
  const selectedClient = window.getSelectedClient?.();
  const editingClient = clientId
    ? selectedClient && String(selectedClient.id) === String(clientId)
      ? selectedClient
      : data.clients.find((client) => String(client.id) === String(clientId))
    : null;
  const raw = editingClient ? editingClient.fullName : appState.clientSearch.trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const [lastName = "", firstName = "", middleName = ""] = parts;
  const sortedGroups = getActiveClientServiceGroups();
  const initialAddress = parseClientAddressSuggestion(
    editingClient?.registration ||
    editingClient?.rawApiClient?.registration_text ||
    editingClient?.rawApiClient?.address_text ||
    "",
  ) || {};

  if (!appState.clientServiceGroupFilter || !sortedGroups.some((group) => String(group.id) === String(appState.clientServiceGroupFilter))) {
    appState.clientServiceGroupFilter = sortedGroups.length ? String(sortedGroups[0].id) : "";
  }

  const initialSelectedServices = editingClient?.services || [];
  clientModalSelectedServices = new Set(initialSelectedServices);
  const initialVisit = editingClient ? window.getCurrentVisitForClient?.(editingClient.id) : null;
  clientModalServiceDetails = { ...(initialVisit?.serviceDetails || {}) };
  clientModalManualTotal = initialVisit?.amount !== undefined && initialVisit?.amount !== null
    ? Number(initialVisit.amount)
    : null;
  clientModalSubmitAction = "save";
  const defaultGender = editingClient?.gender || editingClient?.sex || "";
  const initialBirthPlace =
    editingClient?.birthPlace ||
    editingClient?.rawApiClient?.birth_place ||
    editingClient?.rawApiClient?.legacy_payload_json?.birth_place ||
    "";
  const initialDocumentType =
    editingClient?.rawApiClient?.document_type ||
    String(editingClient?.document || "").split(" ").slice(0, 2).join(" ").trim() ||
    "";
  const initialProfession =
    editingClient?.profession ||
    editingClient?.rawApiClient?.profession ||
    editingClient?.rawApiClient?.legacy_payload_json?.profession ||
    "";
  const initialWorkPlace =
    editingClient?.workPlace ||
    editingClient?.rawApiClient?.work_place ||
    editingClient?.rawApiClient?.legacy_payload_json?.work_place ||
    "";
  const initialOrganization =
    editingClient?.organization ||
    editingClient?.rawApiClient?.organization ||
    editingClient?.rawApiClient?.legacy_payload_json?.organization ||
    "";

  openActionModal(
    editingClient ? "Изменить клиента" : "Новый клиент",
    `
      <form class="client-create-form" id="clientCreateForm">
        <div class="client-create-shell">
        <section class="client-create-section client-create-section--accent">
          <div class="client-create-section__head">
            <div>
              <span class="client-create-section__eyebrow">Карточка клиента</span>
              <strong>${editingClient ? "Обновление данных пациента" : "Новый пациент в журнале"}</strong>
            </div>
            <span class="client-create-section__badge">${editingClient ? "Редактирование" : "Создание"}</span>
          </div>
        <div class="client-create-grid client-create-grid--names">
          <label class="field">
            <span>Фамилия</span>
            <input name="lastName" value="${escapeHtml(lastName)}" />
          </label>
          <label class="field">
            <span>Имя</span>
            <input name="firstName" value="${escapeHtml(firstName)}" />
          </label>
          <label class="field">
            <span>Отчество</span>
            <input name="middleName" value="${escapeHtml(middleName)}" />
          </label>
        </div>

        <div class="client-create-grid client-create-grid--top">
          <label class="field">
            <span>Дата рождения</span>
            <input name="birthDate" data-date-mask value="${escapeHtml(editingClient?.birthDate || "")}" />
          </label>
          <label class="field">
            <span>Пол</span>
            <select name="gender">
              <option value="" ${defaultGender ? "" : "selected"}></option>
              <option ${defaultGender === "муж" || defaultGender === "M" ? "selected" : ""}>муж</option>
              <option ${defaultGender === "жен" || defaultGender === "F" ? "selected" : ""}>жен</option>
            </select>
          </label>
          <label class="field">
            <span>Место рождения</span>
            <input name="birthPlace" value="${escapeHtml(initialBirthPlace)}" list="clientCitySuggestions" />
          </label>
        </div>

        </section>

        <section class="client-create-section">
          <div class="client-create-section__head">
            <div>
              <span class="client-create-section__eyebrow">Документы и адрес</span>
              <strong>Идентификация пациента</strong>
            </div>
          </div>
        <div class="client-create-grid client-create-grid--document">
          <label class="field">
            <span>Документ</span>
            <select name="documentType">
              <option value="" ${initialDocumentType ? "" : "selected"}></option>
              <option ${initialDocumentType === "Паспорт РФ" ? "selected" : ""}>Паспорт РФ</option>
              <option ${initialDocumentType === "Другое" ? "selected" : ""}>Другое</option>
            </select>
          </label>
          <label class="field">
            <span>Серия</span>
            <input name="passportSeries" value="" />
          </label>
          <label class="field">
            <span>Номер</span>
            <input name="passportNumber" value="" />
          </label>
          <label class="field">
            <span>Дата выдачи</span>
            <input name="passportDate" data-date-mask value="" />
          </label>
          <label class="field field--wide">
            <span>Кем выдан</span>
            <input name="issuedBy" value="" />
          </label>
        </div>

        <div class="client-create-grid client-create-grid--address">
          ${renderClientAddressDatalists()}
          <label class="field">
            <span>Страна</span>
            <input name="country" value="${escapeHtml(initialAddress.country || CLIENT_DEFAULT_COUNTRY)}" />
          </label>
          <label class="field">
            <span>Субъект РФ</span>
            <input name="subject" value="${escapeHtml(initialAddress.subject || "")}" />
          </label>
          <label class="field">
            <span>Район</span>
            <input name="district" value="${escapeHtml(initialAddress.district || "")}" />
          </label>
          <label class="field">
            <span>Город</span>
            <input name="city" value="${escapeHtml(initialAddress.city || "")}" list="clientCitySuggestions" />
          </label>
          <label class="field">
            <span>Улица</span>
            <input name="street" value="${escapeHtml(initialAddress.street || "")}" list="clientStreetSuggestions" />
          </label>
          <label class="field">
            <span>Дом</span>
            <input name="house" value="${escapeHtml(initialAddress.house || "")}" />
          </label>
          <label class="field">
            <span>Корпус</span>
            <input name="building" value="${escapeHtml(initialAddress.building || "")}" />
          </label>
          <label class="field">
            <span>Кв.</span>
            <input name="flat" value="${escapeHtml(initialAddress.flat || "")}" />
          </label>
        </div>

        </section>

        <section class="client-create-section">
          <div class="client-create-section__head">
            <div>
              <span class="client-create-section__eyebrow">Контакты и работа</span>
              <strong>Связь и контекст пациента</strong>
            </div>
          </div>
        <div class="client-create-grid client-create-grid--contacts">
          <label class="field">
            <span>Телефон</span>
            <input name="phone" value="${escapeHtml(editingClient?.phone || "")}" />
          </label>
          <label class="field">
            <span>E-mail</span>
            <input name="email" value="" />
          </label>
          <label class="field">
            <span>СНИЛС</span>
            <input name="snils" value="${escapeHtml(editingClient?.snils || "")}" />
          </label>
          <label class="field">
            <span>Агент</span>
            <input name="agent" value="${escapeHtml(editingClient?.agent || "")}" />
          </label>
        </div>

        <div class="client-create-grid client-create-grid--contacts">
          <label class="field">
            <span>Профессия</span>
            <input name="profession" value="${escapeHtml(initialProfession)}" />
          </label>
          <label class="field">
            <span>Место работы</span>
            <input name="workPlace" value="${escapeHtml(initialWorkPlace)}" />
          </label>
          <label class="field">
            <span>Организация</span>
            <input name="organization" value="${escapeHtml(initialOrganization)}" />
          </label>
        </div>

        <label class="field">
          <span>Комментарий</span>
          <textarea name="comment" rows="2">${escapeHtml(editingClient?.note || "")}</textarea>
        </label>

        </section>

        <section class="client-create-section">
          <div class="client-create-section__head">
            <div>
              <span class="client-create-section__eyebrow">Услуги и оформление</span>
              <strong>Выбор сценария обслуживания</strong>
            </div>
          </div>
        <div id="serviceSelectorContainer">
          ${renderClientServiceSelector(initialSelectedServices)}
        </div>
        <div id="clientDriverPanelContainer">
          ${renderClientDriverClassicPanel(initialSelectedServices)}
        </div>
        <div id="clientPaymentContainer">
          ${renderClientPaymentRows(initialSelectedServices)}
        </div>

        </section>

        <div class="client-create-actions">
          <button type="button" class="ghost-button" id="cancelClientCreate">Отмена</button>
          <button type="submit" class="ghost-button" name="clientSubmitAction" value="contract">ОК + договор</button>
          <button type="submit" class="primary-button">ОК</button>
        </div>
        </div>
      </form>
    `,
  );

  const form = document.getElementById("clientCreateForm");
  const cancel = document.getElementById("cancelClientCreate");
  const contractSubmitButton = form?.querySelector('[name="clientSubmitAction"][value="contract"]');
  const defaultSubmitButton = form?.querySelector('.primary-button[type="submit"], .primary-button:not([type])');

  if (form) {
    attachDateMask(form);
    bindClientAddressAutocomplete(form);
  }

  bindClientServiceGroupButtons();
  bindClientDriverCategoryCheckboxes();
  bindClientPaymentRows();

  cancel?.addEventListener("click", () => {
    actionModal.classList.add("hidden");
  });

  contractSubmitButton?.addEventListener("click", () => {
    clientModalSubmitAction = "contract";
  });

  defaultSubmitButton?.addEventListener("click", () => {
    clientModalSubmitAction = "save";
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const shouldOpenContract = clientModalSubmitAction === "contract" || event.submitter?.value === "contract";
    const formData = new FormData(form);
    const encounterDateText = String(
      editingClient?.encounterDate || editingClient?.lastVisit || formatDateTime(new Date()),
    ).trim();
    const center = appState.centerFilter === "all" ? "Медцентр 1" : appState.centerFilter;
    const fullName = [formData.get("lastName"), formData.get("firstName"), formData.get("middleName")]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");
    const selectedServiceValues = getClientModalSelectedServicesFromDom()
      .map((value) => String(value).trim())
      .filter(Boolean);
    const selectedServiceIds = getClientServiceIdsByNames(selectedServiceValues);
    const serviceDetails = buildClientServiceDetails(selectedServiceValues);
    const paymentSummary = getClientVisitPaymentSummary(selectedServiceValues, serviceDetails, formData.get("comment"));
    const totalOverride = getClientPaymentTotalOverride();
    const visitAmount = totalOverride ?? (
      window.calculateVisitAmountByIds
        ? window.calculateVisitAmountByIds(selectedServiceIds, serviceDetails)
        : window.calculateVisitAmount?.(selectedServiceValues)
    );

    let targetClient =
      editingClient ||
      {
        id: `draft-${Date.now()}`,
        patientNumber: "",
      };

    Object.assign(targetClient, {
      fullName: fullName || "Новый клиент",
      birthDate: String(formData.get("birthDate") || "").trim(),
      birthPlace: String(formData.get("birthPlace") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      profession: String(formData.get("profession") || "").trim(),
      workPlace: String(formData.get("workPlace") || "").trim(),
      organization: String(formData.get("organization") || "").trim(),
      center: editingClient?.center || center,
      document: [
        String(formData.get("documentType") || "").trim(),
        String(formData.get("passportSeries") || "").trim(),
        String(formData.get("passportNumber") || "").trim(),
      ]
        .filter(Boolean)
        .join(" "),
      snils: String(formData.get("snils") || "").trim(),
      agent: String(formData.get("agent") || "").trim(),
      note:
        String(formData.get("comment") || "").trim() ||
        (String(formData.get("city") || "").trim() || String(formData.get("street") || "").trim()
          ? `Адрес: ${String(formData.get("city") || "").trim()}, ${String(formData.get("street") || "").trim()}`.trim()
          : ""),
      encounterDate: encounterDateText,
      lastVisit: encounterDateText,
      services: selectedServiceValues,
    });

    try {
      const addressText = [
        formData.get("country"),
        formData.get("subject"),
        formData.get("district"),
        formData.get("city"),
        formData.get("street"),
        formData.get("house"),
        formData.get("building"),
        formData.get("flat"),
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(", ");
      saveClientAddressSuggestion({
        subject: formData.get("subject"),
        district: formData.get("district"),
        city: formData.get("city"),
        street: formData.get("street"),
      });
      const backendId = editingClient?.backendId || (editingClient?.rawApiClient ? editingClient.id : null);
      if (!window.apiRequest) throw new Error("Backend API недоступен");
      const savedClient = await window.apiRequest?.(backendId ? `/clients/${backendId}` : "/clients", {
        method: backendId ? "PUT" : "POST",
        body: JSON.stringify({
          last_name: String(formData.get("lastName") || "").trim() || "Без фамилии",
          first_name: String(formData.get("firstName") || "").trim() || "Без имени",
          middle_name: String(formData.get("middleName") || "").trim() || null,
          birth_date: window.parseRuDateToIso?.(formData.get("birthDate")) || "1900-01-01",
          sex: String(formData.get("gender") || "").toLowerCase().startsWith("ж") ? "F" : "M",
          phone: String(formData.get("phone") || "").trim() || null,
          email: String(formData.get("email") || "").trim() || null,
          document_type: String(formData.get("documentType") || "").trim() || null,
          document_series: String(formData.get("passportSeries") || "").trim() || null,
          document_number: String(formData.get("passportNumber") || "").trim() || null,
          document_issued_by: String(formData.get("issuedBy") || "").trim() || null,
          document_issued_date: window.parseRuDateToIso?.(formData.get("passportDate"), "") || null,
          snils: String(formData.get("snils") || "").trim() || null,
          address_text: addressText || null,
          profession: String(formData.get("profession") || "").trim() || null,
          work_place: String(formData.get("workPlace") || "").trim() || null,
          organization: String(formData.get("organization") || "").trim() || null,
          encounter_date_text: encounterDateText || null,
          notes: String(formData.get("comment") || "").trim() || null,
          registration_text: addressText || null,
          legacy_payload_json: {
            source: "demo-client-modal",
            services: selectedServiceValues,
            agent: String(formData.get("agent") || "").trim() || null,
            birth_place: String(formData.get("birthPlace") || "").trim() || null,
            profession: String(formData.get("profession") || "").trim() || null,
            work_place: String(formData.get("workPlace") || "").trim() || null,
            organization: String(formData.get("organization") || "").trim() || null,
          },
        }),
      });
      if (savedClient) {
        const savedMapped = window.upsertClientInMemory?.(savedClient);
        if (savedMapped) {
          Object.assign(savedMapped, {
            ...targetClient,
            id: savedClient.id,
            backendId: savedClient.id,
            patientNumber: savedClient.patient_number,
            cardNumber: savedClient.card_number || targetClient.cardNumber || (savedClient.patient_number ? String(savedClient.patient_number).padStart(7, "0") : ""),
            agent: String(formData.get("agent") || "").trim() || savedMapped.agent || "",
            birthPlace: String(formData.get("birthPlace") || "").trim() || savedMapped.birthPlace || "",
            profession: String(formData.get("profession") || "").trim() || savedMapped.profession || "",
            workPlace: String(formData.get("workPlace") || "").trim() || savedMapped.workPlace || "",
            organization: String(formData.get("organization") || "").trim() || savedMapped.organization || "",
            rawApiClient: savedClient,
          });
          targetClient = savedMapped;
        }
      }
    } catch (error) {
      console.warn("Client backend save failed", error);
      showToast(window.humanizeApiError?.(error, "Backend не сохранил клиента") || "Backend не сохранил клиента");
      return;
    }

    const isCreated = !editingClient;

    if (isCreated && !data.clients.some((client) => String(client.id) === String(targetClient.id))) {
      targetClient.__demoCreated = true;
      data.clients.unshift(targetClient);
    }

    appState.selectedClientId = targetClient.id;
    appState.clientSearch = targetClient.fullName || fullName;
    data.backendSearch = appState.clientSearch.trim();
    window.markClientChanged?.(targetClient, isCreated);

    const currentVisit =
      selectedServiceValues.length
        ? window.createVisitForClientIfNeeded?.(targetClient.id, {
            serviceNames: selectedServiceValues,
            serviceIds: selectedServiceIds,
            serviceDetails,
            amount: visitAmount,
            paymentType: paymentSummary.paymentType,
            comment: paymentSummary.comment,
          })
        : window.getCurrentVisitForClient?.(targetClient.id);
    if (currentVisit && currentVisit.status !== "closed") {
      const visitPatch = {
        serviceNames: selectedServiceValues,
        serviceIds: selectedServiceIds,
        serviceDetails,
        amount: visitAmount ?? currentVisit.amount,
        paymentType: paymentSummary.paymentType,
        comment: paymentSummary.comment,
      };
      const syncedVisit = isCreated
        ? Object.assign(currentVisit, visitPatch)
        : window.updateVisit?.(currentVisit.id, visitPatch);
      const effectiveVisit = syncedVisit || Object.assign(currentVisit, visitPatch);
      const effectiveEncounterDate = String(effectiveVisit?.visitDate || encounterDateText || "").trim();
      if (effectiveEncounterDate) {
        targetClient.encounterDate = effectiveEncounterDate;
        targetClient.lastVisit = effectiveEncounterDate;
        if (targetClient.rawApiClient) {
          targetClient.rawApiClient.encounter_date_text = effectiveEncounterDate;
        }
      }
      await window.syncVisitToBackend?.(effectiveVisit, targetClient);
      await window.ensureRequiredDoctorExamsForVisit?.(targetClient, effectiveVisit);
      window.persistDemoState?.();
    }

    actionModal.classList.add("hidden");
    if (shouldOpenContract) {
      appState.page = "blanks";
    }
    renderApp();
    if (shouldOpenContract) {
      await window.openDemoDocument?.("contract", { autoOpenFile: true });
      return;
    }
    showToast(editingClient ? `Клиент ${fullName || "клиент"} обновлен` : `Клиент ${fullName || "Новый клиент"} добавлен`);
  });
}

window.openClientModal = openClientModal;
window.renderClientServiceSelector = renderClientServiceSelector;
