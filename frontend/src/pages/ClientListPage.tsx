import type { CSSProperties, FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api, type Client, type ClientPayload, type Service } from "../shared/api";

const doctors = [
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

const columnStorageKey = "vova-medcenter-column-widths-v2";

const columns = [
  { key: "number", label: "№" },
  { key: "fio", label: "ФИО" },
  { key: "birth", label: "Дата рождения" },
  { key: "registration", label: "Регистрация" },
  { key: "category", label: "Категории и условия допуска" },
  { key: "reference", label: "№ справки" },
  { key: "gynecologist", label: "Гинеколог" },
  { key: "stomatologist", label: "Стоматолог" },
  { key: "dermatologist", label: "Дерматолог" },
  { key: "neurologist", label: "Невролог" },
  { key: "surgeon", label: "Хирург" },
  { key: "otolaryngologist", label: "Отоларинголог" },
  { key: "ophthalmologist", label: "Офтальмолог" },
  { key: "therapist", label: "Терапевт" },
  { key: "psychiatrist", label: "Психиатр" },
  { key: "infectionist", label: "Инфекционист" },
  { key: "phthisiatrician", label: "Фтизиатр" },
  { key: "uzist", label: "Узист" },
  { key: "note", label: "Примечания" },
  { key: "encounterDate", label: "Дата обращения" },
  { key: "cardNumber", label: "Номер карты" },
  { key: "noNumber", label: "б/н" },
  { key: "fg", label: "ФГ" },
  { key: "organization", label: "Организация" },
  { key: "mkb10", label: "МКБ10" },
  { key: "realDate", label: "Реальная дата" },
];

const sideActions = [
  "Главное",
  "Врачи",
  "Услуги",
  "Шаблоны",
  "Загрузка",
  "Сотрудник",
  "Касса",
  "XML",
  "Бланки",
  "Отчеты",
  "Пункты вредности",
];

const emptyClientForm: ClientPayload = {
  last_name: "",
  first_name: "",
  middle_name: "",
  birth_date: "",
  sex: "",
  phone: "",
  email: "",
  document_type: "Паспорт РФ",
  document_series: "",
  document_number: "",
  document_issued_by: "",
  document_issued_date: "",
  snils: "",
  oms_policy: "",
  address_text: "",
  notes: "",
};

const today = new Date().toISOString().slice(0, 10);

function fullName(client?: Client | null) {
  if (!client) return "";
  return [client.last_name, client.first_name, client.middle_name ?? ""].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU").format(date);
}

function compactPayload(form: ClientPayload): ClientPayload {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value]),
  ) as ClientPayload;
}

function clientToForm(client: Client): ClientPayload {
  return {
    last_name: client.last_name,
    first_name: client.first_name,
    middle_name: client.middle_name ?? "",
    birth_date: client.birth_date,
    sex: client.sex ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    document_type: client.document_type ?? "Паспорт РФ",
    document_series: client.document_series ?? "",
    document_number: client.document_number ?? "",
    document_issued_by: client.document_issued_by ?? "",
    document_issued_date: client.document_issued_date ?? "",
    snils: client.snils ?? "",
    oms_policy: client.oms_policy ?? "",
    address_text: client.address_text ?? "",
    notes: client.notes ?? "",
    registration_text: client.registration_text ?? "",
    admission_category: client.admission_category ?? "",
    reference_number: client.reference_number ?? "",
    doctor_gynecologist: client.doctor_gynecologist ?? "",
    doctor_stomatologist: client.doctor_stomatologist ?? "",
    doctor_dermatologist: client.doctor_dermatologist ?? "",
    doctor_neurologist: client.doctor_neurologist ?? "",
    doctor_surgeon: client.doctor_surgeon ?? "",
    doctor_otolaryngologist: client.doctor_otolaryngologist ?? "",
    doctor_ophthalmologist: client.doctor_ophthalmologist ?? "",
    doctor_therapist: client.doctor_therapist ?? "",
    doctor_psychiatrist: client.doctor_psychiatrist ?? "",
    doctor_infectionist: client.doctor_infectionist ?? "",
    doctor_phthisiatrician: client.doctor_phthisiatrician ?? "",
    doctor_uzist: client.doctor_uzist ?? "",
    indications: client.indications ?? "",
    encounter_date_text: client.encounter_date_text ?? "",
    card_number: client.card_number ?? "",
    journal_number: client.journal_number ?? "",
    no_number: client.no_number ?? "",
    flg: client.flg ?? "",
    organization: client.organization ?? "",
    mkb10: client.mkb10 ?? "",
    real_date_text: client.real_date_text ?? "",
    legacy_payload_json: client.legacy_payload_json ?? null,
  };
}

