const appState = {
  page: "dashboard",
  selectedClientId: 1,
  centerFilter: "all",
  clientSearch: "",
  serviceGroupFilter: "all",
  doctorExamModal: {
    isOpen: false,
    clientId: null,
    visitId: null,
    doctorRoleId: null,
  },
};

const legacyClients = Array.isArray(window.LEGACY_CLIENTS) ? window.LEGACY_CLIENTS : null;
const legacyServices = Array.isArray(window.LEGACY_SERVICES) ? window.LEGACY_SERVICES : null;

const structuredServicesData =
  window.servicesData && Array.isArray(window.servicesData.services)
    ? window.servicesData
    : null;

const serviceGroups = Array.isArray(structuredServicesData?.serviceGroups)
  ? structuredServicesData.serviceGroups
  : [];

const doctorRoles = Array.isArray(structuredServicesData?.doctorRoles)
  ? structuredServicesData.doctorRoles
  : [];

const structuredServices = Array.isArray(structuredServicesData?.services)
  ? structuredServicesData.services
  : [];

const data = {
  serviceCatalog:
    legacyServices ??
    (structuredServices.length
      ? structuredServices
          .filter((service) => service.isActive !== false)
          .slice()
          .sort((a, b) => {
            if ((a.groupId || 0) !== (b.groupId || 0)) return (a.groupId || 0) - (b.groupId || 0);
            return (a.sortOrder || 0) - (b.sortOrder || 0);
          })
          .map((service) => service.name)
      : [
          "Справка водительская",
          "Справка в бассейн",
          "Медосмотр",
          "ЭКГ",
          "Флюорография",
          "Психиатр",
          "Нарколог",
          "Терапевт",
          "Офтальмолог",
          "ЛОР",
        ]),
  clients: legacyClients ?? [
    {
      id: 1,
      patientNumber: 1,
      fullName: "Ефимов Иван Васильевич",
      birthDate: "17.06.1974",
      phone: "+7 999 000-00-01",
      center: "Медцентр 1",
      document: "Паспорт 45 00 123456",
      snils: "111-111-111 11",
      note: "Повторный медосмотр через 30 дней",
      lastVisit: "02.06.2025 19:38",
      services: ["Справка водительская", "Терапевт"],
    },
    {
      id: 2,
      patientNumber: 2,
      fullName: "Старостенко Олег Викторович",
      birthDate: "18.10.1986",
      phone: "+7 999 000-00-02",
      center: "Медцентр 2",
      document: "Паспорт 45 11 654321",
      snils: "222-222-222 22",
      note: "Оформление бассейна",
      lastVisit: "02.06.2025 19:37",
      services: ["Справка в бассейн"],
    },
    {
      id: 3,
      patientNumber: 3,
      fullName: "Бобков Егор Константинович",
      birthDate: "20.04.1998",
      phone: "+7 999 000-00-03",
      center: "Медцентр 1",
      document: "Паспорт 45 22 777777",
      snils: "333-333-333 33",
      note: "Нужен XML-реестр",
      lastVisit: "02.06.2025 19:41",
      services: ["Медосмотр", "ЭКГ"],
    },
    {
      id: 4,
      patientNumber: 4,
      fullName: "Пяткин Константин Сергеевич",
      birthDate: "26.01.1982",
      phone: "+7 999 000-00-04",
      center: "Медцентр 2",
      document: "Паспорт 45 33 555555",
      snils: "444-444-444 44",
      note: "Просроченный повтор",
      lastVisit: "02.06.2025 19:45",
      services: ["Флюорография"],
    },
    {
      id: 5,
      patientNumber: 5,
      fullName: "Петров Павел Васильевич",
      birthDate: "07.03.1988",
      phone: "+7 999 000-00-05",
      center: "Медцентр 1",
      document: "Паспорт 45 44 123123",
      snils: "555-555-555 55",
      note: "Победа, уточнить категории",
      lastVisit: "01.06.2025 11:54",
      services: ["Офтальмолог"],
    },
    {
      id: 6,
      patientNumber: 6,
      fullName: "Стецурина Анатольевна",
      birthDate: "18.12.1999",
      phone: "+7 999 000-00-06",
      center: "Медцентр 1",
      document: "Паспорт 45 55 987987",
      snils: "666-666-666 66",
      note: "Военком",
      lastVisit: "02.06.2025 14:19",
      services: ["Психиатр", "Нарколог"],
    },
    {
      id: 7,
      patientNumber: 7,
      fullName: "Федотов Павел Николаевич",
      birthDate: "13.06.1988",
      phone: "+7 999 000-00-07",
      center: "Медцентр 2",
      document: "Паспорт 45 66 456456",
      snils: "777-777-777 77",
      note: "Уточнить кат. дату Р УЛ",
      lastVisit: "02.06.2025 15:50",
      services: ["ЛОР"],
    },
  ],
  visits: [],
  doctorExams: [],
  mkb10History: [],
};

