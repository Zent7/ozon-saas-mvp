import { Outlet } from "react-router-dom";

const clusterPrimary = [
  "Обновить",
  "Сменить путь к базе",
  "Без справок",
  "Текущий список",
  "Список за сегодня",
  "Список за период",
  "Поиск",
];

const clusterDoctors = [
  "Гинеколог",
  "Стоматолог",
  "Дерматолог",
  "Невролог",
  "Хирург",
  "Отоларинголог",
  "Офтальмолог",
  "Терапевт",
  "Психиатр",
  "Председатель",
];

const clusterActions = [
  "Новый клиент",
  "Изменить запись",
  "Инфекционист",
  "Фтизиатр",
  "Узист",
  "Отчеты/Журналы",
  "Договор",
  "Экспорт в XML",
];

const clusterSettings = [
  "Редактировать Адрес",
  "Выбор принтеров",
  "Добавить бланки",
  "Статус бланка",
  "Состояние ЭЭГ",
  "ЛМК Новые",
  "ЛМК Продление",
  "ЛМК Статистика",
];

export function AccessLayout() {
  return (
    <div className="access-shell">
      <header className="window-topbar">
        <div className="window-topbar__title">ЛМК Шаблон.xls</div>
      </header>

      <div className="ribbon-strip ribbon-strip--photo">
        <div className="ribbon-cluster">
          {clusterPrimary.map((label) => (
            <button key={label} className="ribbon-button" type="button">
              {label}
            </button>
          ))}
        </div>

        <div className="ribbon-cluster">
          {clusterDoctors.map((label) => (
            <button key={label} className="ribbon-button" type="button">
              {label}
            </button>
          ))}
        </div>

        <div className="ribbon-cluster">
          {clusterActions.map((label) => (
            <button key={label} className="ribbon-button" type="button">
              {label}
            </button>
          ))}
        </div>

        <div className="ribbon-cluster ribbon-cluster--settings">
          {clusterSettings.map((label) => (
            <button key={label} className="ribbon-button ribbon-button--accent" type="button">
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="ribbon-footer">Настраиваемые панели инструментов</div>

      <main className="workspace-content workspace-content--full">
        <Outlet />
      </main>

      <footer className="status-strip">
        <span>Готово</span>
        <span>Подключение активно</span>
        <span>Текущий пользователь: admin</span>
      </footer>
    </div>
  );
}
