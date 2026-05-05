import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../shared/auth";

const items = [
  { to: "/", label: "Главная" },
  { to: "/clients", label: "Картотека" },
  { to: "/encounters", label: "Обращения" },
  { to: "/documents", label: "Документы" },
  { to: "/recalls", label: "Повторы" },
  { to: "/settings", label: "Настройки" },
];

const titles: Record<string, string> = {
  "/": "Сводка по центрам",
  "/clients": "Картотека пациентов",
  "/encounters": "Журнал обращений",
  "/documents": "Реестр документов",
  "/recalls": "План повторов",
  "/settings": "Параметры системы",
};

export function AppLayout() {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const pageTitle = titles[location.pathname] ?? "Рабочее место сотрудника";

  return (
    <div className="workspace">
      <header className="topbar">
        <div>
          <div className="topbar__eyebrow">Медцентры • единая регистратура</div>
          <div className="topbar__title">{pageTitle}</div>
        </div>
        <div className="topbar__meta">
          <span className="status-pill">{session?.userName ?? "Сотрудник"}</span>
          <span className="status-pill status-pill--accent">{session?.roleName ?? "Без роли"}</span>
          <button className="button button--secondary button--small" onClick={signOut} type="button">
            Выйти
          </button>
        </div>
      </header>

      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand__title">Реестр пациентов</span>
            <span className="brand__subtitle">Навигация и рабочие разделы для сотрудников медцентра</span>
          </div>
          <nav className="nav">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "nav__link nav__link--active" : "nav__link")}
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