function parseApiError(error: unknown) {
  if (!(error instanceof Error)) return "Не удалось выполнить действие";
  try {
    const detail = JSON.parse(error.message).detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) {
      const duplicate = detail.full_name ? `: ${detail.full_name}, № ${detail.patient_number}` : "";
      return `${detail.message}${duplicate}`;
    }
  } catch {
    return error.message;
  }
  return error.message;
}

function servicePrice(service: Service) {
  return Number(service.price || 0);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "не указано";
  return String(value);
}

function readSavedColumnWidths() {
  try {
    const saved = window.localStorage.getItem(columnStorageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}

export function ClientListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClientPayload>(emptyClientForm);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [paymentType, setPaymentType] = useState("cash");
  const [visitDate, setVisitDate] = useState(today);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => readSavedColumnWidths());
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id));
  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, service) => sum + servicePrice(service), 0),
    [selectedServices],
  );

  async function loadServices() {
    try {
      const result = await api.getServices();
      setServices(result);
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function loadClients(value = search) {
    const trimmed = value.trim();
    setError("");
    setNotice("");
    if (!trimmed) {
      setClients([]);
      setSelectedClientId(null);
      return;
    }

    setLoading(true);
    try {
      const result = await api.getClients(trimmed, 25);
      setClients(result);
      setSelectedClientId((current) => {
        if (current && result.some((client) => client.id === current)) return current;
        return result[0]?.id ?? null;
      });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    const focusId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(focusId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadClients(search);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    if (selectedClient && !isEditingClient) {
      setClientForm(clientToForm(selectedClient));
    }
  }, [selectedClientId, selectedClient, isEditingClient]);

  function startCreate() {
    const parts = search.trim().split(/\s+/).filter(Boolean);
    setIsEditingClient(true);
    setSelectedClientId(null);
    setClientForm({
      ...emptyClientForm,
      last_name: parts[0] ?? "",
      first_name: parts[1] ?? "",
      middle_name: parts.slice(2).join(" "),
    });
  }

  function startEdit() {
    if (!selectedClient) return;
    setIsEditingClient(true);
    setClientForm(clientToForm(selectedClient));
  }

  function cancelEdit() {
    setIsEditingClient(false);
    if (selectedClient) setClientForm(clientToForm(selectedClient));
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = compactPayload(clientForm);
      const saved = selectedClient && isEditingClient
        ? await api.updateClient(selectedClient.id, payload)
        : await api.createClient(payload);
      setSearch(saved.last_name);
      setSelectedClientId(saved.id);
      setClientForm(clientToForm(saved));
      setIsEditingClient(false);
      setNotice(`Клиент сохранен: № ${saved.patient_number}`);
      await loadClients(saved.last_name);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function createVisit() {
    if (!selectedClient) {
      setError("Сначала выберите или создайте клиента.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Выберите хотя бы одну услугу.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const encounter = await api.createEncounter({
        center_id: 1,
        client_id: selectedClient.id,
        encounter_date: visitDate,
        payment_type: paymentType,
        total_amount: totalAmount.toFixed(2),
        comment: comment || null,
      });

      await Promise.all(
        selectedServices.map((service) =>
          api.createEncounterService({
            encounter_id: encounter.id,
            service_id: service.id,
            quantity: 1,
            unit_price: service.price,
            line_total: service.price,
            sequence_number: null,
            notes: null,
          }),
        ),
      );

      setNotice(`Обращение № ${encounter.id} оформлено. Сумма: ${totalAmount.toFixed(2)}`);
      setComment("");
      setSelectedServiceIds([]);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function toggleService(serviceId: number) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function downloadDemoDocument() {
    if (!selectedClient) {
      setError("Сначала выберите клиента.");
      return;
    }

    const selectedServiceNames = selectedServices.map((service) => service.name).join(", ") || "услуги не выбраны";
    const documentText = [
      "МЕДИЦИНСКАЯ СПРАВКА",
      "",
      `Пациент: ${fullName(selectedClient)}`,
      `№ пациента: ${selectedClient.patient_number}`,
      `Дата рождения: ${formatDate(selectedClient.birth_date)}`,
      `Регистрация: ${displayValue(selectedClient.registration_text || selectedClient.address_text)}`,
      `Категории и условия допуска: ${displayValue(selectedClient.admission_category)}`,
      `№ справки: ${displayValue(selectedClient.reference_number)}`,
      `Дата обращения: ${displayValue(selectedClient.encounter_date_text || visitDate)}`,
      `Организация: ${displayValue(selectedClient.organization)}`,
      `МКБ10: ${displayValue(selectedClient.mkb10)}`,
      "",
      `Выбранные услуги: ${selectedServiceNames}`,
      `Сумма: ${formatMoney(totalAmount)} руб.`,
      "",
      "Заключение: годен.",
      "Документ сформирован в демонстрационной версии рабочего места оператора.",
    ].join("\n");

    const blob = new Blob([documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spravka-${selectedClient.patient_number}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Справка для ${fullName(selectedClient)} сформирована.`);
  }

  useEffect(() => {
    window.localStorage.setItem(columnStorageKey, JSON.stringify(columnWidths));
  }, [columnWidths]);

  function startColumnResize(key: string, event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const root = document.documentElement;
    const currentWidth = Number.parseInt(
      getComputedStyle(root).getPropertyValue(`--excel-col-${key}`).trim(),
      10,
    );
    const initialWidth = columnWidths[key] || currentWidth || 80;
    const startX = event.clientX;

    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(22, initialWidth + moveEvent.clientX - startX);
      setColumnWidths((current) => ({ ...current, [key]: nextWidth }));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const columnStyle = Object.fromEntries(
    Object.entries(columnWidths).map(([key, width]) => [`--excel-col-${key}`, `${width}px`]),
  ) as CSSProperties;

  return (
    <div className="operator-shell">
      <aside className="operator-sidebar">
        <div className="operator-logo">
            <div className="operator-logo__mark">M</div>
            <div>
              <strong>MedCenters</strong>
              <span>Рабочее место</span>
            </div>
        </div>

        <div className="operator-menu">
          {sideActions.map((item) => (
            <button key={item} type="button" className="operator-menu__item">
              {item}
            </button>
          ))}
        </div>
      </aside>

      <main className="operator-main">
        <header className="operator-header">
          <div>
            <div className="operator-eyebrow">Единая система для двух медцентров</div>
            <h1>Главная</h1>
          </div>
          <div className="operator-header-actions">
            <a className="demo-link-button" href="/demo/index.html" target="_blank" rel="noreferrer">
              Открыть demo 1:1
            </a>
          </div>
        </header>

        {error ? <div className="operator-alert operator-alert--error">{error}</div> : null}
        {notice ? <div className="operator-alert">{notice}</div> : null}

        <section className="operator-table-card">
          <div className="sketch-doctors sketch-doctors--top">
            {doctors.map((doctor) => (
              <button key={doctor} type="button" className="doctor-pill">
                {doctor}
              </button>
            ))}
          </div>

          <div className="operator-search">
            <input
              ref={searchInputRef}
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="поиск"
            />
            <button type="button" onClick={() => void loadClients(search)}>
              Найти
            </button>
            <button type="button" onClick={startCreate}>
              Добавить
            </button>
            <span>{loading ? "Идет поиск..." : search.trim() ? `Найдено: ${clients.length}` : ""}</span>
          </div>

          <div className="sketch-table sketch-table--excel" style={columnStyle}>
            <div className="sketch-table__grid sketch-table__grid--head">
              {columns.map((column) => (
                <span key={column.key} className="sketch-head-cell sketch-head-cell--resizable">
                  <span>{column.label}</span>
                  <button
                    className="col-resize-handle"
                    type="button"
                    aria-label={`Изменить ширину столбца ${column.label}`}
                    onMouseDown={(event) => startColumnResize(column.key, event)}
                  />
                </span>
              ))}
            </div>

              {clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={
                    client.id === selectedClientId
                      ? "sketch-table__grid sketch-table__grid--row sketch-table__grid--active"
                      : "sketch-table__grid sketch-table__grid--row"
                  }
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setIsEditingClient(false);
                  }}
                >
                  <span>{client.patient_number}</span>
                  <span>{fullName(client)}</span>
                  <span>{formatDate(client.birth_date)}</span>
                  <span>{client.registration_text || client.address_text || "-"}</span>
                  <span>{client.admission_category || ""}</span>
                  <span>{client.reference_number || ""}</span>
                  <span>{client.doctor_gynecologist || ""}</span>
                  <span>{client.doctor_stomatologist || ""}</span>
                  <span>{client.doctor_dermatologist || ""}</span>
                  <span>{client.doctor_neurologist || ""}</span>
                  <span>{client.doctor_surgeon || ""}</span>
                  <span>{client.doctor_otolaryngologist || ""}</span>
                  <span>{client.doctor_ophthalmologist || ""}</span>
                  <span>{client.doctor_therapist || ""}</span>
                  <span>{client.doctor_psychiatrist || ""}</span>
                  <span>{client.doctor_infectionist || ""}</span>
                  <span>{client.doctor_phthisiatrician || ""}</span>
                  <span>{client.doctor_uzist || ""}</span>
                  <span>{client.notes || ""}</span>
                  <span>{client.encounter_date_text || ""}</span>
                  <span>{client.card_number || client.patient_number}</span>
                  <span>{client.no_number || ""}</span>
                  <span>{client.flg || ""}</span>
                  <span>{client.organization || ""}</span>
                  <span>{client.mkb10 || ""}</span>
                  <span>{client.real_date_text || ""}</span>
                </button>
              ))}

              {!loading && search.trim() && clients.length === 0 ? (
                <div className="operator-empty">Клиент не найден. Нажмите “Добавить”, ФИО подтянется из поиска.</div>
              ) : null}
              {!search.trim() ? (
                <div className="operator-empty">Без поиска таблица пустая, чтобы не грузить всю базу в браузер.</div>
              ) : null}
          </div>
        </section>

        <section className="operator-bottom">
          <form className="client-work-card" onSubmit={saveClient}>
            <div className="work-card__head">
              <h2>{isEditingClient ? "Информация о клиенте" : "Информация о клиенте"}</h2>
              <div className="work-card__actions">
                {selectedClient ? (
                  <button type="button" onClick={startEdit}>
                    Изменить
                  </button>
                ) : null}
                {isEditingClient ? (
                  <button type="button" onClick={cancelEdit}>
                    Отмена
                  </button>
                ) : null}
                <button type="submit" disabled={saving || !isEditingClient}>
                  {saving ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
            </div>

            <div className="client-summary-grid">
              <div>
                <span>№ пациента</span>
                <strong>{selectedClient ? selectedClient.patient_number : "не выбран"}</strong>
              </div>
              <div>
                <span>ФИО</span>
                <strong>{selectedClient ? fullName(selectedClient) : "найдите клиента сверху"}</strong>
              </div>
              <div>
                <span>Дата рождения</span>
                <strong>{selectedClient ? formatDate(selectedClient.birth_date) : "не указано"}</strong>
              </div>
              <div>
                <span>Категории</span>
                <strong>{displayValue(selectedClient?.admission_category)}</strong>
              </div>
              <div className="client-summary-grid__wide">
                <span>Регистрация</span>
                <strong>{displayValue(selectedClient?.registration_text || selectedClient?.address_text)}</strong>
              </div>
              <div>
                <span>Организация</span>
                <strong>{displayValue(selectedClient?.organization)}</strong>
              </div>
              <div>
                <span>МКБ10</span>
                <strong>{displayValue(selectedClient?.mkb10)}</strong>
              </div>
              <div className="client-summary-grid__wide">
                <span>Примечание</span>
                <strong>{displayValue(selectedClient?.notes)}</strong>
              </div>
            </div>

            <div className="client-form-grid">
              <label>
                Фамилия
                <input value={clientForm.last_name} onChange={(e) => setClientForm({ ...clientForm, last_name: e.target.value })} disabled={!isEditingClient} required />
              </label>
              <label>
                Имя
                <input value={clientForm.first_name} onChange={(e) => setClientForm({ ...clientForm, first_name: e.target.value })} disabled={!isEditingClient} required />
              </label>
              <label>
                Отчество
                <input value={clientForm.middle_name ?? ""} onChange={(e) => setClientForm({ ...clientForm, middle_name: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Дата рождения
                <input type="date" value={clientForm.birth_date} onChange={(e) => setClientForm({ ...clientForm, birth_date: e.target.value })} disabled={!isEditingClient} required />
              </label>
              <label>
                Телефон
                <input value={clientForm.phone ?? ""} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                СНИЛС
                <input value={clientForm.snils ?? ""} onChange={(e) => setClientForm({ ...clientForm, snils: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Документ
                <input value={[clientForm.document_series, clientForm.document_number].filter(Boolean).join(" ")} disabled />
              </label>
              <label>
                Полис
                <input value={clientForm.oms_policy ?? ""} onChange={(e) => setClientForm({ ...clientForm, oms_policy: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label className="client-form-grid__wide">
                Регистрация
                <input value={clientForm.address_text ?? ""} onChange={(e) => setClientForm({ ...clientForm, address_text: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label className="client-form-grid__wide">
                Комментарий
                <textarea value={clientForm.notes ?? ""} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} disabled={!isEditingClient} />
              </label>
            </div>
          </form>

          <section className="visit-work-card">
            <div className="work-card__head">
              <h2>Оформление обращения</h2>
              <strong>{selectedClient ? fullName(selectedClient) : "Клиент не выбран"} · услуг: {services.length}</strong>
            </div>

            <div className="visit-controls">
              <label>
                Дата
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </label>
              <label>
                Оплата
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  <option value="cash">Наличные</option>
                  <option value="card">Карта</option>
                  <option value="invoice">Безнал</option>
                </select>
              </label>
              <label>
                Сумма
                <input value={totalAmount.toFixed(2)} readOnly />
              </label>
            </div>

            <div className="services-picker">
              {services.length === 0 ? (
                <div className="services-empty">Услуги не загрузились. Проверьте, что backend запущен на 8000.</div>
              ) : null}
              {services.map((service) => (
                <label key={service.id} className={selectedServiceIds.includes(service.id) ? "service-pill service-pill--active" : "service-pill"}>
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                  />
                  <span>{service.name}</span>
                  <strong>{service.price}</strong>
                </label>
              ))}
            </div>

            <textarea
              className="visit-comment"
              placeholder="Комментарий к обращению"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="visit-actions">
              <button className="primary-action" type="button" disabled={saving} onClick={() => void createVisit()}>
                {saving ? "Оформляю..." : "Оформить обращение"}
              </button>
              <button className="secondary-action" type="button" disabled={!selectedClient} onClick={downloadDemoDocument}>
                Сформировать справку
              </button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
