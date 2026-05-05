import { useEffect, useMemo, useState } from "react";

import { api, type Client, type Encounter, type EncounterService, type Payment, type Service } from "../shared/api";

function fullName(client?: Client) {
  if (!client) {
    return "Пациент не найден";
  }
  return [client.last_name, client.first_name, client.middle_name ?? ""].filter(Boolean).join(" ");
}

export function VisitsPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showServiceDialog, setShowServiceDialog] = useState(true);
  const [encounterServices, setEncounterServices] = useState<EncounterService[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    Promise.all([api.getEncounters(), api.getClients(), api.getServices()])
      .then(([encountersData, clientsData, servicesData]) => {
        setEncounters(encountersData);
        setClients(clientsData);
        setServices(servicesData);
        setSelectedId(encountersData[0]?.id ?? null);
      })
      .catch(() => undefined);
  }, []);

  const clientMap = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  const selected = useMemo(
    () => encounters.find((encounter) => encounter.id === selectedId) ?? null,
    [encounters, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setEncounterServices([]);
      setPayments([]);
      return;
    }

    api.getEncounterServices(selectedId).then(setEncounterServices).catch(() => setEncounterServices([]));
    api.getPayments(selectedId).then(setPayments).catch(() => setPayments([]));
  }, [selectedId]);

  const primaryService = encounterServices[0];
  const serviceInfo = services.find((item) => item.id === primaryService?.service_id);
  const primaryPayment = payments[0];

  return (
    <section className="desk-page">
      <div className="desk-toolbar">
        <div className="desk-toolbar__group">
          <button className="toolbar-button" type="button">Добавить</button>
          <button className="toolbar-button" type="button">Изменить</button>
          <button className="toolbar-button" type="button" onClick={() => setShowServiceDialog(true)}>Оказанные услуги</button>
        </div>
      </div>

      <div className="desk-grid desk-grid--single">
        <section className="desk-panel desk-panel--main">
          <div className="desk-panel__title">Обращения (1/1)</div>
          <div className="dense-table">
            <div className="dense-table__head dense-table__head--visits">
              <span>ID</span>
              <span>Дата обращения</span>
              <span>Стоимость услуг</span>
              <span>Регистратор</span>
              <span>Всего оплачено</span>
            </div>
            <div className="dense-table__body">
              {encounters.map((encounter) => (
                <button
                  key={encounter.id}
                  type="button"
                  className={encounter.id === selectedId ? "dense-table__row dense-table__row--visits dense-table__row--active" : "dense-table__row dense-table__row--visits"}
                  onClick={() => setSelectedId(encounter.id)}
                >
                  <span>{encounter.id}</span>
                  <span>{encounter.encounter_date}</span>
                  <span>{primaryService?.line_total ?? encounter.total_amount}</span>
                  <span>admin</span>
                  <span>{primaryPayment?.amount ?? encounter.total_amount}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {showServiceDialog && selected ? (
        <div className="service-dialog-wrap">
          <div className="service-dialog">
            <div className="service-dialog__titlebar">
              <span>Изменение в подчиненной таблице "Оказанные услуги" (ID=13463)</span>
              <button type="button" onClick={() => setShowServiceDialog(false)}>×</button>
            </div>
            <div className="service-tabs">
              <span className="bottom-tabs__item bottom-tabs__item--active">Основное</span>
              <span className="bottom-tabs__item">Водительская</span>
              <span className="bottom-tabs__item">Тракторная</span>
            </div>
            <div className="service-dialog__body">
              <div className="service-form">
                <label><span>№</span><input className="desk-input" value="1" readOnly /></label>
                <label><span>№ справки</span><input className="desk-input" value={primaryService?.sequence_number ?? "4024470556568"} readOnly /></label>
                <label><span>Дата оказания</span><input className="desk-input" value={selected.encounter_date} readOnly /></label>
                <label><span>Количество</span><input className="desk-input" value={primaryService?.quantity ?? 1} readOnly /></label>
                <div className="service-form__row">
                  <label><span>Цена</span><input className="desk-input" value={primaryService?.unit_price ?? serviceInfo?.price ?? "0.00"} readOnly /></label>
                  <label><span>Сумма</span><input className="desk-input" value={primaryService?.line_total ?? selected.total_amount} readOnly /></label>
                </div>
                <label><span>Ссылка на документ</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Код обращения</span><input className="desk-input" value={selected.id} readOnly /></label>
              </div>
              <div className="service-form service-form--wide">
                <label><span className="service-title">Наименование услуги</span><input className="desk-input" value={serviceInfo?.name ?? "Водительская справка"} readOnly /></label>
                <label><span>Серия и № бланка</span><input className="desk-input" value={primaryService?.sequence_number ?? "40425231758"} readOnly /></label>
                <label><span>Испорченный бланк</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Должность</span><input className="desk-input" value="" readOnly /></label>
                <label><span>Организация</span><input className="desk-input" value={fullName(clientMap.get(selected.client_id))} readOnly /></label>
                <label><span>№ карты</span><input className="desk-input" value={selected.client_id} readOnly /></label>
                <label><span>Код клиента</span><input className="desk-input" value={selected.client_id} readOnly /></label>
              </div>
              <div className="service-form service-form--notes">
                <label><span>Пункты вредности</span><textarea className="desk-input desk-input--area" value="Приказ №29н. Прил 1. П 25" readOnly /></label>
                <label><span>Примечание</span><textarea className="desk-input service-note" value={primaryService?.notes ?? selected.comment ?? ""} readOnly /></label>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
