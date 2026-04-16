const appState = {
  page: "dashboard",
  selectedClientId: 1,
  centerFilter: "all",
  clientSearch: "",
};

const data = {
  serviceCatalog: [
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
  ],
  clients: [
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
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2400);
}

function matchesCenter(center) {
  return appState.centerFilter === "all" || center === appState.centerFilter;
}

function filteredClients() {
  const search = appState.clientSearch.trim().toLowerCase();
  return data.clients.filter((client) => {
    if (!matchesCenter(client.center)) return false;
    if (!search) return true;
    return [client.patientNumber, client.fullName, client.phone, client.document, client.snils].join(" ").toLowerCase().includes(search);
  });
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
      const haystack = normalizeSearchValue([client.patientNumber, client.birthDate, client.phone, client.document, client.snils].join(" "));
      const score = searchParts.reduce((total, part) => total + (haystack.includes(part) ? 1 : 0), 0);
      return { client, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.client.patientNumber ?? a.client.id) - (b.client.patientNumber ?? b.client.id))
    .slice(0, 5)
    .map((item) => item.client);
}

function createClientFromSearch() {
  const raw = appState.clientSearch.trim();
  if (!raw) {
    showToast("Введите фамилию или ФИО перед добавлением");
    return;
  }

  const existing = data.clients.find((client) => client.fullName.toLowerCase() === raw.toLowerCase());
  if (existing) {
    appState.selectedClientId = existing.id;
    renderApp();
    showToast("Такой клиент уже есть в списке");
    return;
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  const [lastName = raw, firstName = "Новый", middleName = "Клиент"] = parts;
  const nextId = Math.max(...data.clients.map((client) => client.id)) + 1;
  const center = appState.centerFilter === "all" ? "Медцентр 1" : appState.centerFilter;

  data.clients.unshift({
    id: nextId,
    patientNumber: Math.max(...data.clients.map((client) => client.patientNumber ?? client.id)) + 1,
    fullName: [lastName, firstName, middleName].join(" "),
    birthDate: "01.01.1990",
    phone: "+7 999 000-00-00",
    center,
    document: "Паспорт уточняется",
    snils: "не указан",
    note: "Новый клиент из строки поиска",
    lastVisit: "сегодня",
  });

  appState.selectedClientId = nextId;
  renderApp();
  showToast("Новый клиент добавлен");
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
      if (page === "dashboard") {
        appState.page = "dashboard";
        renderApp();
        return;
      }

      if (page) {
        appState.page = page;
        renderApp();
      }
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
              ${doctorButtons
                .map((label) => `<button class="doctor-pill" data-demo-toast="Открыт врач: ${label}">${label}</button>`)
                .join("")}
            </div>
          </div>

          <div class="sketch-toolbar">
            <label class="field sketch-search">
              <span></span>
              <input id="clientSearchInput" value="${appState.clientSearch}" placeholder="поиск" />
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
                            <strong>№ ${client.patientNumber ?? client.id} ${client.fullName}</strong>
                            <span>${client.birthDate} · ${client.phone} · ${client.document}</span>
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
                          <span>${row.fullName}</span>
                          <span>${row.birthDate}</span>
                          <span>${row.registration}</span>
                          <span>${row.category}</span>
                          <span>${row.referenceNumber}</span>
                          <span>${row.gynecologist}</span>
                          <span>${row.stomatologist}</span>
                          <span>${row.dermatologist}</span>
                          <span>${row.neurologist}</span>
                          <span>${row.surgeon}</span>
                          <span>${row.otolaryngologist}</span>
                          <span>${row.ophthalmologist}</span>
                          <span>${row.therapist}</span>
                          <span>${row.psychiatrist}</span>
                          <span>${row.infectionist}</span>
                          <span>${row.phthisiatrician}</span>
                          <span>${row.uzist}</span>
                          <span>${row.note}</span>
                          <span>${row.encounterDate}</span>
                          <span>${row.cardNumber}</span>
                          <span>${row.noNumber}</span>
                          <span>${row.fg}</span>
                          <span>${row.organization}</span>
                          <span>${row.mkb10}</span>
                          <span>${row.realDate}</span>
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
                  <div>${selectedClient.fullName}</div>
                  <div>${selectedClient.birthDate}</div>
                  <div>${selectedClient.phone}</div>
                  <div>${selectedClient.document}</div>
                  <div>${selectedClient.snils}</div>
                  <div>${selectedClient.center}</div>
                  <div>${selectedClient.services?.length ? `Услуги: ${selectedClient.services.join(", ")}` : "Услуги не выбраны"}</div>
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

  const item = navItems.find((navItem) => navItem.id === appState.page);
  return renderStubPage(item?.label || "Раздел");
}

function openActionModal(title, html) {
  actionModalTitle.textContent = title;
  actionModalContent.innerHTML = html;
  actionModal.classList.remove("hidden");
  actionModalContent.querySelectorAll("[data-demo-action]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(button.dataset.demoAction);
      actionModal.classList.add("hidden");
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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

function openClientModal(clientId = null) {
  const editingClient = clientId ? data.clients.find((client) => client.id === clientId) : null;
  const raw = editingClient ? editingClient.fullName : appState.clientSearch.trim();
  const parts = raw.split(/\s+/).filter(Boolean);
  const [lastName = "", firstName = "", middleName = ""] = parts;
  const selectedServices = new Set(editingClient?.services || []);

  openActionModal(
    editingClient ? "Изменить клиента" : "Новый клиент",
    `
      <form class="client-create-form" id="clientCreateForm">
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
            <input name="birthDate" data-date-mask value="${escapeHtml(editingClient?.birthDate || "18.04.1979")}" />
          </label>
          <label class="field">
            <span>Пол</span>
            <select name="gender">
              <option>муж</option>
              <option>жен</option>
            </select>
          </label>
          <label class="field">
            <span>Место рождения</span>
            <input name="birthPlace" value="г. Покров" />
          </label>
        </div>

        <div class="client-create-grid client-create-grid--document">
          <label class="field">
            <span>Документ</span>
            <select name="documentType">
              <option>Паспорт РФ</option>
            </select>
          </label>
          <label class="field">
            <span>Серия</span>
            <input name="passportSeries" value="17 04" />
          </label>
          <label class="field">
            <span>Номер</span>
            <input name="passportNumber" value="1679" />
          </label>
          <label class="field">
            <span>Дата выдачи</span>
            <input name="passportDate" data-date-mask value="12.12.2021" />
          </label>
          <label class="field field--wide">
            <span>Кем выдан</span>
            <input name="issuedBy" value="ГУ МВД России" />
          </label>
        </div>

        <div class="client-create-grid client-create-grid--address">
          <label class="field">
            <span>Страна</span>
            <input name="country" value="Россия" />
          </label>
          <label class="field">
            <span>Город</span>
            <input name="city" value="Покров" />
          </label>
          <label class="field field--wide">
            <span>Улица</span>
            <input name="street" value="Восточная" />
          </label>
          <label class="field">
            <span>Дом</span>
            <input name="house" value="2" />
          </label>
          <label class="field">
            <span>Корпус</span>
            <input name="building" value="" />
          </label>
          <label class="field">
            <span>Кв.</span>
            <input name="flat" value="" />
          </label>
        </div>

        <div class="client-create-grid client-create-grid--contacts">
          <label class="field">
            <span>Телефон</span>
            <input name="phone" value="${escapeHtml(editingClient?.phone || "+7 999 000-00-00")}" />
          </label>
          <label class="field">
            <span>E-mail</span>
            <input name="email" value="" />
          </label>
          <label class="field">
            <span>СНИЛС</span>
            <input name="snils" value="${escapeHtml(editingClient?.snils || "не указан")}" />
          </label>
        </div>

        <label class="field">
          <span>Комментарий</span>
          <textarea name="comment" rows="2">${escapeHtml(editingClient?.note || "")}</textarea>
        </label>

        <div class="client-services-block">
          <div class="client-services-block__title">Услуги</div>
          <div class="client-services-list">
            ${data.serviceCatalog
              .map(
                (service, index) => `
                  <label class="client-service-chip">
                    <input
                      type="checkbox"
                      name="services"
                      value="${escapeHtml(service)}"
                      ${selectedServices.has(service) ? "checked" : ""}
                    />
                    <span>${service}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
        </div>

        <div class="client-create-actions">
          <button type="button" class="ghost-button" id="cancelClientCreate">Отмена</button>
          <button type="submit" class="primary-button">ОК</button>
        </div>
      </form>
    `,
  );

  const form = document.getElementById("clientCreateForm");
  const cancel = document.getElementById("cancelClientCreate");

  if (form) {
    attachDateMask(form);
  }

  cancel?.addEventListener("click", () => {
    actionModal.classList.add("hidden");
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const center = appState.centerFilter === "all" ? "Медцентр 1" : appState.centerFilter;
    const fullName = [
      formData.get("lastName"),
      formData.get("firstName"),
      formData.get("middleName"),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");
    const selectedServiceValues = formData
      .getAll("services")
      .map((value) => String(value).trim())
      .filter(Boolean);

    const targetClient =
      editingClient ||
      {
        id: Math.max(...data.clients.map((client) => client.id)) + 1,
        patientNumber: Math.max(...data.clients.map((client) => client.patientNumber ?? client.id)) + 1,
      };

    Object.assign(targetClient, {
      fullName: fullName || "Новый клиент",
      birthDate: String(formData.get("birthDate") || "").trim() || "01.01.1990",
      phone: String(formData.get("phone") || "").trim() || "+7 999 000-00-00",
      center: editingClient?.center || center,
      document: `Паспорт РФ ${String(formData.get("passportSeries") || "").trim()} ${String(formData.get("passportNumber") || "").trim()}`.trim(),
      snils: String(formData.get("snils") || "").trim() || "не указан",
      note:
        String(formData.get("comment") || "").trim() ||
        `Адрес: ${String(formData.get("city") || "").trim()}, ${String(formData.get("street") || "").trim()}`.trim(),
      lastVisit: editingClient?.lastVisit || "сегодня",
      services: selectedServiceValues,
    });

    if (!editingClient) {
      data.clients.unshift(targetClient);
    }

    appState.selectedClientId = targetClient.id;
    appState.clientSearch = "";
    actionModal.classList.add("hidden");
    renderApp();
    showToast(editingClient ? `Клиент ${fullName || "клиент"} обновлен` : `Клиент ${fullName || "Новый клиент"} добавлен`);
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
  const input = document.getElementById("clientSearchInput");
  if (!input || actionModal && !actionModal.classList.contains("hidden")) return;
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
    addClientButton.addEventListener("click", () => openClientModal());
  }

  const editSelectedClientButton = document.getElementById("editSelectedClientButton");
  if (editSelectedClientButton) {
    editSelectedClientButton.addEventListener("click", () => openClientModal(appState.selectedClientId));
  }

  contentRoot.querySelectorAll("[data-client-id]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.selectedClientId = Number(button.dataset.clientId);
      renderApp();
    });
  });

  contentRoot.querySelectorAll("[data-demo-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.demoToast));
  });

  bindColumnResize();
}

function renderApp() {
  pageTitle.textContent = getPageTitle();
  renderNav();
  contentRoot.innerHTML = renderContent();
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
    loginModal.classList.remove("hidden");
  });
}

document.getElementById("closeLogin").addEventListener("click", () => {
  loginModal.classList.add("hidden");
});

document.getElementById("closeAction").addEventListener("click", () => {
  actionModal.classList.add("hidden");
});

loginModal.querySelector(".modal__backdrop").addEventListener("click", () => {
  loginModal.classList.add("hidden");
});

actionModal.querySelector(".modal__backdrop").addEventListener("click", () => {
  actionModal.classList.add("hidden");
});

renderApp();

