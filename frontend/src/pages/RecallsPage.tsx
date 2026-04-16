import { useEffect, useMemo, useState } from "react";

import { api, type Recall } from "../shared/api";

export function RecallsPage() {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [selectedRecallId, setSelectedRecallId] = useState<number | null>(null);

  useEffect(() => {
    api
      .getRecalls()
      .then((data) => {
        setRecalls(data);
        setSelectedRecallId(data[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  const selectedRecall = useMemo(
    () => recalls.find((recall) => recall.id === selectedRecallId) ?? null,
    [recalls, selectedRecallId],
  );

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>План повторов</h1>
          <p>Отдельный журнал контроля повторных визитов с реестром задач и боковой карточкой выбранного напоминания.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Всего повторов</span>
            <strong>{recalls.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Активная запись</span>
            <strong>{selectedRecall ? selectedRecall.id : "—"}</strong>
          </div>
        </div>
      </div>

      <div className="desktop-grid">
        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>Журнал повторов</h2>
            <span>Контроль по срокам</span>
          </div>
          <div className="record-table">
            <div className="record-table__header record-table__header--recalls">
              <span>ID</span>
              <span>Клиент</span>
              <span>Дата</span>
              <span>Статус</span>
              <span>Комментарий</span>
            </div>
            <div className="record-table__body">
              {recalls.map((recall) => {
                const isActive = recall.id === selectedRecallId;

                return (
                  <button
                    key={recall.id}
                    className={isActive ? "record-table__row record-table__row--recalls record-table__row--active" : "record-table__row record-table__row--recalls"}
                    type="button"
                    onClick={() => setSelectedRecallId(recall.id)}
                  >
                    <span>{recall.id}</span>
                    <span>{recall.client_id}</span>
                    <span>{recall.planned_date}</span>
                    <span>{recall.status}</span>
                    <span>{recall.comment || "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="desktop-sidebar">
          <section className="panel">
            <div className="panel__heading">
              <h2>Карточка повтора</h2>
              <span>{selectedRecall ? `ID ${selectedRecall.id}` : "Нет выбора"}</span>
            </div>
            {selectedRecall ? (
              <div className="details-card">
                <div className="details-card__name">Пациент #{selectedRecall.client_id}</div>
                <div className="details-card__grid">
                  <div>
                    <span>Дата повтора</span>
                    <strong>{selectedRecall.planned_date}</strong>
                  </div>
                  <div>
                    <span>Статус</span>
                    <strong>{selectedRecall.status}</strong>
                  </div>
                  <div>
                    <span>Обращение ID</span>
                    <strong>{selectedRecall.encounter_id ?? "—"}</strong>
                  </div>
                  <div>
                    <span>Услуга ID</span>
                    <strong>{selectedRecall.service_id ?? "—"}</strong>
                  </div>
                </div>
                <div className="details-card__notes">
                  <span>Комментарий</span>
                  <p>{selectedRecall.comment || "Комментарий отсутствует."}</p>
                </div>
              </div>
            ) : (
              <div className="empty-card">Выберите запись в журнале, чтобы увидеть детали повтора.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel__heading">
              <h2>Операции</h2>
              <span>Действия по записи</span>
            </div>
            <div className="action-grid">
              <button className="button" type="button">Отметить выполненным</button>
              <button className="button button--secondary" type="button">Перенести дату</button>
              <button className="button button--secondary" type="button">Открыть карточку клиента</button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
