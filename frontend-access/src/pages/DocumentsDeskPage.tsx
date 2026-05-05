import { useEffect, useMemo, useState } from "react";

import { api, type DocumentTemplate } from "../shared/api";

export function DocumentsDeskPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(true);

  useEffect(() => {
    api.getTemplates().then((data) => {
      setTemplates(data);
      setSelectedId(data[0]?.id ?? null);
    }).catch(() => undefined);
  }, []);

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [templates, selectedId],
  );

  return (
    <section className="desk-page">
      <div className="desk-toolbar">
        <div className="desk-toolbar__group">
          <button className="toolbar-button" type="button" onClick={() => setShowTemplateDialog(true)}>Открыть</button>
          <button className="toolbar-button" type="button">Печать</button>
          <button className="toolbar-button" type="button">Экспорт</button>
          <button className="toolbar-button" type="button">Таблица</button>
          <button className="toolbar-button" type="button">Поля</button>
        </div>
        <div className="desk-toolbar__group">
          <input className="desk-input desk-input--search" placeholder="Поиск шаблона" />
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
            <span>Тип шаблона</span>
            <span>=</span>
            <span>{selected?.template_type ?? ""}</span>
          </div>
        </div>
      </div>

      <div className="desk-grid desk-grid--single">
        <section className="desk-panel desk-panel--main">
          <div className="desk-panel__title">Шаблоны документов</div>
          <div className="dense-table">
            <div className="dense-table__head dense-table__head--documents">
              <span>Код</span>
              <span>Наименование</span>
              <span>Тип</span>
              <span>Файл</span>
              <span>Статус</span>
            </div>
            <div className="dense-table__body">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={template.id === selectedId ? "dense-table__row dense-table__row--documents dense-table__row--active" : "dense-table__row dense-table__row--documents"}
                  onClick={() => setSelectedId(template.id)}
                >
                  <span>{template.code}</span>
                  <span>{template.name}</span>
                  <span>{template.template_type}</span>
                  <span>{template.file_name}</span>
                  <span>{template.is_active ? "Активен" : "Отключен"}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {showTemplateDialog && selected ? (
        <div className="template-dialog-wrap">
          <div className="template-dialog">
            <div className="template-dialog__titlebar">
              <span>Изменение записи "Шаблоны документов" (ID={selected.id})</span>
              <button type="button" onClick={() => setShowTemplateDialog(false)}>×</button>
            </div>
            <div className="service-tabs">
              <span className="bottom-tabs__item bottom-tabs__item--active">Основное</span>
              <span className="bottom-tabs__item">Печать</span>
              <span className="bottom-tabs__item">XML</span>
            </div>
            <div className="template-dialog__body">
              <div className="template-form">
                <label><span>Код</span><input className="desk-input" value={selected.code} readOnly /></label>
                <label><span>Наименование</span><input className="desk-input" value={selected.name} readOnly /></label>
                <label><span>Тип</span><input className="desk-input" value={selected.template_type} readOnly /></label>
                <label><span>Файл</span><input className="desk-input" value={selected.file_name} readOnly /></label>
                <label><span>Статус</span><input className="desk-input" value={selected.is_active ? "Активен" : "Отключен"} readOnly /></label>
              </div>
              <div className="template-form template-form--wide">
                <label><span>Описание</span><textarea className="desk-input template-note" value={selected.description || "Описание шаблона не заполнено"} readOnly /></label>
                <label><span>Путь печатной формы</span><input className="desk-input" value={selected.file_name} readOnly /></label>
                <label><span>Комментарий администратора</span><textarea className="desk-input desk-input--area" value="Шаблон доступен для формирования." readOnly /></label>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
