import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

import { api, buildTemplateFileUrl, type DocumentTemplate } from "../shared/api";

export function DocumentsPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [statusText, setStatusText] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  async function loadTemplates() {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
      setSelectedTemplateId((current) => (current && data.some((template) => template.id === current) ? current : data[0]?.id ?? null));
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Не удалось загрузить шаблоны");
    }
  }

  async function handleRefreshTemplates() {
    setIsRefreshing(true);
    setStatusText("");
    try {
      const data = await api.refreshTemplates();
      setTemplates(data);
      setSelectedTemplateId((current) => (current && data.some((template) => template.id === current) ? current : data[0]?.id ?? null));
      setStatusText("Список шаблонов обновлен из папки файлов.");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Не удалось обновить шаблоны");
    } finally {
      setIsRefreshing(false);
    }
  }

  function handleOpenTemplate() {
    if (!selectedTemplate) return;
    window.open(buildTemplateFileUrl(selectedTemplate.id), "_blank", "noopener,noreferrer");
  }

  async function handleReplaceTemplate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedTemplate) return;
    setIsReplacing(true);
    setStatusText("");
    try {
      const updated = await api.replaceTemplate(selectedTemplate.id, file);
      setTemplates((current) => current.map((template) => (template.id === updated.id ? updated : template)));
      setStatusText(`Шаблон "${updated.name}" заменен. Авто-поля останутся рабочими, если желтые ячейки подписаны как "терапевт авто", "фио авто" и т.п.`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Не удалось заменить шаблон");
    } finally {
      setIsReplacing(false);
      event.target.value = "";
    }
  }

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Шаблоны документов</h1>
          <p>Здесь лежат все печатные шаблоны. Желтые ячейки с подписью “авто” заполняются системой и могут переехать вместе с новой версией файла.</p>
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
            <span>Файлы из папки шаблонов</span>
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
                  <span>Автозаполнение</span>
                  <p>
                    В файле можно выделить ячейку желтым и написать в ней понятную метку: “фио авто”, “дата авто”, “терапевт авто”, “офтальмолог авто”,
                    “номер бланка авто”. При генерации система найдет такую ячейку по тексту, даже если строки сдвинули.
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-card">Выберите шаблон слева, чтобы открыть его карточку.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel__heading">
              <h2>Операции</h2>
              <span>Просмотр и замена</span>
            </div>
            <div className="action-grid">
              <button className="button" disabled={!selectedTemplate} type="button" onClick={handleOpenTemplate}>Посмотреть</button>
              <button className="button button--secondary" disabled={isRefreshing} type="button" onClick={handleRefreshTemplates}>
                {isRefreshing ? "Перечитываем..." : "Перечитать папку"}
              </button>
              <button className="button button--secondary" disabled={!selectedTemplate || isReplacing} type="button" onClick={() => fileInputRef.current?.click()}>
                {isReplacing ? "Обновляем..." : "Обновить шаблон"}
              </button>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept=".docx,.xml,.xls"
                onChange={handleReplaceTemplate}
              />
            </div>
            {statusText ? <div className="operation-status">{statusText}</div> : null}
          </section>
        </aside>
      </div>
    </section>
  );
}
