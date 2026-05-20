import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { api, type Client, type Encounter } from "../shared/api";

const initialForm = {
  center_id: 1,
  client_id: 1,
  encounter_date: new Date().toISOString().slice(0, 10),
  payment_type: "cash",
  total_amount: "0.00",
  comment: "",
};

function formatClientName(client?: Client) {
  if (!client) {
    return "Не найден";
  }

  return [client.last_name, client.first_name, client.middle_name ?? ""].filter(Boolean).join(" ");
}

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    cash: "Наличные",
    card: "Карта",
    invoice: "Безнал",
  };

  return labels[value] ?? value;
}

export function EncountersPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(null);
  const [deletingEncounter, setDeletingEncounter] = useState(false);

  const loadData = async () => {
    try {
      const [encountersData, clientsData] = await Promise.all([api.getEncounters(), api.getClients()]);
      setEncounters(encountersData);
      setClients(clientsData);

      if (clientsData[0]) {
        setForm((current) => ({ ...current, client_id: current.client_id || clientsData[0].id }));
      }

      setSelectedEncounterId((current) => {
        if (encountersData.length === 0) {
          return null;
        }

        if (current && encountersData.some((encounter) => encounter.id === current)) {
          return current;
        }

        return encountersData[0].id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить обращения");
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await api.createEncounter({
        center_id: Number(form.center_id),
        client_id: Number(form.client_id),
        encounter_date: form.encounter_date,
        payment_type: form.payment_type,
        total_amount: form.total_amount,
        comment: form.comment || null,
      });
      setForm(initialForm);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать обращение");
    }
  };

  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const selectedEncounter = useMemo(
    () => encounters.find((encounter) => encounter.id === selectedEncounterId) ?? null,
    [encounters, selectedEncounterId],
  );

  const deleteSelectedEncounter = async () => {
    if (!selectedEncounter) {
      setError("Сначала выберите обращение.");
      return;
    }

    const confirmed = window.confirm(
      `Удалить обращение № ${selectedEncounter.id}?\n\nОно будет перемещено в удалённые, а не удалено физически.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingEncounter(true);
    setError("");
    try {
      await api.deleteEncounter(selectedEncounter.id);
      setEncounters((current) => current.filter((item) => item.id !== selectedEncounter.id));
      setSelectedEncounterId((current) => (current === selectedEncounter.id ? null : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить обращение");
    } finally {
      setDeletingEncounter(false);
    }
  };

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Журнал обращений</h1>
          <p>Рабочий журнал в стиле старой базы: список слева, подробности справа, новое обращение без переходов по экранам.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Всего обращений</span>
            <strong>{encounters.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Клиентов в базе</span>
            <strong>{clients.length}</strong>
          </div>
        </div>
      </div>

      {error ? <div className="panel panel--error">{error}</div> : null}

      <div className="desktop-grid">
        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>История обращений</h2>
            <span>Лента регистратора</span>
          </div>

          <div className="record-table">
            <div className="record-table__header record-table__header--encounters">
              <span>№</span>
              <span>Пациент</span>
              <span>Дата</span>
              <span>Оплата</span>
              <span>Сумма</span>
            </div>

            <div className="record-table__body">
              {encounters.map((encounter) => {
                const isActive = encounter.id === selectedEncounterId;

                return (
                  <button
                    key={encounter.id}
                    className={isActive ? "record-table__row record-table__row--encounters record-table__row--active" : "record-table__row record-table__row--encounters"}
                    type="button"
                    onClick={() => setSelectedEncounterId(encounter.id)}
                  >
                    <span>{encounter.id}</span>
                    <span>{formatClientName(clientsById.get(encounter.client_id))}</span>
                    <span>{encounter.encounter_date}</span>
                    <span>{paymentLabel(encounter.payment_type)}</span>
                    <span>{encounter.total_amount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="desktop-sidebar">
          <section className="panel">
            <div className="panel__heading">
              <h2>Подробности обращения</h2>
              <span>{selectedEncounter ? `№ ${selectedEncounter.id}` : "Нет выбора"}</span>
            </div>

            {selectedEncounter ? (
              <div className="details-card">
                <div className="details-card__name">{formatClientName(clientsById.get(selectedEncounter.client_id))}</div>
                <div className="toolbar-actions">
                  <button
                    className="button button--secondary button--small"
                    type="button"
                    onClick={() => void deleteSelectedEncounter()}
                    disabled={deletingEncounter}
                  >
                    {deletingEncounter ? "Удаляю..." : "Удалить обращение"}
                  </button>
                </div>
                <div className="details-card__grid">
                  <div>
                    <span>Дата</span>
                    <strong>{selectedEncounter.encounter_date}</strong>
                  </div>
                  <div>
                    <span>Центр</span>
                    <strong>{selectedEncounter.center_id}</strong>
                  </div>
                  <div>
                    <span>Оплата</span>
                    <strong>{paymentLabel(selectedEncounter.payment_type)}</strong>
                  </div>
                  <div>
                    <span>Сумма</span>
                    <strong>{selectedEncounter.total_amount}</strong>
                  </div>
                  <div>
                    <span>Статус</span>
                    <strong>{selectedEncounter.status}</strong>
                  </div>
                  <div>
                    <span>Клиент ID</span>
                    <strong>{selectedEncounter.client_id}</strong>
                  </div>
                </div>
                <div className="details-card__notes">
                  <span>Комментарий</span>
                  <p>{selectedEncounter.comment || "Комментарий не заполнен."}</p>
                </div>
              </div>
            ) : (
              <div className="empty-card">Выберите запись слева, чтобы увидеть подробности обращения.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel__heading">
              <h2>Новое обращение</h2>
              <span>Регистрация визита</span>
            </div>
            <form className="form-grid form-grid--dense" onSubmit={submitForm}>
              <div className="form-row">
                <select className="input input--compact" value={form.center_id} onChange={(e) => setForm({ ...form, center_id: Number(e.target.value) })}>
                  <option value={1}>Медцентр 1</option>
                  <option value={2}>Медцентр 2</option>
                </select>
                <input className="input input--compact" type="date" value={form.encounter_date} onChange={(e) => setForm({ ...form, encounter_date: e.target.value })} />
              </div>
              <select className="input input--compact" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: Number(e.target.value) })}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {formatClientName(client)}
                  </option>
                ))}
              </select>
              <div className="form-row">
                <select className="input input--compact" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
                  <option value="cash">Наличные</option>
                  <option value="card">Карта</option>
                  <option value="invoice">Безнал</option>
                </select>
                <input className="input input--compact" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} />
              </div>
              <textarea className="input input--textarea" placeholder="Комментарий" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
              <button className="button" type="submit">
                Сохранить обращение
              </button>
            </form>
          </section>
        </aside>
      </div>
    </section>
  );
}
