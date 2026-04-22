function renderClientServiceSelector(selectedServices = []) {
  const selectedSet = new Set(selectedServices);

  const groups = serviceGroups
    .filter((group) => group.isActive !== false)
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const currentGroup = appState.clientServiceGroupFilter || "all";

  const visibleServices = structuredServices
    .filter((service) => service.isActive !== false)
    .filter((service) => {
      if (currentGroup === "all") return true;
      return String(service.groupId) === String(currentGroup);
    })
    .slice()
    .sort((a, b) => {
      if ((a.groupId || 0) !== (b.groupId || 0)) return (a.groupId || 0) - (b.groupId || 0);
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

  return `
    <div class="client-services-block">
      <div class="client-services-block__title">Услуги</div>

      <div class="sketch-doctors sketch-doctors--top" style="margin-bottom:12px;">
        <button
          type="button"
          class="doctor-pill ${currentGroup === "all" ? "active" : ""}"
          data-client-service-group="all"
        >
          Все
        </button>

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
            : `<div class="muted">В этой группе услуг пока нет</div>`
        }
      </div>
    </div>
  `;
}

function bindClientServiceGroupButtons() {
  actionModalContent.querySelectorAll("[data-client-service-group]").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedNow = Array.from(
        actionModalContent.querySelectorAll('#serviceSelectorContainer input[name="services"]:checked'),
      ).map((input) => input.value);

      appState.clientServiceGroupFilter = button.dataset.clientServiceGroup;

      const container = document.getElementById("serviceSelectorContainer");
      if (container) {
        container.outerHTML = `<div id="serviceSelectorContainer">${renderClientServiceSelector(selectedNow)}</div>`;
      }

      bindClientServiceGroupButtons();
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

  if (!appState.clientServiceGroupFilter) {
    appState.clientServiceGroupFilter = "all";
  }

  const initialSelectedServices = editingClient?.services || [];

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

        <div id="serviceSelectorContainer">
          ${renderClientServiceSelector(initialSelectedServices)}
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

  bindClientServiceGroupButtons();

  cancel?.addEventListener("click", () => {
    actionModal.classList.add("hidden");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const center = appState.centerFilter === "all" ? "Медцентр 1" : appState.centerFilter;
    const fullName = [formData.get("lastName"), formData.get("firstName"), formData.get("middleName")]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" ");

    const selectedServiceValues = formData
      .getAll("services")
      .map((value) => String(value).trim())
      .filter(Boolean);

    let targetClient =
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

    try {
      const addressText = [
        formData.get("country"),
        formData.get("city"),
        formData.get("street"),
        formData.get("house"),
        formData.get("building"),
        formData.get("flat"),
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(", ");
      const backendId = editingClient?.backendId || (editingClient?.rawApiClient ? editingClient.id : null);
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
          notes: String(formData.get("comment") || "").trim() || null,
          registration_text: addressText || null,
          legacy_payload_json: {
            source: "demo-client-modal",
            services: selectedServiceValues,
          },
        }),
      });
      if (savedClient) {
        const savedMapped = window.upsertClientInMemory?.(savedClient);
        if (savedMapped) {
          Object.assign(savedMapped, targetClient, {
            backendId: savedClient.id,
            patientNumber: savedClient.patient_number,
          });
          targetClient = savedMapped;
        }
      }
    } catch (error) {
      console.warn("Client backend save failed", error);
      showToast(`Backend не сохранил клиента: ${error.message || error}`);
    }

    const isCreated = !editingClient;

    if (isCreated && !data.clients.some((client) => String(client.id) === String(targetClient.id))) {
      targetClient.__demoCreated = true;
      data.clients.unshift(targetClient);
    }

    appState.selectedClientId = targetClient.id;
    appState.clientSearch = "";
    window.markClientChanged?.(targetClient, isCreated);

    const currentVisit =
      isCreated && selectedServiceValues.length
        ? window.createVisitForClientIfNeeded?.(targetClient.id, { serviceNames: selectedServiceValues })
        : window.getCurrentVisitForClient?.(targetClient.id);
    if (currentVisit && currentVisit.status !== "closed") {
      currentVisit.serviceNames = selectedServiceValues;
      currentVisit.amount = window.calculateVisitAmount?.(selectedServiceValues) ?? currentVisit.amount;
      window.persistDemoState?.();
    }

    actionModal.classList.add("hidden");
    renderApp();
    showToast(editingClient ? `Клиент ${fullName || "клиент"} обновлен` : `Клиент ${fullName || "Новый клиент"} добавлен`);
  });
}

window.openClientModal = openClientModal;
window.renderClientServiceSelector = renderClientServiceSelector;
