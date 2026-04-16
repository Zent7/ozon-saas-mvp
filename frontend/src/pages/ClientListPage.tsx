import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { api, type Client } from "../shared/api";

const initialForm = {
  last_name: "",
  first_name: "",
  middle_name: "",
  birth_date: "",
  sex: "",
  phone: "",
  snils: "",
  oms_policy: "",
  address_text: "",
  notes: "",
};

function formatFullName(client: Client) {
  return [client.last_name, client.first_name, client.middle_name ?? ""].filter(Boolean).join(" ");
}

function formatBirthDate(value: string) {
  if (!value) {
    return "Не указана";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU").format(date);
}

export function ClientListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const loadClients = async (value = "") => {
    setLoading(true);
    setError("");
    try {
      const data = await api.getClients(value);
      setClients(data);
      setSelectedClientId((current) => {
        if (data.length === 0) {
          return null;
        }

        if (current && data.some((client) => client.id === current)) {
          return current;
        }

        return data[0].id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить клиентов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const createdClient = await api.createClient({
        ...form,
        middle_name: form.middle_name || null,
        sex: form.sex || null,
        phone: form.phone || null,
        snils: form.snils || null,
        oms_policy: form.oms_policy || null,
        address_text: form.address_text || null,
        notes: form.notes || null,
      });
      setForm(initialForm);
      await loadClients(search);
      setSelectedClientId(createdClient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать клиента");
    }
  };

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Картотека пациентов</h1>
          <p>Плотный реестр для регистратуры: поиск, выбор записи и быстрый просмотр карточки на одном экране.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Всего записей</span>
            <strong>{clients.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Активная карточка</span>
            <strong>{selectedClient ? selectedClient.id : "—"}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar toolbar--desktop">
        <div className="search-group">
          <input
            className="input input--compact"
            placeholder="Поиск по ФИО, телефону, СНИЛС"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="button" onClick={() => void loadClients(search)} type="button">
            Найти
          </button>
        </div>
        <div className="toolbar-actions">
          <span className="toolbar-note">Режим: реестр пациентов</span>
          <button className="button button--secondary" onClick={() => void loadClients(search)} type="button">
            Обновить
          </button>
        </div>
      </div>

      {error ? <div className="panel panel--error">{error}</div> : null}

      <div className="desktop-grid">
        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>Список пациентов</h2>
            <span>{loading ? "Загрузка..." : `Показано: ${clients.length}`}</span>
          </div>

          <div className="record-table">
            <div className="record-table__header">
              <span>ФИО</span>
              <span>Дата рождения</span>
              <span>Телефон</span>
              <span>СНИЛС</span>
              <span>Полис</span>
            </div>

            <div className="record-table__body">
              {clients.map((client) => {
                const isActive = client.id === selectedClientId;

                return (
                  <button
                    key={client.id}
                    className={isActive ? "record-table__row record-table__row--active" : "record-table__row"}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <span>{formatFullName(client)}</span>
                    <span>{formatBirthDate(client.birth_date)}</span>
                    <span>{client.phone || "—"}</span>
                    <span>{client.snils || "—"}</span>
                    <span>{client.oms_policy || "—"}</span>
                  </button>
                );
              })}

              {!loading && clients.length === 0 ? (
                <div className="record-table__empty">По текущему запросу записи не найдены.</div>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="desktop-sidebar">
          <section className="panel">
            <div className="panel__heading">
              <h2>Карточка пациента</h2>
              <span>{selectedClient ? `ID ${selectedClient.id}` : "Нет выбора"}</span>
            </div>

            {selectedClient ? (
              <div className="details-card">
                <div className="details-card__name">{formatFullName(selectedClient)}</div>
                <div className="details-card__grid">
                  <div>
                    <span>Дата рождения</span>
                    <strong>{formatBirthDate(selectedClient.birth_date)}</strong>
                  </div>
                  <div>
                    <span>Пол</span>
                    <strong>{selectedClient.sex || "—"}</strong>
                  </div>
                  <div>
                    <span>Телефон</span>
                    <strong>{selectedClient.phone || "—"}</strong>
                  </div>
                  <div>
                    <span>СНИЛС</span>
                    <strong>{selectedClient.snils || "—"}</strong>
                  </div>
                  <div>
                    <span>Полис</span>
                    <strong>{selectedClient.oms_policy || "—"}</strong>
                  </div>
                  <div>
                    <span>Адрес</span>
                    <strong>{selectedClient.address_text || "—"}</strong>
                  </div>
                </div>

                <div className="details-card__notes">
                  <span>Примечания</span>
                  <p>{selectedClient.notes || "Комментариев пока нет."}</p>
                </div>
              </div>
            ) : (
              <div className="empty-card">Выберите пациента в таблице слева, чтобы открыть карточку.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel__heading">
              <h2>Быстрая регистрация</h2>
              <span>Новая запись</span>
            </div>

            <form className="form-grid form-grid--dense" onSubmit={submitForm}>
              <div className="form-row">
                <input
                  className="input input--compact"
                  placeholder="Фамилия"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
                />
                <input
                  className="input input--compact"
                  placeholder="Имя"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <input
                className="input input--compact"
                placeholder="Отчество"
                value={form.middle_name}
                onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
              />
              <div className="form-row">
                <input
                  className="input input--compact"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  required
                />
                <input
                  className="input input--compact"
                  placeholder="Пол"
                  value={form.sex}
                  onChange={(e) => setForm({ ...form, sex: e.target.value })}
                />
              </div>
              <input
                className="input input--compact"
                placeholder="Телефон"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <div className="form-row">
                <input
                  className="input input--compact"
                  placeholder="СНИЛС"
                  value={form.snils}
                  onChange={(e) => setForm({ ...form, snils: e.target.value })}
                />
                <input
                  className="input input--compact"
                  placeholder="Полис"
                  value={form.oms_policy}
                  onChange={(e) => setForm({ ...form, oms_policy: e.target.value })}
                />
              </div>
              <textarea
                className="input input--textarea"
                placeholder="Адрес"
                value={form.address_text}
                onChange={(e) => setForm({ ...form, address_text: e.target.value })}
              />
              <textarea
                className="input input--textarea"
                placeholder="Примечания"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
              <button className="button" type="submit">
                Сохранить карточку
              </button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