const pageTitle = document.getElementById("page-title");
const navRoot = document.getElementById("nav");
const contentRoot = document.getElementById("content");
const loginModal = document.getElementById("loginModal");
const actionModal = document.getElementById("actionModal");
const actionModalTitle = document.getElementById("actionModalTitle");
const actionModalContent = document.getElementById("actionModalContent");
const centerSelect = document.getElementById("centerSelect");
const toast = document.getElementById("toast");

const navItems = [
  { id: "dashboard", label: "Главная" },
  { id: "doctors", label: "Врачи", toast: "Открыт раздел: Врачи" },
  { id: "services", label: "Услуги", toast: "Открыт раздел: Услуги" },
  { id: "blanks", label: "Бланки", toast: "Открыт раздел: Бланки" },
  { id: "templates", label: "Шаблоны", toast: "Открыт раздел: Шаблоны" },
  { id: "upload", label: "Загрузка справки", toast: "Открыта загрузка справки" },
  { id: "employee", label: "Сотрудник", toast: "Открыт блок: Сотрудник" },
  { id: "cash", label: "Касса", toast: "Открыт блок: Касса" },
  { id: "xml", label: "XML", toast: "Открыт блок: XML" },
  { id: "blanks2", label: "Бланки", toast: "Открыт блок: Бланки" },
  { id: "reports", label: "Отчеты", toast: "Открыт блок: Отчеты" },
  { id: "harmfulness", label: "Пункты вредности", toast: "Открыт блок: Пункты вредности" },
];

const columnKeys = [
  "number",
  "fio",
  "birth",
  "registration",
  "category",
  "reference",
  "gynecologist",
  "stomatologist",
  "dermatologist",
  "neurologist",
  "surgeon",
  "otolaryngologist",
  "ophthalmologist",
  "therapist",
  "psychiatrist",
  "infectionist",
  "phthisiatrician",
  "uzist",
  "note",
  "encounterDate",
  "cardNumber",
  "noNumber",
  "fg",
  "organization",
  "mkb10",
  "realDate",
];

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2400);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ensureVisitsStore() {
  if (!data.visits) data.visits = [];
  if (!data.doctorExams) data.doctorExams = [];
}

function generateId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
function rememberMkb10Value(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return;

  if (!Array.isArray(data.mkb10History)) {
    data.mkb10History = [];
  }

  if (!data.mkb10History.includes(normalized)) {
    data.mkb10History.push(normalized);
    data.mkb10History.sort((a, b) => a.localeCompare(b, "ru"));
  }
}

function getDoctorTemplates() {
  return Array.isArray(window.doctorTemplates) ? window.doctorTemplates : [];
}

function getDoctorTemplate(doctorRoleId) {
  return getDoctorTemplates().find((item) => item.id === doctorRoleId) || null;
}

