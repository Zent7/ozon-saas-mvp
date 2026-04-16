const directories = [
  { name: "Пользователи", value: "1 системный администратор" },
  { name: "Роли", value: "Администратор, регистратор" },
  { name: "Центры", value: "2 медицинских центра" },
  { name: "База данных", value: "SQLite / переход на PostgreSQL" },
];

export function SettingsPage() {
  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Параметры системы</h1>
          <p>Раздел собран как служебная форма старой админ-панели: справочники, доступы и технические параметры на одном экране.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Логин</span>
            <strong>admin</strong>
          </div>
          <div className="summary-strip__item">
            <span>Среда</span>
            <strong>MVP</strong>
          </div>
        </div>
      </div>

      <div className="desktop-grid">
        <section className="panel">
          <div className="panel__heading">
            <h2>Справочники</h2>
            <span>Базовая конфигурация</span>
          </div>
          <div className="info-grid">
            {directories.map((item) => (
              <div className="info-cell" key={item.name}>
                <span>{item.name}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <h2>Доступ для запуска</h2>
            <span>Технические параметры</span>
          </div>
          <div className="details-card">
            <div className="details-card__grid">
              <div>
                <span>Тестовый логин</span>
                <strong>admin</strong>
              </div>
              <div>
                <span>Тестовый пароль</span>
                <strong>admin123</strong>
              </div>
              <div>
                <span>Backend</span>
                <strong>FastAPI</strong>
              </div>
              <div>
                <span>Frontend</span>
                <strong>React + TypeScript</strong>
              </div>
            </div>
            <div className="details-card__notes">
              <span>Примечание</span>
              <p>Сейчас используется быстрый старт на SQLite, но структура приложения уже готовится под более строгую серверную схему.</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <h2>Административные действия</h2>
            <span>Служебные операции</span>
          </div>
          <div className="action-grid">
            <button className="button" type="button">Открыть пользователей</button>
            <button className="button button--secondary" type="button">Настроить роли</button>
            <button className="button button--secondary" type="button">Проверить соединение</button>
          </div>
        </section>
      </div>
    </section>
  );
}
