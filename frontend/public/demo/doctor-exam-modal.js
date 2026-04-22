(function () {
  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderClassicRadio(name, value, options) {
    return `
      <div class="doctor-classic-radio-group">
        ${(options || [])
          .map(
            (option) => `
              <label class="doctor-classic-radio">
                <input
                  type="radio"
                  name="${escapeHtml(name)}"
                  value="${escapeHtml(option)}"
                  ${option === value ? "checked" : ""}
                />
                <span>${escapeHtml(option)}</span>
              </label>
            `,
          )
          .join("")}
      </div>
    `;
  }

  function renderCheckboxField(name, checked, label) {
    return `
      <label class="chairman-checkbox">
        <input type="checkbox" name="${escapeHtml(name)}" ${checked ? "checked" : ""} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }

  function renderPhthisiatristClassic(template, exam, client) {
    const fields = exam.fields || {};
    const fullName = client?.fullName || client?.name || client?.fio || "Клиент";

    return `
      <div class="doctor-classic-backdrop" data-doctor-exam-modal>
        <div class="doctor-classic-window">
          <div class="doctor-classic-titlebar">
            <div class="doctor-classic-title">${escapeHtml(template.name)}</div>
            <button type="button" class="doctor-classic-close" data-doctor-exam-close>×</button>
          </div>

          <form
            class="doctor-classic-form"
            data-doctor-exam-form
            data-exam-id="${escapeHtml(exam.id)}"
            data-doctor-role-id="${escapeHtml(template.id)}"
          >
            <div class="doctor-classic-body">
              <div class="doctor-classic-main">
                <div class="doctor-classic-row doctor-classic-row--fio">
                  <div class="doctor-classic-label">Ф.И.О.</div>
                  <div class="doctor-classic-field">
                    <input
                      class="doctor-classic-input doctor-classic-input--fio"
                      type="text"
                      name="patientFullName"
                      value="${escapeHtml(fullName)}"
                      readonly
                    />
                  </div>
                </div>

                <div class="doctor-classic-row doctor-classic-row--complaints">
                  <div class="doctor-classic-label">Жалобы:</div>
                  <div class="doctor-classic-field doctor-classic-field--complaints">
                    <div class="doctor-classic-complaints-left">
                      <select class="doctor-classic-select" name="complaintsPreset">
                        ${(template.fields.find((f) => f.key === "complaintsPreset")?.options || [])
                          .map(
                            (option) => `
                              <option value="${escapeHtml(option)}" ${
                                option === (fields.complaintsPreset ?? "") ? "selected" : ""
                              }>
                                ${escapeHtml(option)}
                              </option>
                            `,
                          )
                          .join("")}
                      </select>
                    </div>
                    <div class="doctor-classic-complaints-right">
                      <input
                        class="doctor-classic-input"
                        type="text"
                        name="complaints"
                        value="${escapeHtml(fields.complaints ?? "")}"
                      />
                    </div>
                  </div>
                </div>

                <div class="doctor-classic-row">
                  <div class="doctor-classic-label">Анамнез:</div>
                  <div class="doctor-classic-field">
                    <textarea
                      class="doctor-classic-textarea doctor-classic-textarea--mid"
                      name="anamnesis"
                    >${escapeHtml(fields.anamnesis ?? "")}</textarea>
                  </div>
                </div>

                <div class="doctor-classic-row">
                  <div class="doctor-classic-label">Объективно:</div>
                  <div class="doctor-classic-field">
                    <textarea
                      class="doctor-classic-textarea doctor-classic-textarea--mid"
                      name="objective"
                    >${escapeHtml(fields.objective ?? "")}</textarea>
                  </div>
                </div>

                <div class="doctor-classic-row">
                  <div class="doctor-classic-label">Диагноз:</div>
                  <div class="doctor-classic-field">
                    <textarea
                      class="doctor-classic-textarea doctor-classic-textarea--diagnosis"
                      name="diagnosis"
                    >${escapeHtml(fields.diagnosis ?? "")}</textarea>
                  </div>
                </div>

                <div class="doctor-classic-row doctor-classic-row--conclusion">
                  <div class="doctor-classic-label">Заключение:</div>
                  <div class="doctor-classic-field">
                    ${renderClassicRadio(
                      "conclusion",
                      fields.conclusion ?? "Годен",
                      template.fields.find((f) => f.key === "conclusion")?.options || [],
                    )}

                    <div class="doctor-classic-bottom-line">
                      <div class="doctor-classic-bottom-item doctor-classic-bottom-item--validity">
                        <label class="doctor-classic-inline-label">Срок:</label>
                        <select class="doctor-classic-select doctor-classic-select--small" name="validity">
                          ${(template.fields.find((f) => f.key === "validity")?.options || [])
                            .map(
                              (option) => `
                                <option value="${escapeHtml(option)}" ${
                                  option === (fields.validity ?? "") ? "selected" : ""
                                }>
                                  ${escapeHtml(option)}
                                </option>
                              `,
                            )
                            .join("")}
                        </select>
                      </div>

                      <div class="doctor-classic-bottom-item doctor-classic-bottom-item--mkb">
                        <label class="doctor-classic-inline-label">МКБ10:</label>
                        <input
                          class="doctor-classic-input doctor-classic-input--mkb"
                          type="text"
                          name="mkb10"
                          value="${escapeHtml(fields.mkb10 ?? "")}"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="doctor-classic-row doctor-classic-row--note">
                  <div class="doctor-classic-label">Примечание:</div>
                  <div class="doctor-classic-field">
                    <textarea
                      class="doctor-classic-textarea doctor-classic-textarea--note"
                      name="note"
                    >${escapeHtml(fields.note ?? "")}</textarea>
                  </div>
                </div>
              </div>

              <div class="doctor-classic-sidebar">
                <button type="submit" class="doctor-classic-sidebtn">ОК</button>
                <button type="button" class="doctor-classic-sidebtn" data-doctor-exam-close>Отмена</button>
                <button type="button" class="doctor-classic-sidebtn doctor-classic-sidebtn--danger" data-doctor-exam-delete>Удаление</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderChairmanClassic(template, exam, client) {
    const fields = exam.fields || {};
    const fullName = client?.fullName || client?.name || client?.fio || "Клиент";
    const birthDate = fields.birthDate || client?.birthDate || "";

    return `
      <div class="doctor-classic-backdrop" data-doctor-exam-modal>
        <div class="chairman-window">
          <div class="doctor-classic-titlebar">
            <div class="doctor-classic-title">${escapeHtml(template.name)}</div>
            <button type="button" class="doctor-classic-close" data-doctor-exam-close>×</button>
          </div>

          <form
            class="chairman-form"
            data-doctor-exam-form
            data-exam-id="${escapeHtml(exam.id)}"
            data-doctor-role-id="${escapeHtml(template.id)}"
          >
            <div class="chairman-top">
              <div class="chairman-top-left">
                <div class="chairman-mini-row">
                  <label class="chairman-mini-label">дата рождения</label>
                  <input class="doctor-classic-input" type="text" name="birthDate" value="${escapeHtml(birthDate)}" />
                </div>
              </div>

              <div class="chairman-top-main">
                <div class="chairman-main-row">
                  <label class="chairman-main-label">Ф.И.О.</label>
                  <input class="doctor-classic-input doctor-classic-input--fio" type="text" name="patientFullName" value="${escapeHtml(fullName)}" readonly />
                </div>

                <div class="chairman-main-row chairman-main-row--requirements">
                  <label class="chairman-main-label">Мед. требования:</label>
                  <textarea class="doctor-classic-textarea chairman-textarea chairman-textarea--big" name="medicalRequirements">${escapeHtml(fields.medicalRequirements ?? "")}</textarea>
                </div>
              </div>

              <div class="chairman-top-right">
                ${renderCheckboxField("hasGlasses", !!fields.hasGlasses, "очки")}
                ${renderCheckboxField("hasHearingAid", !!fields.hasHearingAid, "слух аппарат")}
              </div>
            </div>

            <div class="chairman-middle">
              <div class="chairman-row">
                <label class="chairman-row-label">ЭКГ:</label>
                <input class="doctor-classic-input" type="text" name="ekg" value="${escapeHtml(fields.ekg ?? "")}" />
              </div>

              <div class="chairman-row chairman-row--ekg-conclusion">
                <label class="chairman-row-label">Заключение ЭКГ:</label>
                <textarea class="doctor-classic-textarea chairman-textarea chairman-textarea--small" name="ekgConclusion">${escapeHtml(fields.ekgConclusion ?? "")}</textarea>
                <div class="chairman-blood">
                  <div class="chairman-blood-row">
                    <label>Группа крови</label>
                    <input class="doctor-classic-input" type="text" name="bloodGroup" value="${escapeHtml(fields.bloodGroup ?? "")}" />
                  </div>
                  <div class="chairman-blood-row">
                    <label>резус-фактор</label>
                    <input class="doctor-classic-input" type="text" name="rhesusFactor" value="${escapeHtml(fields.rhesusFactor ?? "")}" />
                  </div>
                  <div class="chairman-blood-row">
                    <label>кровь - откуда данные</label>
                    <input class="doctor-classic-input" type="text" name="bloodSource" value="${escapeHtml(fields.bloodSource ?? "")}" />
                  </div>
                </div>
              </div>

              <div class="chairman-row">
                <label class="chairman-row-label">Флюорография:</label>
                <input class="doctor-classic-input" type="text" name="fluorography" value="${escapeHtml(fields.fluorography ?? "")}" />
              </div>

              <div class="chairman-flags">
                ${renderCheckboxField("vaccinationRefusal", !!fields.vaccinationRefusal, "Подписан отказ от прививок")}
                ${renderCheckboxField("needsKekReferral", !!fields.needsKekReferral, "Нуждается в направлении на КЭК")}
              </div>

              <div class="chairman-meta-grid">
                <div class="chairman-meta-item">
                  <label>Дата экзамена:</label>
                  <input class="doctor-classic-input" type="text" name="examDate" value="${escapeHtml(fields.examDate ?? "")}" />
                </div>
                <div class="chairman-meta-item">
                  <label>№ Логотипа:</label>
                  <input class="doctor-classic-input" type="text" name="logotypeNumber" value="${escapeHtml(fields.logotypeNumber ?? "")}" />
                </div>
                <div class="chairman-meta-item">
                  <label>№ Атт.комиссии:</label>
                  <input class="doctor-classic-input" type="text" name="commissionNumber" value="${escapeHtml(fields.commissionNumber ?? "")}" />
                </div>
                <div class="chairman-meta-item">
                  <label>МКБ10:</label>
                  <input class="doctor-classic-input" type="text" name="mkb10" value="${escapeHtml(fields.mkb10 ?? "")}" />
                </div>
              </div>

              <div class="chairman-row chairman-row--diagnosis">
                <label class="chairman-row-label">Диагноз:</label>
                <textarea class="doctor-classic-textarea chairman-textarea chairman-textarea--diagnosis" name="diagnosis">${escapeHtml(fields.diagnosis ?? "")}</textarea>
              </div>
            </div>

            <div class="chairman-bottom">
              <div class="chairman-conclusion-left">
                <div class="chairman-conclusion-title">Заключение:</div>

                <div class="chairman-inline-controls">
                  <label>Срок:</label>
                  <select class="doctor-classic-select doctor-classic-select--small" name="validity">
                    ${(template.fields.find((f) => f.key === "validity")?.options || [])
                      .map(
                        (option) => `
                          <option value="${escapeHtml(option)}" ${option === (fields.validity ?? "") ? "selected" : ""}>
                            ${escapeHtml(option)}
                          </option>
                        `,
                      )
                      .join("")}
                  </select>

                  <label>орган.</label>
                  <select class="doctor-classic-select" name="organ">
                    ${(template.fields.find((f) => f.key === "organ")?.options || [])
                      .map(
                        (option) => `
                          <option value="${escapeHtml(option)}" ${option === (fields.organ ?? "") ? "selected" : ""}>
                            ${escapeHtml(option)}
                          </option>
                        `,
                      )
                      .join("")}
                  </select>
                </div>

                <div class="doctor-classic-radio-group chairman-radio-group">
                  <label class="doctor-classic-radio">
                    <input type="radio" name="conclusion" value="Годен" ${(fields.conclusion ?? "Годен") === "Годен" ? "checked" : ""} />
                    <span>Годен</span>
                  </label>
                  <label class="doctor-classic-radio">
                    <input type="radio" name="conclusion" value="Не годен" ${(fields.conclusion ?? "") === "Не годен" ? "checked" : ""} />
                    <span>Не годен</span>
                  </label>
                </div>
              </div>

              <div class="chairman-conclusion-right">
                <div class="chairman-columns">
                  <div class="chairman-column">
                    <div class="chairman-column-title">Категории</div>
                    ${renderCheckboxField("categoryA", !!fields.categoryA, "A")}
                    ${renderCheckboxField("categoryB", !!fields.categoryB, "B")}
                    ${renderCheckboxField("categoryC", !!fields.categoryC, "C")}
                    ${renderCheckboxField("categoryD", !!fields.categoryD, "D")}
                    ${renderCheckboxField("categoryE", !!fields.categoryE, "E")}
                    ${renderCheckboxField("categoryTram", !!fields.categoryTram, "трамвай (п.6.)")}
                    ${renderCheckboxField("categoryTractor", !!fields.categoryTractor, "тракторы (п.8.)")}
                    ${renderCheckboxField("categoryTrolleybus", !!fields.categoryTrolleybus, "троллейбус (п.6.)")}
                    ${renderCheckboxField("categoryBoat", !!fields.categoryBoat, "лайнеры и катера (п.9)")}
                    ${renderCheckboxField("categorySailing", !!fields.categorySailing, "парусный спорт")}
                  </div>

                  <div class="chairman-column">
                    <div class="chairman-column-title">Показания:</div>
                    ${renderCheckboxField("indicationManual", !!fields.indicationManual, "с ручн.управлением")}
                    ${renderCheckboxField("indicationAutomatic", !!fields.indicationAutomatic, "с автоматом")}
                    ${renderCheckboxField("indicationAcoustic", !!fields.indicationAcoustic, "с акустикой")}
                    ${renderCheckboxField("indicationGlasses", !!fields.indicationGlasses, "очки/линзы")}
                    ${renderCheckboxField("indicationHearingAid", !!fields.indicationHearingAid, "слуховой аппарат")}
                    ${renderCheckboxField("indicationNoHiring", !!fields.indicationNoHiring, "без найма")}
                    ${renderCheckboxField("indicationOneYear", !!fields.indicationOneYear, "на год")}
                  </div>

                  <div class="chairman-column">
                    <div class="chairman-column-title">Ограничения:</div>
                    ${renderCheckboxField("restrictionAM", !!fields.restrictionAM, "AM")}
                    ${renderCheckboxField("restrictionBBE", !!fields.restrictionBBE, "BBE")}
                    ${renderCheckboxField("restrictionCCE", !!fields.restrictionCCE, "CCE")}
                    ${renderCheckboxField("restrictionNoHands", !!fields.restrictionNoHands, "Без руки")}
                    ${renderCheckboxField("restrictionNoLegs", !!fields.restrictionNoLegs, "Без ноги")}
                  </div>
                </div>
              </div>

              <div class="chairman-actions">
                <button type="submit" class="chairman-action-btn">Сохранить</button>
                <button type="button" class="chairman-action-btn" data-doctor-exam-close>Отмена</button>
              </div>
            </div>

            <div class="chairman-footer">
              ${renderCheckboxField("periodicProf", !!fields.periodicProf, "Периодический проф")}
            </div>

            <div class="chairman-note">
              <label>Примечание:</label>
              <textarea class="doctor-classic-textarea chairman-textarea chairman-textarea--note" name="note">${escapeHtml(fields.note ?? "")}</textarea>
            </div>
          </form>
        </div>
      </div>
    `;
  }

    function renderPsychiatristClassic(template, exam, client) {
    const fields = exam.fields || {};
    const fullName = client?.fullName || client?.name || client?.fio || "Клиент";
    const birthDate = fields.birthDate || client?.birthDate || "";
    const address = fields.address || client?.address || "";
    const activeTab = fields.tab || "Анамнез";

    function tabClass(tabName) {
      return activeTab === tabName ? "psy-tab psy-tab--active" : "psy-tab";
    }

    return `
      <div class="doctor-classic-backdrop" data-doctor-exam-modal>
        <div class="psy-window">
          <div class="doctor-classic-titlebar">
            <div class="doctor-classic-title">${escapeHtml(template.name)}</div>
            <button type="button" class="doctor-classic-close" data-doctor-exam-close>×</button>
          </div>

          <form
            class="psy-form"
            data-doctor-exam-form
            data-exam-id="${escapeHtml(exam.id)}"
            data-doctor-role-id="${escapeHtml(template.id)}"
          >
            <div class="psy-top">
              <div class="psy-row psy-row--fio">
                <div class="psy-label">Ф.И.О.</div>
                <div class="psy-field-main">
                  <input
                    class="doctor-classic-input doctor-classic-input--fio"
                    type="text"
                    name="patientFullName"
                    value="${escapeHtml(fullName)}"
                    readonly
                  />
                </div>
              </div>

              <div class="psy-row psy-row--meta-grid">
                <div class="psy-meta-item">
                  <label class="psy-small-label">Дата рождения</label>
                  <input
                    class="doctor-classic-input"
                    type="text"
                    name="birthDate"
                    value="${escapeHtml(birthDate)}"
                  />
                </div>

                <div class="psy-meta-item psy-meta-item--address">
                  <label class="psy-small-label">Адрес</label>
                  <input
                    class="doctor-classic-input"
                    type="text"
                    name="address"
                    value="${escapeHtml(address)}"
                  />
                </div>

                <div class="psy-meta-item">
                  <label class="psy-small-label">№ п/п</label>
                  <input
                    class="doctor-classic-input"
                    type="text"
                    name="serialNumber"
                    value="${escapeHtml(fields.serialNumber ?? "")}"
                  />
                </div>
              </div>

              <div class="psy-row psy-row--complaints">
                <div class="psy-complaints-left">
                  <label class="psy-small-label">Жалобы</label>
                  <select class="doctor-classic-select" name="complaintsPreset">
                    ${(template.fields.find((f) => f.key === "complaintsPreset")?.options || [])
                      .map(
                        (option) => `
                          <option value="${escapeHtml(option)}" ${
                            option === (fields.complaintsPreset ?? "") ? "selected" : ""
                          }>
                            ${escapeHtml(option)}
                          </option>
                        `,
                      )
                      .join("")}
                  </select>
                </div>

                <div class="psy-complaints-right">
                  <label class="psy-small-label">Текст жалоб</label>
                  <input
                    class="doctor-classic-input"
                    type="text"
                    name="complaints"
                    value="${escapeHtml(fields.complaints ?? "")}"
                  />
                </div>
              </div>

              <div class="psy-row psy-row--tabs">
                <div class="psy-tabs">
                  <button type="button" class="${tabClass("Анамнез")}" data-psy-tab="Анамнез">Анамнез</button>
                  <button type="button" class="${tabClass("Психическое состояние")}" data-psy-tab="Психическое состояние">Психическое состояние</button>
                  <button type="button" class="${tabClass("Алкоголь")}" data-psy-tab="Алкоголь">Алкоголь</button>
                  <button type="button" class="${tabClass("Диагноз")}" data-psy-tab="Диагноз">Диагноз</button>
                  <input type="hidden" name="tab" value="${escapeHtml(activeTab)}" />
                </div>
              </div>
            </div>

            <div class="psy-main-layout">
              <div class="psy-content">
                <div class="psy-body">
                  <div class="psy-panel ${activeTab === "Анамнез" ? "" : "hidden"}" data-psy-panel="Анамнез">
                    <div class="psy-grid psy-grid--two">
                      <div class="psy-field">
                        <label>Наследственность</label>
                        <input
                          class="doctor-classic-input"
                          type="text"
                          name="anamnesisHeredity"
                          value="${escapeHtml(fields.anamnesisHeredity ?? "")}"
                        />
                      </div>

                      <div class="psy-field">
                        <label>Перенесенные травмы, заболевания</label>
                        <input
                          class="doctor-classic-input"
                          type="text"
                          name="anamnesisDiseases"
                          value="${escapeHtml(fields.anamnesisDiseases ?? "")}"
                        />
                      </div>

                      <div class="psy-field">
                        <label>Номер справки ПНД</label>
                        <input
                          class="doctor-classic-input"
                          type="text"
                          name="anamnesisPndNumber"
                          value="${escapeHtml(fields.anamnesisPndNumber ?? "")}"
                        />
                      </div>

                      <div class="psy-field">
                        <label>Номер справки НД</label>
                        <input
                          class="doctor-classic-input"
                          type="text"
                          name="anamnesisNdNumber"
                          value="${escapeHtml(fields.anamnesisNdNumber ?? "")}"
                        />
                      </div>
                    </div>
                  </div>

                  <div class="psy-panel ${activeTab === "Психическое состояние" ? "" : "hidden"}" data-psy-panel="Психическое состояние">
                    <div class="psy-grid psy-grid--two">
                      <div class="psy-field">
                        <label>Ориентировка</label>
                        <input class="doctor-classic-input" type="text" name="mentalOrientation" value="${escapeHtml(fields.mentalOrientation ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Настроение</label>
                        <input class="doctor-classic-input" type="text" name="mentalMood" value="${escapeHtml(fields.mentalMood ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>На вопросы отвечает</label>
                        <input class="doctor-classic-input" type="text" name="mentalAnswers" value="${escapeHtml(fields.mentalAnswers ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Галлюцинации</label>
                        <input class="doctor-classic-input" type="text" name="mentalHallucinations" value="${escapeHtml(fields.mentalHallucinations ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Память</label>
                        <input class="doctor-classic-input" type="text" name="mentalMemory" value="${escapeHtml(fields.mentalMemory ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Интеллект</label>
                        <input class="doctor-classic-input" type="text" name="mentalIntellect" value="${escapeHtml(fields.mentalIntellect ?? "")}" />
                      </div>

                      <div class="psy-field psy-field--full">
                        <label>Примечание</label>
                        <textarea class="doctor-classic-textarea psy-textarea" name="mentalNote">${escapeHtml(fields.mentalNote ?? "")}</textarea>
                      </div>
                    </div>
                  </div>

                  <div class="psy-panel ${activeTab === "Алкоголь" ? "" : "hidden"}" data-psy-panel="Алкоголь">
                    <div class="psy-grid psy-grid--two">
                      <div class="psy-field">
                        <label>Как часто алкоголизируется</label>
                        <input class="doctor-classic-input" type="text" name="alcoholFrequency" value="${escapeHtml(fields.alcoholFrequency ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Состояние языка</label>
                        <input class="doctor-classic-input" type="text" name="alcoholTongue" value="${escapeHtml(fields.alcoholTongue ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Какие напитки предпочитает</label>
                        <input class="doctor-classic-input" type="text" name="alcoholPreference" value="${escapeHtml(fields.alcoholPreference ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Зрачки</label>
                        <input class="doctor-classic-input" type="text" name="alcoholPupils" value="${escapeHtml(fields.alcoholPupils ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Макс. количество выпитого за раз</label>
                        <input class="doctor-classic-input" type="text" name="alcoholMaxDose" value="${escapeHtml(fields.alcoholMaxDose ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Реакция на свет</label>
                        <input class="doctor-classic-input" type="text" name="alcoholLightReaction" value="${escapeHtml(fields.alcoholLightReaction ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Самочувствие на след. день</label>
                        <input class="doctor-classic-input" type="text" name="alcoholNextDay" value="${escapeHtml(fields.alcoholNextDay ?? "")}" />
                      </div>

                      <div class="psy-field">
                        <label>Тремор</label>
                        <input class="doctor-classic-input" type="text" name="alcoholTremor" value="${escapeHtml(fields.alcoholTremor ?? "")}" />
                      </div>

                      <div class="psy-field psy-field--full">
                        <label>Были ли случаи употребления спиртного несколько дней подряд</label>
                        <input class="doctor-classic-input" type="text" name="alcoholMultiDay" value="${escapeHtml(fields.alcoholMultiDay ?? "")}" />
                      </div>

                      <div class="psy-field psy-field--full">
                        <label>Употреблял ли психотропные препараты</label>
                        <input class="doctor-classic-input" type="text" name="alcoholPsychotropic" value="${escapeHtml(fields.alcoholPsychotropic ?? "")}" />
                      </div>

                      <div class="psy-field psy-field--full">
                        <label>Употреблял ли наркотики</label>
                        <input class="doctor-classic-input" type="text" name="alcoholDrugs" value="${escapeHtml(fields.alcoholDrugs ?? "")}" />
                      </div>
                    </div>
                  </div>

                  <div class="psy-panel ${activeTab === "Диагноз" ? "" : "hidden"}" data-psy-panel="Диагноз">
                    <div class="psy-grid psy-grid--single">
                      <div class="psy-field">
                        <label>Диагноз</label>
                        <input
                          class="doctor-classic-input"
                          type="text"
                          name="diagnosisShort"
                          value="${escapeHtml(fields.diagnosisShort ?? "")}"
                        />
                      </div>

                      <div class="psy-field">
                        <label>Выдано заключение</label>
                        <textarea class="doctor-classic-textarea psy-issued-textarea" name="issuedConclusion">${escapeHtml(fields.issuedConclusion ?? "")}</textarea>
                      </div>

                      <div class="psy-footer-box">
                        <div class="psy-footer-title">Заключение</div>

                        <div class="psy-conclusion-inline">
                          <label>Срок:</label>
                          <select class="doctor-classic-select doctor-classic-select--small" name="validity">
                            ${(template.fields.find((f) => f.key === "validity")?.options || [])
                              .map(
                                (option) => `
                                  <option value="${escapeHtml(option)}" ${option === (fields.validity ?? "") ? "selected" : ""}>
                                    ${escapeHtml(option)}
                                  </option>
                                `,
                              )
                              .join("")}
                          </select>
                        </div>

                        <div class="doctor-classic-radio-group chairman-radio-group">
                          <label class="doctor-classic-radio">
                            <input type="radio" name="conclusion" value="Годен" ${(fields.conclusion ?? "Годен") === "Годен" ? "checked" : ""} />
                            <span>Годен</span>
                          </label>
                          <label class="doctor-classic-radio">
                            <input type="radio" name="conclusion" value="Не годен" ${(fields.conclusion ?? "") === "Не годен" ? "checked" : ""} />
                            <span>Не годен</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="psy-note-block">
                  <label>Примечание</label>
                  <textarea class="doctor-classic-textarea psy-note-textarea" name="note">${escapeHtml(fields.note ?? "")}</textarea>
                </div>
              </div>

              <div class="psy-sidebar">
                <button type="submit" class="doctor-classic-sidebtn">Сохранить</button>
                <button type="button" class="doctor-classic-sidebtn" data-doctor-exam-close>Отмена</button>
                <button type="button" class="doctor-classic-sidebtn doctor-classic-sidebtn--danger" data-doctor-exam-delete>Удаление</button>

                <div class="psy-sidebar-meta">
                  <div class="psy-sidebar-meta__row">
                    <label>МКБ10</label>
                    <input
                      class="doctor-classic-input"
                      type="text"
                      name="mkb10"
                      value="${escapeHtml(fields.mkb10 ?? "")}"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderDefaultModal(template, exam, client) {
    const fullName = client?.fullName || client?.name || client?.fio || "Клиент";

    return `
      <div class="doctor-exam-modal-backdrop" data-doctor-exam-modal>
        <div class="doctor-exam-modal">
          <div class="doctor-exam-modal__header">
            <div>
              <div class="doctor-exam-modal__title">${escapeHtml(template.name)}</div>
              <div class="doctor-exam-modal__subtitle">${escapeHtml(fullName)}</div>
            </div>

            <button type="button" class="doctor-exam-modal__close" data-doctor-exam-close>×</button>
          </div>

          <form
            class="doctor-exam-form"
            data-doctor-exam-form
            data-exam-id="${escapeHtml(exam.id)}"
            data-doctor-role-id="${escapeHtml(template.id)}"
          >
            <div class="doctor-exam-form__grid">
              ${(template.fields || [])
                .map((field) => {
                  if (field.key === "complaintsPreset") return "";

                  const value = exam.fields?.[field.key] ?? "";

                  if (field.type === "textarea") {
                    return `
                      <div class="doctor-exam-field">
                        <label class="doctor-exam-label">${escapeHtml(field.label)}</label>
                        <textarea class="doctor-exam-textarea" name="${escapeHtml(field.key)}" rows="4">${escapeHtml(value)}</textarea>
                      </div>
                    `;
                  }

                  if (field.type === "select") {
                    return `
                      <div class="doctor-exam-field">
                        <label class="doctor-exam-label">${escapeHtml(field.label)}</label>
                        <select class="doctor-exam-select" name="${escapeHtml(field.key)}">
                          ${(field.options || [])
                            .map(
                              (option) => `
                                <option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>
                                  ${escapeHtml(option)}
                                </option>
                              `,
                            )
                            .join("")}
                        </select>
                      </div>
                    `;
                  }

                  if (field.type === "radio") {
                    return `
                      <div class="doctor-exam-field">
                        <label class="doctor-exam-label">${escapeHtml(field.label)}</label>
                        <div class="doctor-exam-radio-group">
                          ${(field.options || [])
                            .map(
                              (option) => `
                                <label class="doctor-exam-radio">
                                  <input
                                    type="radio"
                                    name="${escapeHtml(field.key)}"
                                    value="${escapeHtml(option)}"
                                    ${option === value ? "checked" : ""}
                                  />
                                  <span>${escapeHtml(option)}</span>
                                </label>
                              `,
                            )
                            .join("")}
                        </div>
                      </div>
                    `;
                  }

                  if (field.type === "checkbox") {
                    return `
                      <div class="doctor-exam-field">
                        <label class="doctor-exam-label">${escapeHtml(field.label)}</label>
                        <label class="chairman-checkbox">
                          <input type="checkbox" name="${escapeHtml(field.key)}" ${value ? "checked" : ""} />
                          <span>${escapeHtml(field.label)}</span>
                        </label>
                      </div>
                    `;
                  }

                  return `
                    <div class="doctor-exam-field">
                      <label class="doctor-exam-label">${escapeHtml(field.label)}</label>
                      <input class="doctor-exam-input" type="text" name="${escapeHtml(field.key)}" value="${escapeHtml(value)}" />
                    </div>
                  `;
                })
                .join("")}
            </div>

            <div class="doctor-exam-form__actions">
              <button type="button" class="doctor-exam-btn doctor-exam-btn--secondary" data-doctor-exam-close>Отмена</button>
              <button type="submit" class="doctor-exam-btn doctor-exam-btn--primary">Сохранить</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function collectFormData(form, template) {
    const result = {};

    (template.fields || []).forEach((field) => {
      if (field.type === "radio") {
        const checked = form.querySelector(`input[name="${field.key}"]:checked`);
        result[field.key] = checked ? checked.value : "";
      } else if (field.type === "checkbox") {
        const input = form.elements[field.key];
        result[field.key] = !!input?.checked;
      } else {
        const input = form.elements[field.key];
        result[field.key] = input ? input.value : "";
      }
    });

    return result;
  }

  function bindDoctorExamModal() {
    const modal = document.querySelector("[data-doctor-exam-modal]");
    if (!modal) return;

    modal.querySelectorAll("[data-doctor-exam-close]").forEach((button) => {
      button.addEventListener("click", () => {
        window.closeDoctorExamCard();
      });
    });

    modal.querySelectorAll("[data-doctor-exam-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        alert("Удаление осмотра потом добавим отдельно.");
      });
    });

    const form = modal.querySelector("[data-doctor-exam-form]");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const examId = form.dataset.examId;
      const doctorRoleId = form.dataset.doctorRoleId;
      const template = window.getDoctorTemplate(doctorRoleId);
      if (!template) return;

      const values = collectFormData(form, template);
      window.saveDoctorExam(examId, values);
      window.closeDoctorExamCard();
    });

    modal.querySelectorAll("[data-psy-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const localForm = modal.querySelector("[data-doctor-exam-form]");
        if (!localForm) return;

        const hiddenTabInput = localForm.elements.tab;
        if (hiddenTabInput) {
          hiddenTabInput.value = button.dataset.psyTab || "Анамнез";
        }

        const doctorRoleId = localForm.dataset.doctorRoleId;
        const examId = localForm.dataset.examId;
        const template = window.getDoctorTemplate(doctorRoleId);
        if (!template) return;

        const values = collectFormData(localForm, template);
        window.saveDoctorExam(examId, values);

        const state = window.appState?.doctorExamModal;
        if (state?.isOpen) {
          window.openDoctorExamCard({
            clientId: state.clientId,
            visitId: state.visitId,
            doctorRoleId: state.doctorRoleId,
          });
        }
      });
    });

    setTimeout(() => {
      const inputs = modal.querySelectorAll("input, textarea, select");

      inputs.forEach((el) => {
        if (el.name !== "patientFullName") {
          el.removeAttribute("readonly");
        }
        el.removeAttribute("disabled");

        el.addEventListener("click", (e) => e.stopPropagation());
        el.addEventListener("mousedown", (e) => e.stopPropagation());
        el.addEventListener("focus", (e) => e.stopPropagation());
      });

      const first = modal.querySelector(
        'select, input:not([readonly]):not([type="radio"]), textarea'
      );

      if (first) {
        first.focus();
      }
    }, 50);
  }

  function renderDoctorExamModal() {
    const modalState = window.appState?.doctorExamModal;
    if (!modalState || !modalState.isOpen) return "";

    const { clientId, visitId, doctorRoleId } = modalState;

    const template = window.getDoctorTemplate(doctorRoleId);
    if (!template) return "";

    const exam = window.getDoctorExam(clientId, visitId, doctorRoleId);
    if (!exam) return "";

    const client = (window.data?.clients || []).find((item) => item.id === clientId) || null;

    setTimeout(bindDoctorExamModal, 0);

    if (template.layout === "phthisiatristClassic") {
      return renderPhthisiatristClassic(template, exam, client);
    }

    if (template.layout === "chairmanClassic") {
      return renderChairmanClassic(template, exam, client);
    }

    if (template.layout === "psychiatristClassic") {
      return renderPsychiatristClassic(template, exam, client);
    }

    return renderDefaultModal(template, exam, client);
  }

  window.renderDoctorExamModal = renderDoctorExamModal;
})();