import { FormEvent, useState } from "react";

import { api } from "../shared/api";
import { useAuth } from "../shared/auth";

const demoAccounts = [
  { title: "Председатель", login: "chairman", password: "chairman123", note: "Создает учетные записи и назначает роли" },
  { title: "Админ", login: "admin", password: "admin123", note: "Следит за системой и настройками" },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const [login, setLogin] = useState("chairman");
  const [password, setPassword] = useState("chairman123");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.login({ login, password });
      signIn({
        userId: response.user_id,
        userName: response.user_name,
        roleCode: response.role_code,
        roleName: response.role_name,
        accessToken: response.access_token,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось выполнить вход");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-shell">
      <div className="login-hero">
        <span className="login-hero__eyebrow">Медцентр • единый доступ</span>
        <h1>Аутентификация сотрудников с ролями и аккуратным управлением доступом.</h1>
        <p>
          Вход построен вокруг роли сотрудника. Председатель может создавать новые учетные записи,
          назначать роли врачам, админам и операторам и держать доступ под контролем.
        </p>
        <div className="login-preview">
          {demoAccounts.map((account) => (
            <div className="login-preview__card" key={account.title}>
              <strong>{account.title}</strong>
              <span>{account.login}</span>
              <span>{account.password}</span>
              <p>{account.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="login-panel">
        <div className="login-panel__switch">
          <button className="login-switch login-switch--active" type="button">
            Сотрудники
          </button>
          <button className="login-switch" type="button" disabled>
            Пациенты скоро
          </button>
        </div>

        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <span className="login-card__eyebrow">Вход в рабочий контур</span>
            <h2>Сотрудники</h2>
            <p>Введите логин и пароль сотрудника. Для первого входа можно использовать председателя.</p>
          </div>

          <label className="login-field">
            <span>Логин</span>
            <input className="input" value={login} onChange={(event) => setLogin(event.target.value)} />
          </label>

          <label className="login-field">
            <span>Пароль</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <div className="login-error">{error}</div> : null}

          <button className="button login-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Проверяем доступ..." : "Войти как сотрудник"}
          </button>
        </form>
      </div>
    </section>
  );
}
