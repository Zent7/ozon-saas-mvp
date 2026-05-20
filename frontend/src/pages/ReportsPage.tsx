import { useEffect, useState } from "react";

import { api, type DailySummaryReport } from "../shared/api";

type PresetKey = "day" | "week" | "month";

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shiftDate(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function buildPresetRange(preset: PresetKey) {
  const today = new Date();
  const dateTo = formatDateInput(today);

  if (preset === "day") {
    return { dateFrom: dateTo, dateTo };
  }

  if (preset === "week") {
    return { dateFrom: formatDateInput(shiftDate(today, -6)), dateTo };
  }

  return { dateFrom: formatDateInput(shiftDate(today, -29)), dateTo };
}

function formatNumber(value: number | string) {
  return new Intl.NumberFormat("ru-RU").format(Number(value || 0));
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function ReportsPage() {
  const [preset, setPreset] = useState<PresetKey>("day");
  const [dateRange, setDateRange] = useState(() => buildPresetRange("day"));
  const [report, setReport] = useState<DailySummaryReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError("");
    api
      .getDailySummaryReport(dateRange.dateFrom, dateRange.dateTo)
      .then(setReport)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [dateRange.dateFrom, dateRange.dateTo]);

  const applyPreset = (nextPreset: PresetKey) => {
    setPreset(nextPreset);
    setDateRange(buildPresetRange(nextPreset));
  };

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Отчёты по дням</h1>
          <p>
            Оперативная сводка по центрам за день или произвольный период: сколько клиентов приняли,
            сколько документов оформили, сколько услуг оказали и какую выручку получили.
          </p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Период</span>
            <strong>{report ? `${report.date_from} — ${report.date_to}` : `${dateRange.dateFrom} — ${dateRange.dateTo}`}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Центров</span>
            <strong>{report?.centers.length ?? 0}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="report-filters">
          <div className="report-preset-group">
            <button
              className={preset === "day" ? "button" : "button button--secondary"}
              type="button"
              onClick={() => applyPreset("day")}
            >
              День
            </button>
            <button
              className={preset === "week" ? "button" : "button button--secondary"}
              type="button"
              onClick={() => applyPreset("week")}
            >
              7 дней
            </button>
            <button
              className={preset === "month" ? "button" : "button button--secondary"}
              type="button"
              onClick={() => applyPreset("month")}
            >
              30 дней
            </button>
          </div>
          <label className="report-filter-field">
            <span>С</span>
            <input
              className="input input--compact"
              type="date"
              value={dateRange.dateFrom}
              onChange={(event) => {
                setPreset("day");
                setDateRange((current) => ({ ...current, dateFrom: event.target.value }));
              }}
            />
          </label>
          <label className="report-filter-field">
            <span>По</span>
            <input
              className="input input--compact"
              type="date"
              value={dateRange.dateTo}
              onChange={(event) => {
                setPreset("day");
                setDateRange((current) => ({ ...current, dateTo: event.target.value }));
              }}
            />
          </label>
        </div>
        <span className="toolbar-note">
          {isLoading ? "Загружаем отчёт..." : "Данные считаются по обращениям, услугам, документам и платежам за выбранный период."}
        </span>
      </div>

      {error ? <div className="panel panel--error">{error}</div> : null}

      <div className="desktop-grid desktop-grid--full">
        <section className="panel">
          <div className="panel__heading">
            <h2>Итоги по сети</h2>
            <span>Суммарные показатели за период</span>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Клиенты</span>
              <strong>{formatNumber(report?.totals.clients_count ?? 0)}</strong>
            </article>
            <article className="stat-card">
              <span>Документы</span>
              <strong>{formatNumber(report?.totals.documents_count ?? 0)}</strong>
            </article>
            <article className="stat-card">
              <span>Услуги</span>
              <strong>{formatNumber(report?.totals.services_count ?? 0)}</strong>
            </article>
            <article className="stat-card">
              <span>Выручка</span>
              <strong>{formatCurrency(report?.totals.revenue ?? "0")}</strong>
            </article>
          </div>
        </section>

        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>Разбивка по центрам</h2>
            <span>Все активные центры в одном отчёте</span>
          </div>
          <div className="record-table record-table--reports">
            <div className="record-table__header record-table__header--reports">
              <span>Центр</span>
              <span>Код</span>
              <span>Клиенты</span>
              <span>Документы</span>
              <span>Услуги</span>
              <span>Выручка</span>
            </div>
            <div className="record-table__body">
              {report?.centers.length ? (
                report.centers.map((center) => (
                  <div className="record-table__row record-table__row--reports" key={center.center_id}>
                    <span>{center.center_name}</span>
                    <span>{center.center_code}</span>
                    <span>{formatNumber(center.clients_count)}</span>
                    <span>{formatNumber(center.documents_count)}</span>
                    <span>{formatNumber(center.services_count)}</span>
                    <span>{formatCurrency(center.revenue)}</span>
                  </div>
                ))
              ) : (
                <div className="record-table__empty">
                  {isLoading ? "Подготавливаем данные..." : "За выбранный период данных по центрам пока нет."}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