function getSelectedClient() {
  return data.clients.find((client) => client.id === appState.selectedClientId) || null;
}

function getDoctorRoleIdByLabel(label) {
  const normalized = String(label || "").trim().toLowerCase();

  const map = {
    "гинеколог": "gynecologist",
    "стоматолог": "dentist",
    "дерматолог": "dermatologist",
    "невролог": "neurologist",
    "хирург": "surgeon",
    "отоларинголог": "otolaryngologist",
    "офтальмолог": "ophthalmologist",
    "терапевт": "therapist",
    "психиатр": "psychiatrist",
    "инфекционист": "infectionist",
    "фтизиатр": "phthisiatrist",
    "узист": "uzist",
    "председатель": "chairman",
  };

  return map[normalized] || null;
}

function getDoctorDisplayName(doctorRoleId) {
  const template = getDoctorTemplate(doctorRoleId);
  if (template?.name) return template.name;

  const role = doctorRoles.find((item) => item.id === doctorRoleId);
  return role?.name || doctorRoleId;
}

function buildDoctorExamFields(template) {
  const result = {};

  (template?.fields || []).forEach((field) => {
    if (
      (field.type === "radio" || field.type === "select") &&
      field.defaultValue === undefined &&
      Array.isArray(field.options) &&
      field.options.length
    ) {
      result[field.key] = field.options[0];
    } else {
      result[field.key] = field.defaultValue ?? "";
    }
  });

  return result;
}

function getOrCreateDraftVisit(clientId) {
  ensureVisitsStore();

  let visit = data.visits.find(
    (item) => item.clientId === clientId && item.status === "draft",
  );

  if (!visit) {
    visit = {
      id: generateId("visit"),
      clientId,
      createdAt: new Date().toISOString(),
      serviceIds: [],
      examIds: [],
      status: "draft",
    };
    data.visits.push(visit);
  }

  return visit;
}

function getDoctorExam(clientId, visitId, doctorRoleId) {
  ensureVisitsStore();

  return (
    data.doctorExams.find(
      (item) =>
        item.clientId === clientId &&
        item.visitId === visitId &&
        item.doctorRoleId === doctorRoleId,
    ) || null
  );
}

function getOrCreateDoctorExam(clientId, visitId, doctorRoleId) {
  ensureVisitsStore();

  let exam = getDoctorExam(clientId, visitId, doctorRoleId);
  if (exam) return exam;

  const template = getDoctorTemplate(doctorRoleId);
  if (!template) {
    console.error("Не найден шаблон врача:", doctorRoleId);
    return null;
  }

  exam = {
    id: generateId("exam"),
    clientId,
    visitId,
    doctorRoleId,
    status: "draft",
    isCompleted: false,
    updatedAt: new Date().toISOString(),
    fields: buildDoctorExamFields(template),
  };

  data.doctorExams.push(exam);

  const visit = data.visits.find((item) => item.id === visitId);
  if (visit && !visit.examIds.includes(exam.id)) {
    visit.examIds.push(exam.id);
  }

  return exam;
}

function openDoctorExamCard({ clientId, visitId, doctorRoleId }) {
  if (!clientId || !doctorRoleId) return;

  ensureVisitsStore();

  const finalVisitId = visitId || getOrCreateDraftVisit(clientId).id;
  const exam = getOrCreateDoctorExam(clientId, finalVisitId, doctorRoleId);

  if (!exam) {
    showToast(`Для врача "${getDoctorDisplayName(doctorRoleId)}" пока нет шаблона`);
    return;
  }

  appState.doctorExamModal = {
    isOpen: true,
    clientId,
    visitId: finalVisitId,
    doctorRoleId,
  };

  renderApp();
}

function closeDoctorExamCard() {
  appState.doctorExamModal = {
    isOpen: false,
    clientId: null,
    visitId: null,
    doctorRoleId: null,
  };

  renderApp();
}

