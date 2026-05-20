import { useEffect, useMemo, useState } from "react";

import { api, type AuditLog, type DeletedClient, type DeletedEncounter } from "../shared/api";

type AuditTab = "clients" | "encounters" | "audit";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    create: "создание",
    update: "изменение",
    delete: "удаление",
    restore: "восстановление",
  };

  return labels[action] ?? action;
}

function formatEntity(entityType: string) {
  const labels: Record<string, string> = {
    client: "Клиент",
    encounter: "Обращение",
    doctor_exam: "Осмотр",
  };

  return labels[entityType] ?? entityType;
}

function summarizePayload(payload?: Record<string, unknown> | null) {
  if (!payload) {
    return "—";
  }

  const pairs = Object.entries(payload)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return pairs.length > 0 ? pairs.join(" • ") : "—";
}

export function DeletedAuditPage() {
  const [tab, setTab] = useState<AuditTab>("clients");
  const [deletedClients, setDeletedClients] = useState<DeletedClient[]>([]);
  const [deletedEncounters, setDeletedEncounters] = useState<DeletedEncounter[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [auditFilter, setAuditFilter] = useState<"" | "delete" | "restore">("");

  const deleteCount = useMemo(
    () => auditLogs.filter((item) => item.action === "delete").length,
    [auditLogs],
  );

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [clients, encounters, logs] = await Promise.all([
        api.getDeletedClients(clientSearch, 200),
        api.getDeletedEncounters(undefined, 200),
        api.getAuditLogs({ action: auditFilter || undefined, limit: 200 }),
      ]);
      setDeletedClients(clients);
      setDeletedEncounters(encounters);
      setAuditLogs(logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить удалённые записи и аудит");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [clientSearch, auditFilter]);

  async function handleRestoreClient(client: DeletedClient) {
    setBusyKey(`client-${client.id}`);
    setError("");
    setNotice("");
    try {
      await api.restoreClient(client.id);
      setNotice(`Клиент ${client.full_name} восстановлен.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось восстановить клиента");
    } finally {
      setBusyKey("");
    }
  }

  async function handleRestoreEncounter(encounter: DeletedEncounter) {
    setBusyKey(`encounter-${encounter.id}`);
    setError("");
    setNotice("");
    try {
      await api.restoreEncounter(encounter.id);
      setNotice(`Обращение №${encounter.id} восстановлено.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось восстановить обращение");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Удалённые и аудит</h1>
          <p>Просмотр мягко удалённых клиентов и обращений, восстановление из корзины и журнал действий сотрудников.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Удалённых клиентов</span>
            <strong>{deletedClients.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Удалённых обращений</span>
            <strong>{deletedEncounters.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Удалений в журнале</span>
            <strong>{deleteCount}</strong>
          </div>
        </div>
      </div>

      {error ? <div className="panel panel--error">{error}</div> : null}
      {notice ? <div className="panel restore-notice">{notice}</div> : null}

      <div className="toolbar">
        <div className="toolbar-actions">
          <button
            className={tab === "clients" ? "button" : "button button--secondary"}
            type="button"
            onClick={() => setTab("clients")}
          >
            Удалённые клиенты
          </button>
          <button
            className={tab === "encounters" ? "button" : "button button--secondary"}
            type="button"
            onClick={() => setTab("encounters")}
          >
            Удалённые обращения
          </button>
          <button
            className={tab === "audit" ? "button" : "button button--secondary"}
            type="button"
            onClick={() => setTab("audit")}
          >
            Audit log
          </button>
        </div>
        <div className="search-group">
          {tab === "clients" ? (
            <input
              className="input input--compact"
              value={clientSearch}
              onChange={(event) => setClientSearch(event.target.value)}
              placeholder="Поиск по ФИО, номеру, телефону"
            />
          ) : null}
          {tab === "audit" ? (
            <select
              className="input input--compact"
              value={auditFilter}
              onChange={(event) => setAuditFilter(event.target.value as "" | "delete" | "restore")}
            >
              <option value="">Все действия</option>
              <option value="delete">Только удаления</option>
              <option value="restore">Только восстановления</option>
            </select>
          ) : null}
          <span className="toolbar-note">{loading ? "Обновляю данные..." : "История обновляется по API"}</span>
        </div>
      </div>

      <div className="desktop-grid desktop-grid--full">
        {tab === "clients" ? (
          <section className="panel panel--table">
            <div className="panel__heading">
              <h2>Корзина клиентов</h2>
              <span>Кто удалён, того можно восстановить одной кнопкой</span>
            </div>
            <div className="record-table">
              <div className="record-table__header restore-table-header">
                <span>ID</span>
                <span>Пациент</span>
                <span>Дата рождения</span>
                <span>Удалён</span>
                <span>Действие</span>
              </div>
              <div className="record-table__body">
                {deletedClients.length === 0 ? (
                  <div className="record-table__empty">Удалённых клиентов нет.</div>
                ) : (
                  deletedClients.map((client) => (
                    <div key={client.id} className="record-table__row restore-table-row">
                      <span>{client.id}</span>
                      <span>{client.full_name} · № {client.patient_number}</span>
                      <span>{formatDateTime(client.birth_date)}</span>
                      <span>{formatDateTime(client.deleted_at)}</span>
                      <span>
                        <button
                          className="button button--secondary button--small"
                          type="button"
                          disabled={busyKey === `client-${client.id}`}
                          onClick={() => void handleRestoreClient(client)}
                        >
                          {busyKey === `client-${client.id}` ? "Восстанавливаю..." : "Восстановить"}
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "encounters" ? (
          <section className="panel panel--table">
            <div className="panel__heading">
              <h2>Корзина обращений</h2>
              <span>Восстановление визитов с сохранением их ID и истории</span>
            </div>
            <div className="record-table">
              <div className="record-table__header restore-table-header">
                <span>ID</span>
                <span>Клиент ID</span>
                <span>Дата обращения</span>
                <span>Удалён</span>
                <span>Действие</span>
              </div>
              <div className="record-table__body">
                {deletedEncounters.length === 0 ? (
                  <div className="record-table__empty">Удалённых обращений нет.</div>
                ) : (
                  deletedEncounters.map((encounter) => (
                    <div key={encounter.id} className="record-table__row restore-table-row">
                      <span>{encounter.id}</span>
                      <span>{encounter.client_id}</span>
                      <span>{formatDateTime(encounter.encounter_date)}</span>
                      <span>{formatDateTime(encounter.deleted_at)}</span>
                      <span>
                        <button
                          className="button button--secondary button--small"
                          type="button"
                          disabled={busyKey === `encounter-${encounter.id}`}
                          onClick={() => void handleRestoreEncounter(encounter)}
                        >
                          {busyKey === `encounter-${encounter.id}` ? "Восстанавливаю..." : "Восстановить"}
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        {tab === "audit" ? (
          <section className="panel panel--table">
            <div className="panel__heading">
              <h2>Журнал аудита</h2>
              <span>Кто, когда и что сделал с карточками и обращениями</span>
            </div>
            <div className="record-table">
              <div className="record-table__header audit-table-header">
                <span>Когда</span>
                <span>Пользователь</span>
                <span>Сущность</span>
                <span>Действие</span>
                <span>Детали</span>
              </div>
              <div className="record-table__body">
                {auditLogs.length === 0 ? (
                  <div className="record-table__empty">Записей аудита пока нет.</div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="record-table__row audit-table-row">
                      <span>{formatDateTime(log.created_at)}</span>
                      <span>{log.user_name || `ID ${log.user_id ?? "—"}`}</span>
                      <span>{formatEntity(log.entity_type)} #{log.entity_id}</span>
                      <span>{formatAction(log.action)}</span>
                      <span>{summarizePayload(log.payload_json)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
