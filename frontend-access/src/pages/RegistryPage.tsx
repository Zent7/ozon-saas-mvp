import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { api, type Client, type ClientDocument, type Encounter } from "../shared/api";

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

function fullName(client: Client) {
  return [client.last_name, client.first_name, client.middle_name ?? ""].filter(Boolean).join(" ");
}

function registrationText(client: Client) {
  return client.address_text || "СПб, ул. Хуторская";
}

function patientCategory(client: Client) {
  if (client.notes?.toLowerCase().includes("проф")) {
    return "Проф";
  }
  if (client.notes?.toLowerCase().includes("дмс")) {
    return "ДМС";
  }
  if (client.oms_policy) {
    return "ЛМК";
  }
  return "АВ";
}

function cardNumber(client: Client) {
  return String(400000 + client.id * 37);
}

function rowFlags(client: Client) {
  const seed = client.id % 7;
  return [seed > 0, seed > 2, seed > 3, seed > 4];
}

export function RegistryPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [showBlankDialog, setShowBlankDialog] = useState(true);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
  const [clientEncounters, setClientEncounters] = useState<Encounter[]>([]);

  const loadClients = async (value = "") => {
    try {
      setError("");
      const data = await api.getClients(value);
      setClients(data);
      setSelectedId((current) => {
        if (!data.length) {
          return null;
        }
        return current && data.some((client) => client.id === current) ? current : data[0].id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить картотеку");
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedId) ?? null,
    [clients, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setClientDocuments([]);
      setClientEncounters([]);
      return;
    }

    api.getClientDocuments(selectedId).then(setClientDocuments).catch(() => setClientDocuments([]));
    api.getEncounters().then((items) => setClientEncounters(items.filter((item) => item.client_id === selectedId))).catch(() => setClientEncounters([]));
  }, [selectedId]);

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const created = await api.createClient({
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
      setSelectedId(created.id);
      setShowClientDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить карточку");
    }
  };

  const primaryDocument = clientDocuments[0];

  return (
    <section className="desk-page desk-page--registry">
      <div className="record-header">
        <div className="record-header__cell">59</div>
        <div className="record-header__cell record-header__cell--wide">
          {selectedClient ? fullName(selectedClient) : "Карточка не выбрана"}
        </div>
        <div className="record-header__cell">1/{clients.length || 0}</div>
      </div>

      <div className="desk-toolbar desk-toolbar--access">
        <div className="desk-toolbar__group">
          <span className="desk-toolbar__label">Поиск:</span>
          <input
            className="desk-input desk-input--search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder=""
          />
          <button className="toolbar-button" type="button" onClick={() => void loadClients(search)}>Обновить</button>
          <button className="toolbar-button" type="button" onClick={() => setShowClientDialog(true)}>Новый клиент</button>
          <button className="toolbar-button" type="button" onClick={() => setShowBlankDialog(true)}>Добавить бланки</button>
        </div>
      </div>

      <div className="filter-panel">
        <div className="filter-panel__title">Фильтры:</div>
        <div className="filter-grid">
          <div className="filter-grid__head">
            <span>Включено</span>
            <span>Поле</span>
            <span>Условие</span>
            <span>Значение</span>
          </div>
          <div className="filter-grid__row">
            <span>☐</span>
            <span>Дата последнего обращения</span>
            <span>=</span>
            <span />
          </div>
          <div className="filter-grid__row">
            <span>☐</span>
            <span>Клиент</span>
            <span>Начинается с</span>
            <span>{search}</span>
          </div>
        </div>
      </div>

      {error ? <div className="desk-error">{error}</div> : null}

      <div className="registry-layout registry-layout--single">
        <section className="desk-panel desk-panel--main">
          <div className="dense-table dense-table--registry-screen">
            <div className="dense-table__head dense-table__head--registry-access">
              <span>ID</span>
              <span>Дата последнего обращения</span>
              <span>Клиент</span>
              <span>Дата рождения</span>
              <span>Должность</span>
              <span>Организация</span>
              <span>Адрес</span>
              <span>Телефон</span>
              <span>Кат.</span>
              <span>№ справки</span>
              <span className="rotated-col">Тер.</span>
              <span className="rotated-col">Офт.</span>
              <span className="rotated-col">Невр.</span>
              <span className="rotated-col">ЛОР</span>
            </div>
            <div className="dense-table__body">
              {clients.map((client) => {
                const flags = rowFlags(client);

                return (
                  <button
                    key={client.id}
                    type="button"
                    className={client.id === selectedId ? "dense-table__row dense-table__row--registry-access dense-table__row--active" : "dense-table__row dense-table__row--registry-access"}
                    onClick={() => setSelectedId(client.id)}
                  >
                    <span>{client.id}</span>
                    <span>{client.birth_date} 22:13</span>
                    <span>{fullName(client)}</span>
                    <span>{client.birth_date}</span>
                    <span>{client.notes?.slice(0, 10) || ""}</span>
                    <span>{patientCategory(client)}</span>
                    <span>{registrationText(client)}</span>
                    <span>{client.phone || "—"}</span>
                    <span>{patientCategory(client)}</span>
                    <span>{client.snils || cardNumber(client)}</span>
                    <span>{flags[0] ? "X" : ""}</span>
                    <span>{flags[1] ? "X" : ""}</span>
                    <span>{flags[2] ? "X" : ""}</span>
                    <span>{flags[3] ? "X" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="bottom-tabs">
          <span className="bottom-tabs__item bottom-tabs__item--active">Обращения</span>
          <span className="bottom-tabs__item">Оказанные услуги</span>
          <span className="bottom-tabs__item">Договоры</span>
        </div>
      </div>

      {showBlankDialog ? (
        <div className="blank-dialog-wrap">
          <div className="blank-dialog">
            <div className="blank-dialog__titlebar">
              <span>Регистрация полученных бланков</span>
              <button type="button" onClick={() => setShowBlankDialog(false)}>×</button>
            </div>
            <div className="blank-dialog__body">
              <div className="blank-dialog__left">
                <label><span>Получить дату получения бланка:</span><input className="desk-input" value="07.04.2025" readOnly /></label>
                <label><span>Введите серию бланков:</span><input className="desk-input" value="ЧФА" readOnly /></label>
                <label><span>Введите начальный номер:</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Введите конечный номер:</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Примечание:</span><input className="desk-input" value="" readOnly /></label>
              </div>
              <div className="blank-dialog__right">
                <p>ПРИМЕЧАНИЕ: если в бланках серия, которая необходима для корректности, сначала укажите новый номер.</p>
                <p>Чтобы зарегистрировать один бланк, достаточно в начальный и конечный номер поставить одинаковое значение.</p>
              </div>
            </div>
            <div className="blank-dialog__actions">
              <button className="toolbar-button toolbar-button--primary" type="button">Зарегистрировать</button>
              <button className="toolbar-button" type="button" onClick={() => setShowBlankDialog(false)}>Отмена</button>
            </div>
          </div>
        </div>
      ) : null}

      {showClientDialog ? (
        <div className="client-dialog-wrap">
          <div className="client-dialog">
            <div className="client-dialog__titlebar">
              <span>Добавление в таблицу "Клиенты"</span>
              <button type="button" onClick={() => setShowClientDialog(false)}>×</button>
            </div>
            <form className="client-dialog__body" onSubmit={submitForm}>
              <div className="client-form-grid">
                <label><span>Фамилия</span><input className="desk-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></label>
                <label><span>Документ удост. личности</span><input className="desk-input" value={primaryDocument?.document_type ?? ""} readOnly /></label>
                <label><span>Субъект РФ</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Имя</span><input className="desk-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></label>
                <label><span>Серия</span><input className="desk-input" value={primaryDocument?.series ?? ""} readOnly /></label>
                <label><span>Город</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Отчество</span><input className="desk-input" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} /></label>
                <label><span>Кем выдан</span><input className="desk-input" value={primaryDocument?.issued_by ?? ""} readOnly /></label>
                <label><span>Район</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Пол</span><input className="desk-input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })} /></label>
                <label><span>Дата рождения</span><input className="desk-input" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} required /></label>
                <label><span>Улица</span><input className="desk-input" value={form.address_text} onChange={(e) => setForm({ ...form, address_text: e.target.value })} /></label>
                <label><span>Телефон</span><input className="desk-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label><span>Тип регистрации</span><input className="desk-input" value="Место фактического проживания" readOnly /></label>
                <label><span>№ дома</span><input className="desk-input" value="" readOnly /></label>
                <label><span>СНИЛС</span><input className="desk-input" value={form.snils} onChange={(e) => setForm({ ...form, snils: e.target.value })} /></label>
                <label><span>Наименование организации</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Дата последнего обращения</span><input className="desk-input" value={clientEncounters[0]?.encounter_date ?? ""} readOnly /></label>
              </div>
              <div className="client-dialog__sidebar">
                <label><span>Пункты вредности</span><textarea className="desk-input desk-input--area" value="" readOnly /></label>
                <label><span>Клиент</span><input className="desk-input" value="True" readOnly /></label>
                <label><span>Комментарии</span><textarea className="desk-input desk-input--area" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
              </div>
              <div className="client-dialog__table">
                <div className="subtable-tabs">
                  <span className="bottom-tabs__item bottom-tabs__item--active">Обращения (0/0)</span>
                  <span className="bottom-tabs__item">Оказанные услуги</span>
                  <span className="bottom-tabs__item">Договоры</span>
                </div>
                <div className="subtable-head">
                  <span>ID</span>
                  <span>Дата обращения</span>
                  <span>Стоимость услуг</span>
                  <span>Регистратор</span>
                  <span>Всего оплачено</span>
                  <span>Примечание</span>
                  <span>Тип оплаты</span>
                  <span>Оказанные услуги</span>
                </div>
                {clientEncounters.map((encounter) => (
                  <div className="subtable-head subtable-head--row" key={encounter.id}>
                    <span>{encounter.id}</span>
                    <span>{encounter.encounter_date}</span>
                    <span>{encounter.total_amount}</span>
                    <span>admin</span>
                    <span>{encounter.total_amount}</span>
                    <span>{encounter.comment || ""}</span>
                    <span>{encounter.payment_type}</span>
                    <span>1</span>
                  </div>
                ))}
              </div>
              <div className="client-dialog__actions">
                <button className="toolbar-button toolbar-button--primary" type="submit">OK</button>
                <button className="toolbar-button" type="button" onClick={() => setShowClientDialog(false)}>Отмена</button>
                <button className="toolbar-button" type="button">Применить</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
