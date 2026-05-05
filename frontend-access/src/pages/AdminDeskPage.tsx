const blocks = [
  ["Пользователи", "1 системный администратор"],
  ["Роли", "Администратор, регистратор"],
  ["Центры", "2 центра"],
  ["База", "Подключение к API активно"],
  ["Печать", "2 профиля принтеров"],
  ["Справочники", "Клиенты, услуги, документы"],
];

export function AdminDeskPage() {
  return (
    <section className="desk-page">
      <div className="desk-toolbar">
        <div className="desk-toolbar__group">
          <button className="toolbar-button" type="button">Пользователи</button>
          <button className="toolbar-button" type="button">Роли</button>
          <button className="toolbar-button" type="button">Подключения</button>
          <button className="toolbar-button" type="button">Резервная копия</button>
        </div>
      </div>

      <div className="desk-grid desk-grid--single">
        <section className="desk-panel">
          <div className="desk-panel__title">Служебные параметры системы</div>
          <div className="admin-form">
            {blocks.map(([title, value]) => (
              <label className="admin-form__row" key={title}>
                <span>{title}</span>
                <input className="desk-input" value={value} readOnly />
              </label>
            ))}
          </div>
        </section>

        <section className="desk-panel">
          <div className="desk-panel__title">Журнал обслуживания</div>
          <div className="subtable-head">
            <span>Дата</span>
            <span>Операция</span>
            <span>Пользователь</span>
            <span>Результат</span>
            <span>Комментарий</span>
            <span>Источник</span>
            <span>Версия</span>
            <span>Статус</span>
          </div>
        </section>
      </div>
    </section>
  );
}