function saveDoctorExam(examId, updatedFields) {
  ensureVisitsStore();

  const exam = data.doctorExams.find((item) => item.id === examId);
  if (!exam) return;

  exam.fields = {
    ...exam.fields,
    ...updatedFields,
  };
  exam.updatedAt = new Date().toISOString();
  exam.isCompleted = true;
  exam.status = "completed";
  rememberMkb10Value(exam.fields?.mkb10);
}

function getDoctorExamStatus(clientId, doctorRoleId) {
  if (!clientId || !doctorRoleId) return "empty";

  const visit = getOrCreateDraftVisit(clientId);
  const exam = getDoctorExam(clientId, visit.id, doctorRoleId);

  if (!exam) return "empty";
  return exam.isCompleted ? "completed" : "draft";
}

function matchesCenter(center) {
  return appState.centerFilter === "all" || center === appState.centerFilter;
}

function filteredClients() {
  const search = appState.clientSearch.trim().toLowerCase();
  if (!search) return [];

  return data.clients
    .filter((client) => {
      if (!matchesCenter(client.center)) return false;
      return [client.patientNumber, client.fullName, client.phone, client.document, client.snils]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .slice(0, 25);
}

function normalizeSearchValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\dа-яёa-z]+/gi, " ")
    .trim();
}

function findDuplicateCandidates(searchValue) {
  const normalizedSearch = normalizeSearchValue(searchValue);
  if (normalizedSearch.length < 2) return [];

  const searchParts = normalizedSearch.split(/\s+/).filter(Boolean);
  return data.clients
    .filter((client) => matchesCenter(client.center))
    .map((client) => {
      const haystack = normalizeSearchValue(
        [client.patientNumber, client.birthDate, client.phone, client.document, client.snils].join(" "),
      );
      const score = searchParts.reduce((total, part) => total + (haystack.includes(part) ? 1 : 0), 0);
      return { client, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.client.patientNumber ?? a.client.id) - (b.client.patientNumber ?? b.client.id))
    .slice(0, 5)
    .map((item) => item.client);
}

function rerenderAndRestoreInput(inputId, value, caretPosition) {
  renderApp();
  const input = document.getElementById(inputId);
  if (!input) return;
  input.focus();
  const safePos = Math.min(caretPosition, value.length);
  input.setSelectionRange(safePos, safePos);
}

function renderNav() {
  if (!navRoot) return;

  navRoot.innerHTML = `
    <div class="nav-group">
      ${navItems
        .map(
          (item) => `
            <button
              class="${appState.page === item.id ? "active" : ""}"
              data-page="${item.id}"
              data-toast="${item.toast || ""}"
            >
              ${item.label}
            </button>
          `,
        )
        .join("")}
    </div>
  `;

  navRoot.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;
      if (!page) return;
      appState.page = page;
      renderApp();
      window.scrollTo({ top: 0, behavior: "auto" });
      if (button.dataset.toast) showToast(button.dataset.toast);
    });
  });
}

