import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import {
  api,
  type BlankBatch,
  type BlankBatchPayload,
  type BlankForm,
  type BlankStatsItem,
  type BlankType,
  type Center,
} from "../shared/api";

const emptyBatchForm: BlankBatchPayload = {
  blank_type: "",
  center_id: null,
  series: "",
  number_from: 1,
  number_to: 1,
  number_width: 6,
  received_at: "",
  comment: "",
};

function parseApiError(error: unknown) {
  return error instanceof Error ? error.message : "Не удалось выполнить запрос";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU").format(date);
}

export function BlanksPage() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [blankTypes, setBlankTypes] = useState<BlankType[]>([]);
  const [stats, setStats] = useState<BlankStatsItem[]>([]);
  const [batches, setBatches] = useState<BlankBatch[]>([]);
  const [forms, setForms] = useState<BlankForm[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<number | "">("");
  const [selectedBlankType, setSelectedBlankType] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<number | "">("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [search, setSearch] = useState("");
  const [batchForm, setBatchForm] = useState<BlankBatchPayload>(emptyBatchForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const centerMap = useMemo(() => new Map(centers.map((center) => [center.id, center.name])), [centers]);
  const blankTypeMap = useMemo(() => new Map(blankTypes.map((type) => [type.code, type.name])), [blankTypes]);

  async function loadReferenceData() {
    const [centersData, typesData] = await Promise.all([api.getCenters(), api.getBlankTypes()]);
    setCenters(centersData);
    setBlankTypes(typesData);
    setBatchForm((current) => ({
      ...current,
      blank_type: current.blank_type || typesData[0]?.code || "",
      center_id: current.center_id ?? centersData[0]?.id ?? null,
    }));
  }

  async function loadBlanks() {
    setReloading(true);
    setError("");
    try {
      const centerId = selectedCenterId === "" ? undefined : selectedCenterId;
      const [statsData, batchesData, formsData] = await Promise.all([
        api.getBlankStats(centerId),
        api.getBlankBatches({
          centerId,
          blankType: selectedBlankType || undefined,
        }),
        api.getBlankForms({
          centerId,
          blankType: selectedBlankType || undefined,
          batchId: selectedBatchId === "" ? undefined : selectedBatchId,
          status: selectedStatus || undefined,
          search: search || undefined,
          limit: 300,
        }),
      ]);
      setStats(statsData.items);
      setBatches(batchesData);
      setForms(formsData);
    } catch (loadError) {
      setError(parseApiError(loadError));
    } finally {
      setReloading(false);
    }
  }

  useEffect(() => {
    loadReferenceData().catch((loadError) => setError(parseApiError(loadError)));
  }, []);

  useEffect(() => {
    loadBlanks().catch(() => undefined);
  }, [selectedCenterId, selectedBlankType, selectedBatchId, selectedStatus]);

  async function submitBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.createBlankBatch({
        ...batchForm,
        blank_type: batchForm.blank_type,
        center_id: batchForm.center_id || null,
        received_at: batchForm.received_at || null,
        comment: batchForm.comment || null,
      });
      setNotice("Партия бланков добавлена.");
      setBatchForm((current) => ({
        ...emptyBatchForm,
        blank_type: current.blank_type,
        center_id: current.center_id,
      }));
      await loadBlanks();
    } catch (saveError) {
      setError(parseApiError(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function spoilForm(formId: number) {
    setError("");
    setNotice("");
    try {
      await api.spoilBlankForm(formId);
      setNotice("Бланк помечен как испорченный.");
      await loadBlanks();
    } catch (spoilError) {
      setError(parseApiError(spoilError));
    }
  }

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Бланки</h1>
          <p>Операторский экран для партий, диапазонов и статусов номерных бланков. Здесь можно завести диапазон, отфильтровать номера и пометить свободный бланк как испорченный.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Типов</span>
            <strong>{blankTypes.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Партий</span>
            <strong>{batches.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Номеров</span>
            <strong>{forms.length}</strong>
          </div>
        </div>
      </div>

      {error ? <section className="panel panel--error">{error}</section> : null}
      {notice ? <section className="panel">{notice}</section> : null}

      <div className="stats-grid">
        {stats.map((item) => (
          <section key={item.blank_type} className="stat-card">
            <span>{item.blank_type_name}</span>
            <strong>{item.total}</strong>
            <div className="stat-card__meta">
              <small>Свободно: {item.free}</small>
              <small>Выдано: {item.issued}</small>
              <small>Испорчено: {item.spoiled}</small>
              <small>Отменено: {item.cancelled}</small>
            </div>
          </section>
        ))}
      </div>

      <div className="split-grid">
        <section className="panel">
          <div className="panel__heading">
            <h2>Новая партия</h2>
            <span>Диапазон и реквизиты</span>
          </div>
          <form className="form-grid" onSubmit={submitBatch}>
            <div className="form-row">
              <label>
                Тип бланка
                <select
                  className="input"
                  value={batchForm.blank_type}
                  onChange={(event) => setBatchForm((current) => ({ ...current, blank_type: event.target.value }))}
                  required
                >
                  {blankTypes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Центр
                <select
                  className="input"
                  value={batchForm.center_id ?? ""}
                  onChange={(event) =>
                    setBatchForm((current) => ({
                      ...current,
                      center_id: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                  required
                >
                  <option value="">Выберите центр</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Серия
                <input
                  className="input"
                  value={batchForm.series ?? ""}
                  onChange={(event) => setBatchForm((current) => ({ ...current, series: event.target.value }))}
                />
              </label>
              <label>
                Дата поступления
                <input
                  className="input"
                  type="date"
                  value={batchForm.received_at ?? ""}
                  onChange={(event) => setBatchForm((current) => ({ ...current, received_at: event.target.value }))}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Номер от
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={batchForm.number_from}
                  onChange={(event) => setBatchForm((current) => ({ ...current, number_from: Number(event.target.value) }))}
                  required
                />
              </label>
              <label>
                Номер до
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={batchForm.number_to}
                  onChange={(event) => setBatchForm((current) => ({ ...current, number_to: Number(event.target.value) }))}
                  required
                />
              </label>
            </div>
            <label>
              Комментарий
              <textarea
                className="input input--textarea"
                value={batchForm.comment ?? ""}
                onChange={(event) => setBatchForm((current) => ({ ...current, comment: event.target.value }))}
              />
            </label>
            <div className="toolbar-actions">
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Сохраняю..." : "Добавить партию"}
              </button>
              <button className="button button--secondary" type="button" onClick={() => void loadBlanks()} disabled={reloading}>
                {reloading ? "Обновляю..." : "Обновить"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <h2>Фильтры</h2>
            <span>Партии и номера</span>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <label>
                Центр
                <select className="input" value={selectedCenterId} onChange={(event) => setSelectedCenterId(event.target.value ? Number(event.target.value) : "")}>
                  <option value="">Все центры</option>
                  {centers.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Тип бланка
                <select className="input" value={selectedBlankType} onChange={(event) => setSelectedBlankType(event.target.value)}>
                  <option value="">Все типы</option>
                  {blankTypes.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Партия
                <select className="input" value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value ? Number(event.target.value) : "")}>
                  <option value="">Все партии</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      #{batch.id} {batch.series ? `${batch.series} ` : ""}{batch.number_from}–{batch.number_to}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Статус
                <select className="input" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                  <option value="">Все статусы</option>
                  <option value="free">free</option>
                  <option value="issued">issued</option>
                  <option value="spoiled">spoiled</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
            </div>
            <label>
              Поиск по номеру
              <div className="search-group">
                <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="000123 или серия" />
                <button className="button button--secondary" type="button" onClick={() => void loadBlanks()}>
                  Найти
                </button>
              </div>
            </label>
          </div>
        </section>
      </div>

      <div className="desktop-grid desktop-grid--full">
        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>Партии</h2>
            <span>Диапазоны по центрам и типам</span>
          </div>
          <div className="record-table">
            <div className="record-table__header blanks-batches-header">
              <span>ID</span>
              <span>Тип</span>
              <span>Центр</span>
              <span>Диапазон</span>
              <span>Статусы</span>
              <span>Поступление</span>
            </div>
            <div className="record-table__body">
              {batches.map((batch) => (
                <div key={batch.id} className="record-table__row blanks-batches-row">
                  <span>{batch.id}</span>
                  <span>{blankTypeMap.get(batch.blank_type) ?? batch.blank_type}</span>
                  <span>{centerMap.get(batch.center_id ?? 0) ?? "—"}</span>
                  <span>{batch.series ? `${batch.series} ` : ""}{batch.number_from}–{batch.number_to}</span>
                  <span>free {batch.free_count} / issued {batch.issued_count} / spoiled {batch.spoiled_count}</span>
                  <span>{formatDate(batch.received_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>Бланки</h2>
            <span>Конкретные номера и статусы</span>
          </div>
          <div className="record-table">
            <div className="record-table__header blanks-forms-header">
              <span>Номер</span>
              <span>Тип</span>
              <span>Центр</span>
              <span>Статус</span>
              <span>Пациент</span>
              <span>Документ</span>
              <span>Действие</span>
            </div>
            <div className="record-table__body">
              {forms.map((form) => (
                <div key={form.id} className="record-table__row blanks-forms-row">
                  <span>{form.full_number}</span>
                  <span>{blankTypeMap.get(form.blank_type) ?? form.blank_type}</span>
                  <span>{centerMap.get(form.center_id ?? 0) ?? "—"}</span>
                  <span>{form.status}</span>
                  <span>{form.client_full_name || "—"}</span>
                  <span>{form.document_label || "—"}</span>
                  <span>
                    {form.status === "free" ? (
                      <button className="button button--secondary button--small" type="button" onClick={() => void spoilForm(form.id)}>
                        Испорчен
                      </button>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
