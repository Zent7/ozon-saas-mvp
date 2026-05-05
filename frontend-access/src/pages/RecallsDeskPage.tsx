import { useEffect, useMemo, useState } from "react";

import { api, type Recall } from "../shared/api";

export function RecallsDeskPage() {
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    api.getRecalls().then((data) => {
      setRecalls(data);
      setSelectedId(data[0]?.id ?? null);
    }).catch(() => undefined);
  }, []);

  const selected = useMemo(
    () => recalls.find((recall) => recall.id === selectedId) ?? null,
    [recalls, selectedId],
  );

  return (
    <section className="desk-page">
      <div className="desk-toolbar">
        <div className="desk-toolbar__group">
          <button className="toolbar-button" type="button">Добавить</button>
          <button className="toolbar-button" type="button">Изменить</button>
          <button className="toolbar-button" type="button">Выполнено</button>
          <button className="toolbar-button" type="button">Печать</button>
        </div>
        <div className="desk-toolbar__group">
          <input className="desk-input desk-input--search" placeholder="Поиск повтора" />
        </div>
      </div>

      <div className="desk-grid">
        <section className="desk-panel desk-panel--main">
          <div className="desk-panel__title">Контроль повторных визитов</div>
          <div className="dense-table">
            <div className="dense-table__head dense-table__head--recalls">
              <span>ID</span>
              <span>Клиент</span>
              <span>Дата</span>
              <span>Статус</span>
              <span>Комментарий</span>
            </div>
            <div className="dense-table__body">
              {recalls.map((recall) => (
                <button
                  key={recall.id}
                  type="button"
                  className={recall.id === selectedId ? "dense-table__row dense-table__row--recalls dense-table__row--active" : "dense-table__row dense-table__row--recalls"}
                  onClick={() => setSelectedId(recall.id)}
                >
                  <span>{recall.id}</span>
                  <span>{recall.client_id}</span>
                  <span>{recall.planned_date}</span>
                  <span>{recall.status}</span>
                  <span>{recall.comment || "—"}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="desk-sidebar">
          <section className="desk-panel">
            <div className="desk-panel__title">Карточка повтора</div>
            {selected ? (
              <div className="form-sheet">
                <div className="form-sheet__name">Пациент #{selected.client_id}</div>
                <div className="form-sheet__grid">
                  <div><span>Дата</span><strong>{selected.planned_date}</strong></div>
                  <div><span>Статус</span><strong>{selected.status}</strong></div>
                  <div><span>Обращение</span><strong>{selected.encounter_id ?? "—"}</strong></div>
                  <div><span>Услуга</span><strong>{selected.service_id ?? "—"}</strong></div>
                </div>
                <div className="form-sheet__note">
                  <span>Комментарий</span>
                  <p>{selected.comment || "Нет комментария"}</p>
                </div>
              </div>
            ) : (
              <div className="desk-empty">Нет выбранного повтора.</div>
            )}
          </section>

          <section className="desk-panel">
            <div className="desk-panel__title">Журнал действий</div>
            <div className="quick-actions">
              <button className="toolbar-button" type="button">Открыть пациента</button>
              <button className="toolbar-button" type="button">Перенести дату</button>
              <button className="toolbar-button toolbar-button--primary" type="button">Закрыть напоминание</button>
            </div>
          </section>
        </aside>
      </div>

      <div className="bottom-tabs">
        <span className="bottom-tabs__item bottom-tabs__item--active">История</span>
        <span className="bottom-tabs__item">Примечания</span>
        <span className="bottom-tabs__item">Связанные обращения</span>
      </div>
    </section>
  );
}