function buildExcelRows(clients) {
  const registrations = [
    "Гор. Валдай, Ул. Строителей, 10 корп.- кв.-",
    "ЗАТО Озерный, Ул. Киевская, 2А корп.- кв.69",
    "СПб, Пр-Кт Героев, 24 корп.2 кв.313",
    "СПб, - корп.- кв.-",
    "Гор. Чебаркуль, Ул. Каширина, 15 корп.- кв.12",
    "Гор. Кизел, Ул. Пролетарская, 76 корп.- кв.3",
    "Гор. Самара, Ул. Управленческий, Краснолинск",
  ];

  const categories = ["ABC п8", "BC", "ЛМК", "ABCDE п8", "В", "B в9", "BCD"];
  const notes = [
    "ви )",
    "ви )",
    "3. новая наталья пеперони )",
    "вячеслав ) трактор уточ пропис",
    "победа ) уточнить категории",
    "военком ) ТРАКТОР",
    "людмила ) УТОЧ КАТ ДАТУ Р УЛ",
  ];
  const organizations = ["-", "-", 'ООО "РАДУГА-2"', "-", "-", "-", "Самозанятый"];

  return clients.slice(0, 7).map((client, index) => ({
    id: client.id,
    patientNumber: client.patientNumber ?? client.id,
    fullName: client.fullName,
    birthDate: client.birthDate,
    registration: registrations[index] || client.document,
    category: categories[index] || "B",
    referenceNumber: "3E+05",
    gynecologist: index === 2 ? "X" : "",
    stomatologist: index === 3 ? "X" : "",
    dermatologist: ["", "X", "", "", "", "", ""][index] || "",
    neurologist: ["", "", "", "X", "X", "", ""][index] || "",
    surgeon: ["", "", "", "", "X", "", ""][index] || "",
    otolaryngologist: ["", "", "", "", "", "", "X"][index] || "",
    ophthalmologist: ["", "", "", "", "X", "X", "X"][index] || "",
    therapist: ["X", "X", "", "X", "X", "X", "X"][index] || "",
    psychiatrist: ["", "", "", "", "", "X", ""][index] || "",
    infectionist: "",
    phthisiatrician: "",
    uzist: "",
    note: notes[index] || client.note,
    encounterDate: "########",
    cardNumber: "3E+05",
    noNumber: index === 5 ? "X" : "",
    fg: "",
    organization: organizations[index] || "-",
    mkb10: "",
    realDate: client.lastVisit,
  }));
}

function renderDoctorButton(label, selectedClient) {
  const doctorRoleId = getDoctorRoleIdByLabel(label);
  const status = selectedClient && doctorRoleId
    ? getDoctorExamStatus(selectedClient.id, doctorRoleId)
    : "empty";

  return `
    <button
      class="doctor-pill doctor-pill--${status}"
      data-doctor-label="${escapeHtml(label)}"
      data-doctor-role-id="${escapeHtml(doctorRoleId || "")}"
    >
      ${label}
    </button>
  `;
}

