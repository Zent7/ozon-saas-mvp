import { useEffect, useMemo, useState } from "react";

import { api, type DocumentTemplate } from "../shared/api";

export function DocumentsPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  useEffect(() => {
    api
      .getTemplates()
      .then((data) => {
        setTemplates(data);
        setSelectedTemplateId(data[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Реестр документов</h1>
          <p>Раздел оформлен как справочник шаблонов: перечень, выбранная запись и блок служебной информации справа.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Шаблонов</span>
            <strong>{templates.length}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Активный</span>
            <strong>{selectedTemplate ? selectedTemplate.id : "—"}</strong>
          </div>
        </div>
      </div>

      <div className="desktop-grid">
        <section className="panel panel--table">
          <div className="panel__heading">
            <h2>Шаблоны и формы</h2>
            <span>Реестр печатных документов</span>
          </div>
          <div className="record-table">
            <div className="record-table__header record-table__header--documents">
              <span>Код</span>
              <span>Наименование</span>
              <span>Тип</span>
              <span>Файл</span>
              <span>Статус</span>
            </div>
            <div className="record-table__body">
              {templates.map((template) => {
                const isActive = template.id === selectedTemplateId;

                return (
                  <button
                    key={template.id}
                    className={isActive ? "record-table__row record-table__row--documents record-table__row--active" : "record-table__row record-table__row--documents"}
                    type="button"
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <span>{template.code}</span>
                    <span>{template.name}</span>
                    <span>{template.template_type}</span>
                    <span>{template.file_name}</span>
                    <span>{template.is_active ? "Активен" : "Отключен"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="desktop-sidebar">
          <section className="panel">
            <div className="panel__heading">
              <h2>Карточка шаблона</h2>
              <span>{selectedTemplate ? selectedTemplate.code : "Нет выбора"}</span>
            </div>
            {selectedTemplate ? (
              <div className="details-card">
                <div className="details-card__name">{selectedTemplate.name}</div>
                <div className="details-card__grid">
                  <div>
                    <span>Код</span>
                    <strong>{selectedTemplate.code}</strong>
                  </div>
                  <div>
                    <span>Тип</span>
                    <strong>{selectedTemplate.template_type}</strong>
                  </div>
                  <div>
                    <span>Файл</span>
                    <strong>{selectedTemplate.file_name}</strong>
                  </div>
                  <div>
                    <span>Состояние</span>
                    <strong>{selectedTemplate.is_active ? "Активен" : "Отключен"}</strong>
                  </div>
                </div>
                <div className="details-card__notes">
                  <span>Описание</span>
                  <p>{selectedTemplate.description || "Описание для шаблона пока не заполнено."}</p>
                </div>
              </div>
            ) : (
              <div className="empty-card">Выберите шаблон слева, чтобы открыть его карточку.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel__heading">
              <h2>Операции</h2>
              <span>Печать и выгрузка</span>
            </div>
            <div className="action-grid">
              <button className="button" type="button">Открыть шаблон</button>
              <button className="button button--secondary" type="button">Сформировать документ</button>
              <button className="button button--secondary" type="button">Выгрузить XML</button>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
