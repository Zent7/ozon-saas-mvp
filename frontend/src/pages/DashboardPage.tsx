import { useEffect, useState } from "react";

import { api, type DashboardStats } from "../shared/api";

const quickStats = [
  { label: "Регистратура", value: "Онлайн" },
  { label: "Рабочая смена", value: "Дневная" },
  { label: "Источник данных", value: "API" },
  { label: "Режим", value: "Картотека" },
];

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    api
      .getDashboardStats()
      .then(setStats)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Сводка по центрам</h1>
          <p>Стартовый экран сделан как оперативная сводка: ключевые счётчики, состояние рабочего места и быстрые журналы.</p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Подключение</span>
            <strong>Активно</strong>
          </div>
          <div className="summary-strip__item">
            <span>Оператор</span>
            <strong>admin</strong>
          </div>
        </div>
      </div>

      {error ? <div className="panel panel--error">{error}</div> : null}

      <div className="desktop-grid desktop-grid--full">
        <section className="panel">
          <div className="panel__heading">
            <h2>Контрольные показатели</h2>
            <span>Текущие данные из backend</span>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Клиенты</span>
              <strong>{stats?.clients_count ?? "..."}</strong>
            </article>
            <article className="stat-card">
              <span>Обращения</span>
              <strong>{stats?.encounters_count ?? "..."}</strong>
            </article>
            <article className="stat-card">
              <span>Услуги</span>
              <strong>{stats?.services_count ?? "..."}</strong>
            </article>
            <article className="stat-card">
              <span>Повторы к сроку</span>
              <strong>{stats?.recalls_due_count ?? "..."}</strong>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <h2>Состояние рабочего места</h2>
            <span>Служебная информация</span>
          </div>
          <div className="info-grid">
            {quickStats.map((item) => (
              <div className="info-cell" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel__heading">
            <h2>Быстрые действия</h2>
            <span>Частые сценарии</span>
          </div>
          <div className="action-grid">
            <button className="button" type="button">Новая карточка</button>
            <button className="button button--secondary" type="button">Новое обращение</button>
            <button className="button button--secondary" type="button">Печать документа</button>
            <button className="button button--secondary" type="button">Журнал повторов</button>
          </div>
        </section>
      </div>
    </section>
  );
}