function renderSketchHome() {
  const currentClients = filteredClients();
  const selectedClient = currentClients.find((client) => client.id === appState.selectedClientId) || currentClients[0];
  const duplicateCandidates = findDuplicateCandidates(appState.clientSearch).filter((client) => client.id !== selectedClient?.id);
  const doctorButtons = [
    "Гинеколог",
    "Стоматолог",
    "Дерматолог",
    "Невролог",
    "Хирург",
    "Отоларинголог",
    "Офтальмолог",
    "Терапевт",
    "Психиатр",
    "Инфекционист",
    "Фтизиатр",
    "Узист",
    "Председатель",
  ];
  const excelColumns = [
    "№",
    "ФИО",
    "Дата рождения",
    "Регистрация",
    "Категории и условия допуска",
    "№ справки",
    "Гинеколог",
    "Стоматолог",
    "Дерматолог",
    "Невролог",
    "Хирург",
    "Отоларинголог",
    "Офтальмолог",
    "Терапевт",
    "Психиатр",
    "Инфекционист",
    "Фтизиатр",
    "Узист",
    "Примечания",
    "Дата обращения",
    "Номер карты",
    "б/н",
    "ФГ",
    "Организация",
    "МКБ10",
    "Реальная дата",
  ];

  const excelRows = buildExcelRows(currentClients);

  return `
    <section class="sketch-layout">
      <div class="sketch-main sketch-main--full">
        <article class="sketch-panel">
          <div class="sketch-doctors-block">
            <div class="sketch-doctors sketch-doctors--top">
              ${doctorButtons.map((label) => renderDoctorButton(label, selectedClient)).join("")}
            </div>
          </div>

          <div class="sketch-toolbar">
            <label class="field sketch-search">
              <span></span>
              <input id="clientSearchInput" value="${escapeHtml(appState.clientSearch)}" placeholder="поиск" />
            </label>
            <button class="primary-button sketch-add-button" id="addClientButton">Добавить</button>
          </div>

          ${
            duplicateCandidates.length
              ? `
                <div class="duplicate-panel">
                  <div class="duplicate-panel__title">Возможные дубли</div>
                  <div class="duplicate-panel__list">
                    ${duplicateCandidates
                      .map(
                        (client) => `
                          <button class="duplicate-card" data-client-id="${client.id}">
                            <strong>№ ${client.patientNumber ?? client.id} ${escapeHtml(client.fullName)}</strong>
                            <span>${escapeHtml(client.birthDate)} · ${escapeHtml(client.phone)} · ${escapeHtml(client.document)}</span>
                          </button>
                        `,
                      )
                      .join("")}
                  </div>
                </div>
              `
              : ""
          }

          <div class="sketch-table sketch-table--excel">
            <div class="sketch-table__grid sketch-table__grid--head">
              ${excelColumns
                .map(
                  (column, index) => `
                    <span class="sketch-head-cell sketch-head-cell--resizable">
                      <span>${column}</span>
                      <button class="col-resize-handle" data-resize-col="${columnKeys[index]}" aria-label="Изменить ширину столбца ${column}"></button>
                    </span>
                  `,
                )
                .join("")}
            </div>
            ${
              excelRows.length
                ? excelRows
                    .map(
                      (row) => `
                        <button class="sketch-table__grid sketch-table__grid--row ${selectedClient && selectedClient.id === row.id ? "sketch-table__grid--active" : ""}" data-client-id="${row.id}">
                          <span>${row.patientNumber}</span>
                          <span>${escapeHtml(row.fullName)}</span>
                          <span>${escapeHtml(row.birthDate)}</span>
                          <span>${escapeHtml(row.registration)}</span>
                          <span>${escapeHtml(row.category)}</span>
                          <span>${escapeHtml(row.referenceNumber)}</span>
                          <span>${escapeHtml(row.gynecologist)}</span>
                          <span>${escapeHtml(row.stomatologist)}</span>
                          <span>${escapeHtml(row.dermatologist)}</span>
                          <span>${escapeHtml(row.neurologist)}</span>
                          <span>${escapeHtml(row.surgeon)}</span>
                          <span>${escapeHtml(row.otolaryngologist)}</span>
                          <span>${escapeHtml(row.ophthalmologist)}</span>
                          <span>${escapeHtml(row.therapist)}</span>
                          <span>${escapeHtml(row.psychiatrist)}</span>
                          <span>${escapeHtml(row.infectionist)}</span>
                          <span>${escapeHtml(row.phthisiatrician)}</span>
                          <span>${escapeHtml(row.uzist)}</span>
                          <span>${escapeHtml(row.note)}</span>
                          <span>${escapeHtml(row.encounterDate)}</span>
                          <span>${escapeHtml(row.cardNumber)}</span>
                          <span>${escapeHtml(row.noNumber)}</span>
                          <span>${escapeHtml(row.fg)}</span>
                          <span>${escapeHtml(row.organization)}</span>
                          <span>${escapeHtml(row.mkb10)}</span>
                          <span>${escapeHtml(row.realDate)}</span>
                        </button>
                      `,
                    )
                    .join("")
                : '<div class="empty">По текущему фильтру клиентов не найдено</div>'
            }
          </div>
        </article>

        <article class="sketch-panel sketch-client-card sketch-client-card--full">
          ${
            selectedClient
              ? `
                <div class="sketch-client-card__head">
                  <h3>Информация о клиенте</h3>
                  <button class="ghost-button" id="editSelectedClientButton">Изменить</button>
                </div>
                <div class="client-facts">
                  <div>№ пациента: ${selectedClient.patientNumber ?? selectedClient.id}</div>
                  <div>${escapeHtml(selectedClient.fullName)}</div>
                  <div>${escapeHtml(selectedClient.birthDate)}</div>
                  <div>${escapeHtml(selectedClient.phone)}</div>
                  <div>${escapeHtml(selectedClient.document)}</div>
                  <div>${escapeHtml(selectedClient.snils)}</div>
                  <div>${escapeHtml(selectedClient.center)}</div>
                  <div>${selectedClient.services?.length ? `Услуги: ${escapeHtml(selectedClient.services.join(", "))}` : "Услуги не выбраны"}</div>
                </div>

                <div class="client-doctor-actions" style="margin-top:16px;">
                  <div style="font-weight:600; margin-bottom:8px;">Карточки врачей</div>
                  <div class="sketch-doctors">
                    ${doctorButtons.map((label) => renderDoctorButton(label, selectedClient)).join("")}
                  </div>
                </div>
              `
              : '<div class="empty">Выбери клиента из списка сверху</div>'
          }
        </article>
      </div>
    </section>
  `;
}

