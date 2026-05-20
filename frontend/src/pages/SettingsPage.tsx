import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";

import { api, type StaffRole, type StaffUser, type StaffUserCreatePayload } from "../shared/api";
import { canManageStaff } from "../shared/access";
import { useAuth } from "../shared/auth";

const initialForm: StaffUserCreatePayload = {
  full_name: "",
  login: "",
  password: "",
  email: "",
  role_code: "doctor",
};

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const isChairman = canManageStaff(session?.roleCode);
  const isAdmin = session?.roleCode === "admin";
  const [form, setForm] = useState<StaffUserCreatePayload>(initialForm);
  const [formError, setFormError] = useState("");

  const rolesQuery = useQuery({
    queryKey: ["staff-roles"],
    queryFn: api.getStaffRoles,
    enabled: isChairman,
  });

  const staffQuery = useQuery({
    queryKey: ["staff-users"],
    queryFn: api.getStaffUsers,
    enabled: isChairman,
  });

  const createStaffMutation = useMutation({
    mutationFn: api.createStaffUser,
    onSuccess: async () => {
      setForm(initialForm);
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Не удалось создать учетную запись");
    },
  });

  const roles = rolesQuery.data ?? [];
  const staffUsers = staffQuery.data ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.full_name.trim() || !form.login.trim() || !form.password.trim()) {
      setFormError("Заполните ФИО, логин и пароль.");
      return;
    }
    await createStaffMutation.mutateAsync(form);
  }

  return (
    <section className="page page--desktop">
      <div className="page-header">
        <div>
          <h1>Параметры системы</h1>
          <p>
            Здесь собраны роли сотрудников, точка входа для аутентификации и управление учетными
            записями. Председатель создает новых сотрудников и назначает роли, а админ работает в
            ограниченном режиме без управления доступами.
          </p>
        </div>
        <div className="summary-strip">
          <div className="summary-strip__item">
            <span>Текущий вход</span>
            <strong>{session?.userName ?? "—"}</strong>
          </div>
          <div className="summary-strip__item">
            <span>Роль</span>
            <strong>{session?.roleName ?? "—"}</strong>
          </div>
        </div>
      </div>

      <div className="desktop-grid desktop-grid--full">
        <section className="panel">
          <div className="panel__heading">
            <h2>Контур сотрудников</h2>
            <span>Авторизация и доступы</span>
          </div>
          <div className="info-grid">
            <div className="info-cell">
              <span>Кнопка входа</span>
              <strong>Сотрудники</strong>
            </div>
            <div className="info-cell">
              <span>Главная роль</span>
              <strong>Председатель</strong>
            </div>
            <div className="info-cell">
              <span>Доступные роли</span>
              <strong>Врач, Админ, Оператор</strong>
            </div>
            <div className="info-cell">
              <span>Назначение ролей</span>
              <strong>Только председатель управляет доступами</strong>
            </div>
            <div className="info-cell">
              <span>Тестовый председатель</span>
              <strong>chairman / chairman123</strong>
            </div>
            <div className="info-cell">
              <span>Ограничение админа</span>
              <strong>Без отчетов и без управления ролями</strong>
            </div>
          </div>
        </section>

        {isChairman ? (
          <>
            <section className="panel">
              <div className="panel__heading">
                <h2>Создать сотрудника</h2>
                <span>Доступно только председателю</span>
              </div>

              <form className="staff-form" onSubmit={handleSubmit}>
                <label className="login-field">
                  <span>ФИО</span>
                  <input
                    className="input"
                    value={form.full_name}
                    onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                  />
                </label>

                <label className="login-field">
                  <span>Логин</span>
                  <input
                    className="input"
                    value={form.login}
                    onChange={(event) => setForm((current) => ({ ...current, login: event.target.value }))}
                  />
                </label>

                <label className="login-field">
                  <span>Пароль</span>
                  <input
                    className="input"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>

                <label className="login-field">
                  <span>Email</span>
                  <input
                    className="input"
                    value={form.email ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>

                <label className="login-field">
                  <span>Роль</span>
                  <select
                    className="input"
                    value={form.role_code}
                    onChange={(event) => setForm((current) => ({ ...current, role_code: event.target.value }))}
                  >
                    {roles.map((role: StaffRole) => (
                      <option key={role.code} value={role.code}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>

                {formError ? <div className="login-error">{formError}</div> : null}

                <button className="button staff-form__submit" disabled={createStaffMutation.isPending} type="submit">
                  {createStaffMutation.isPending ? "Создаем..." : "Создать учетную запись"}
                </button>
              </form>
            </section>

            <section className="panel panel--table">
              <div className="panel__heading">
                <h2>Сотрудники</h2>
                <span>{staffUsers.length} учетных записей</span>
              </div>

              {staffQuery.isLoading ? <div className="empty-card">Загружаем список сотрудников...</div> : null}

              {staffQuery.isError ? <div className="empty-card">Не удалось загрузить список сотрудников.</div> : null}

              {!staffQuery.isLoading && !staffQuery.isError ? (
                <div className="table">
                  {staffUsers.map((user: StaffUser) => (
                    <div className="table-row staff-row" key={user.id}>
                      <strong>{user.full_name}</strong>
                      <span>{user.login}</span>
                      <span>{user.role.name}</span>
                      <span>{user.email || "Без email"}</span>
                      <span>{user.is_active ? "Активен" : "Отключен"}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <section className="panel">
            <div className="panel__heading">
              <h2>Управление сотрудниками</h2>
              <span>Ограничение по роли</span>
            </div>
            <div className="empty-card">
              {isAdmin ? (
                <>
                  Вы вошли как <strong>{session?.roleName ?? "админ"}</strong>. Админ видит контур
                  сотрудников, но не создает учетные записи, не назначает роли и не получает доступ к
                  отчетам. Управление доступами остается за председателем.
                </>
              ) : (
                <>
                  Раздел создания учетных записей доступен только председателю. Вы вошли как{" "}
                  <strong>{session?.roleName ?? "сотрудник"}</strong>.
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
