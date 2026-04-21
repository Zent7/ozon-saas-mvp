import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { api, type Client, type ClientPayload } from "../shared/api";

const emptyForm: ClientPayload = {
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
  };
}

function fullName(client: Client) {
  return [client.last_name, client.first_name, client.middle_name ?? ""].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU").format(date);
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

export function ClientListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [form, setForm] = useState<ClientPayload>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;

  async function loadClients(value = search) {
    const trimmed = value.trim();
    setError("");
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
    const timeoutId = window.setTimeout(() => {
      void loadClients(search);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  function startCreate() {
    setEditingClientId(null);
    const parts = search.trim().split(/\s+/).filter(Boolean);
    setForm({
      ...emptyForm,
      last_name: parts[0] ?? "",
      first_name: parts[1] ?? "",
      middle_name: parts.slice(2).join(" "),
    });
  }

  function startEdit(client: Client) {
    setEditingClientId(client.id);
    setSelectedClientId(client.id);
    setForm(clientToForm(client));
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = compactPayload(form);
      const saved = editingClientId
        ? await api.updateClient(editingClientId, payload)
        : await api.createClient(payload);
      setSearch(saved.last_name);
      setSelectedClientId(saved.id);
      setEditingClientId(saved.id);
      setForm(clientToForm(saved));
      await loadClients(saved.last_name);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Клиенты</h1>
          <p>Поиск идет через backend с лимитом 25 записей. Без строки поиска база целиком не загружается.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Найдено</span>
            <strong>{clients.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Выбран</span>
            <strong>{selectedClient?.patient_number ?? "-"}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar toolbar--desktop">
        <div className="search-group">
          <input
            className="input input--compact"
            placeholder="ФИО, телефон, документ, СНИЛС, полис или №"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
          <button className="button" onClick={() => void loadClients(search)} type="button">
            Найти
          </button>
          <button className="button button--secondary" onClick={startCreate} type="button">
            Добавить
          </button>
        </div>
        <span className="toolbar-note">Показ максимум 25 клиентов, чтобы поиск оставался быстрым.</span>
      </div>

      {error ? <div className="panel panel--error">{error}</div> : null}

      <div className="desktop-grid">
        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>Результаты поиска</h2>
            <span>{loading ? "Загрузка..." : search.trim() ? `Показано: ${clients.length}` : "Введите запрос"}</span>
          </div>

          <div className="record-table record-table--clients">
            <div className="record-table__header record-table__header--clients">
              <span>№</span>
              <span>ФИО</span>
              <span>Дата рождения</span>
              <span>Телефон</span>
              <span>Документ</span>
              <span>СНИЛС</span>
            </div>
            <div className="record-table__body">
              {clients.map((client) => (
                <button
                  key={client.id}
                  className={client.id === selectedClientId ? "record-table__row record-table__row--active record-table__row--clients" : "record-table__row record-table__row--clients"}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <span>{client.patient_number}</span>
                  <span>{fullName(client)}</span>
                  <span>{formatDate(client.birth_date)}</span>
                  <span>{client.phone || "-"}</span>
                  <span>{[client.document_series, client.document_number].filter(Boolean).join(" ") || "-"}</span>
                  <span>{client.snils || "-"}</span>
                </button>
              ))}
              {!loading && search.trim() && clients.length === 0 ? (
                <div className="record-table__empty">Клиент не найден. Можно нажать “Добавить”.</div>
              ) : null}
              {!search.trim() ? (
                <div className="record-table__empty">Введите фамилию, телефон, дату рождения, документ или номер пациента.</div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="desktop-sidebar">
          <section className="panel">
            <div className="panel__heading">
              <h2>Карточка клиента</h2>
              <span>{selectedClient ? `№ ${selectedClient.patient_number}` : "Нет выбора"}</span>
            </div>
            {selectedClient ? (
              <div className="details-card">
                <div className="details-card__name">{fullName(selectedClient)}</div>
                <div className="details-card__grid">
                  <div><span>Дата рождения</span><strong>{formatDate(selectedClient.birth_date)}</strong></div>
                  <div><span>Телефон</span><strong>{selectedClient.phone || "-"}</strong></div>
                  <div><span>Документ</span><strong>{[selectedClient.document_series, selectedClient.document_number].filter(Boolean).join(" ") || "-"}</strong></div>
                  <div><span>СНИЛС</span><strong>{selectedClient.snils || "-"}</strong></div>
                  <div><span>Полис</span><strong>{selectedClient.oms_policy || "-"}</strong></div>
                  <div><span>Email</span><strong>{selectedClient.email || "-"}</strong></div>
                </div>
                <div className="details-card__notes">
                  <span>Адрес</span>
                  <p>{selectedClient.address_text || "-"}</p>
                </div>
                <button className="button button--secondary" type="button" onClick={() => startEdit(selectedClient)}>
                  Изменить
                </button>
              </div>
            ) : (
              <div className="empty-card">Выберите клиента или создайте новую карточку.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel__heading">
              <h2>{editingClientId ? "Изменение клиента" : "Новый клиент"}</h2>
              <span>Антидубли включены</span>
            </div>

            <form className="form-grid form-grid--dense" onSubmit={submitForm}>
              <div className="form-row">
                <input className="input input--compact" placeholder="Фамилия" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                <input className="input input--compact" placeholder="Имя" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              </div>
              <input className="input input--compact" placeholder="Отчество" value={form.middle_name ?? ""} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
              <div className="form-row">
                <input className="input input--compact" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required />
                <input className="input input--compact" placeholder="Пол" value={form.sex ?? ""} onChange={(e) => setForm({ ...form, sex: e.target.value })} />
              </div>
              <div className="form-row">
                <input className="input input--compact" placeholder="Телефон" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input className="input input--compact" placeholder="Email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-row">
                <input className="input input--compact" placeholder="Серия документа" value={form.document_series ?? ""} onChange={(e) => setForm({ ...form, document_series: e.target.value })} />
                <input className="input input--compact" placeholder="Номер документа" value={form.document_number ?? ""} onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
              </div>
              <input className="input input--compact" placeholder="Кем выдан" value={form.document_issued_by ?? ""} onChange={(e) => setForm({ ...form, document_issued_by: e.target.value })} />
              <div className="form-row">
                <input className="input input--compact" placeholder="СНИЛС" value={form.snils ?? ""} onChange={(e) => setForm({ ...form, snils: e.target.value })} />
                <input className="input input--compact" placeholder="Полис" value={form.oms_policy ?? ""} onChange={(e) => setForm({ ...form, oms_policy: e.target.value })} />
              </div>
              <textarea className="input input--textarea" placeholder="Адрес" value={form.address_text ?? ""} onChange={(e) => setForm({ ...form, address_text: e.target.value })} />
              <textarea className="input input--textarea" placeholder="Комментарий" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="form-row">
                <button className="button" type="submit" disabled={saving}>
                  {saving ? "Сохранение..." : editingClientId ? "Сохранить изменения" : "Создать клиента"}
                </button>
                <button className="button button--secondary" type="button" onClick={startCreate}>
                  Очистить
                </button>
              </div>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