function renderStubPage(title) {
  return `
    <section class="card">
      <h3>${title}</h3>
      <p class="muted">Этот экран пока оставлен как заглушка в демке. Основная рабочая настройка сейчас идет на главной странице.</p>
    </section>
  `;
}

function renderContent() {
  if (appState.page === "dashboard") return renderSketchHome();
  if (appState.page === "services" && window.renderServicesPage) return window.renderServicesPage();

  const item = navItems.find((navItem) => navItem.id === appState.page);
  return renderStubPage(item?.label || "Раздел");
}

function openActionModal(title, html) {
  if (!actionModalTitle || !actionModalContent || !actionModal) return;
  actionModalTitle.textContent = title;
  actionModalContent.innerHTML = html;
  actionModal.classList.remove("hidden");
}

function formatDateInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  const parts = [];
  if (digits.slice(0, 2)) parts.push(digits.slice(0, 2));
  if (digits.slice(2, 4)) parts.push(digits.slice(2, 4));
  if (digits.slice(4, 8)) parts.push(digits.slice(4, 8));
  return parts.join(".");
}

function attachDateMask(root) {
  root.querySelectorAll("[data-date-mask]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const nextValue = formatDateInput(event.target.value);
      event.target.value = nextValue;
    });
  });
}

function getPageTitle() {
  if (appState.page === "dashboard") return "Главная";
  return navItems.find((item) => item.id === appState.page)?.label || "Главная";
}

function applyColumnResizeState() {
  if (!window.__columnWidths) return;
  Object.entries(window.__columnWidths).forEach(([key, width]) => {
    document.documentElement.style.setProperty(`--excel-col-${key}`, `${width}px`);
  });
}

function focusClientSearch() {
  const hasDoctorModalOpen = !!window.appState?.doctorExamModal?.isOpen;
  const hasActionModalOpen = actionModal && !actionModal.classList.contains("hidden");

  if (hasDoctorModalOpen || hasActionModalOpen) return;

  const input = document.getElementById("clientSearchInput");
  if (!input) return;

  input.focus();
  const caretPosition = input.value.length;
  input.setSelectionRange(caretPosition, caretPosition);
}

