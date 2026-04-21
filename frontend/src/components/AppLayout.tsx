import { NavLink, Outlet, useLocation } from "react-router-dom";

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
  const pageTitle = titles[location.pathname] ?? "Рабочее место регистратора";

  if (location.pathname === "/" || location.pathname === "/clients") {
    return <Outlet />;
  }

  return (
    <div className="workspace">
      <header className="topbar">
        <div>
          <div className="topbar__eyebrow">Медцентры • единая регистратура</div>
          <div className="topbar__title">{pageTitle}</div>
        </div>
        <div className="topbar__meta">
          <span className="status-pill">Офис 1</span>
          <span className="status-pill status-pill--accent">База подключена</span>
        </div>
      </header>

      <div className="shell">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand__title">Реестр пациентов</span>
            <span className="brand__subtitle">Интерфейс в стиле рабочей базы, а не витрины</span>
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