function bindColumnResize() {
  const handles = contentRoot.querySelectorAll(".col-resize-handle");
  handles.forEach((handle) => {
    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const key = handle.dataset.resizeCol;
      const currentWidthValue = getComputedStyle(document.documentElement).getPropertyValue(`--excel-col-${key}`).trim();
      const initialWidth = Number.parseInt(currentWidthValue, 10) || 80;
      const startX = event.clientX;

      const onMove = (moveEvent) => {
        const nextWidth = Math.max(22, initialWidth + moveEvent.clientX - startX);
        window.__columnWidths = window.__columnWidths || {};
        window.__columnWidths[key] = nextWidth;
        document.documentElement.style.setProperty(`--excel-col-${key}`, `${nextWidth}px`);
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  });
}

function bindContentEvents() {
  const clientSearchInput = document.getElementById("clientSearchInput");
  if (clientSearchInput) {
    clientSearchInput.addEventListener("input", (event) => {
      appState.clientSearch = event.target.value;
      rerenderAndRestoreInput("clientSearchInput", event.target.value, event.target.selectionStart || event.target.value.length);
    });
  }

  const addClientButton = document.getElementById("addClientButton");
  if (addClientButton) {
    addClientButton.addEventListener("click", () => {
      if (window.openClientModal) {
        window.openClientModal();
      }
    });
  }

  const editSelectedClientButton = document.getElementById("editSelectedClientButton");
  if (editSelectedClientButton) {
    editSelectedClientButton.addEventListener("click", () => {
      if (window.openClientModal) {
        window.openClientModal(appState.selectedClientId);
      }
    });
  }

  const addServiceButton = document.getElementById("addServiceButton");
  if (addServiceButton) {
    addServiceButton.addEventListener("click", () => window.openServiceModal?.());
  }

  contentRoot.querySelectorAll("[data-service-group]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.serviceGroupFilter = button.dataset.serviceGroup;
      renderApp();
    });
  });

  contentRoot.querySelectorAll("[data-service-id]").forEach((button) => {
    button.addEventListener("click", () => {
      window.openServiceModal?.(button.dataset.serviceId);
    });
  });

  contentRoot.querySelectorAll("[data-client-id]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedClientId = Number(button.dataset.clientId);
      renderApp();
    });
  });

  contentRoot.querySelectorAll("[data-doctor-role-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const doctorRoleId = button.dataset.doctorRoleId;
      const selectedClient = getSelectedClient();

      if (!selectedClient) {
        showToast("Сначала выбери клиента");
        return;
      }

      if (!doctorRoleId) {
        const label = button.dataset.doctorLabel || "врач";
        showToast(`Для "${label}" шаблон пока не добавлен`);
        return;
      }

      openDoctorExamCard({
        clientId: selectedClient.id,
        doctorRoleId,
      });
    });
  });

  contentRoot.querySelectorAll("[data-demo-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.demoToast));
  });

  bindColumnResize();
}

function renderApp() {
  if (pageTitle) {
    pageTitle.textContent = getPageTitle();
  }

  renderNav();

  if (contentRoot) {
    contentRoot.innerHTML = `
      ${renderContent()}
      ${window.renderDoctorExamModal ? window.renderDoctorExamModal() : ""}
    `;
  }

  applyColumnResizeState();
  bindContentEvents();

  if (appState.page === "dashboard") {
    window.setTimeout(focusClientSearch, 0);
  }
}

if (centerSelect) {
  centerSelect.addEventListener("change", (event) => {
    appState.centerFilter = event.target.value;
    renderApp();
  });
}

const showLoginButton = document.getElementById("showLogin");
if (showLoginButton) {
  showLoginButton.addEventListener("click", () => {
    loginModal?.classList.remove("hidden");
  });
}

document.getElementById("closeLogin")?.addEventListener("click", () => {
  loginModal?.classList.add("hidden");
});

document.getElementById("closeAction")?.addEventListener("click", () => {
  actionModal?.classList.add("hidden");
});

loginModal?.querySelector(".modal__backdrop")?.addEventListener("click", () => {
  loginModal.classList.add("hidden");
});

actionModal?.querySelector(".modal__backdrop")?.addEventListener("click", () => {
  actionModal.classList.add("hidden");
});

window.appState = appState;
window.data = data;
window.getDoctorTemplate = getDoctorTemplate;
window.getDoctorExam = getDoctorExam;
window.getOrCreateDraftVisit = getOrCreateDraftVisit;
window.openDoctorExamCard = openDoctorExamCard;
window.closeDoctorExamCard = closeDoctorExamCard;
window.saveDoctorExam = saveDoctorExam;

renderApp();
