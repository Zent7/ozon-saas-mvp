import type { CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  api,
  buildGeneratedDocumentUrl,
  type BlankForm,
  type Client,
  type ClientPayload,
  type DoctorExam,
  type DoctorRole,
  type DocumentTemplate,
  type Encounter,
  type Service,
} from "../shared/api";

const fallbackDoctorRoles: DoctorRole[] = [
  { id: 1, code: "therapist", name: "Терапевт", sort_order: 10, is_active: true },
  { id: 2, code: "psychiatrist", name: "Психиатр", sort_order: 20, is_active: true },
  { id: 3, code: "psychiatrist-narcologist", name: "Психиатр-нарколог", sort_order: 30, is_active: true },
  { id: 4, code: "neurologist", name: "Невролог", sort_order: 40, is_active: true },
  { id: 5, code: "otolaryngologist", name: "Оториноларинголог", sort_order: 50, is_active: true },
  { id: 6, code: "gynecologist", name: "Гинеколог", sort_order: 60, is_active: true },
  { id: 7, code: "ophthalmologist", name: "Офтальмолог", sort_order: 70, is_active: true },
  { id: 8, code: "dermatologist", name: "Дерматовенеролог", sort_order: 80, is_active: true },
  { id: 9, code: "dentist", name: "Стоматолог", sort_order: 90, is_active: true },
  { id: 10, code: "surgeon", name: "Хирург", sort_order: 100, is_active: true },
  { id: 11, code: "phthisiatrist", name: "Фтизиатр", sort_order: 110, is_active: true },
  { id: 12, code: "uzist", name: "Узист", sort_order: 120, is_active: true },
  { id: 14, code: "infectionist", name: "Инфекционист", sort_order: 125, is_active: true },
];

const doctorClientFieldByCode: Record<string, keyof ClientPayload> = {
  gynecologist: "doctor_gynecologist",
  dentist: "doctor_stomatologist",
  dermatologist: "doctor_dermatologist",
  neurologist: "doctor_neurologist",
  surgeon: "doctor_surgeon",
  otolaryngologist: "doctor_otolaryngologist",
  ophthalmologist: "doctor_ophthalmologist",
  therapist: "doctor_therapist",
  psychiatrist: "doctor_psychiatrist",
  "psychiatrist-narcologist": "doctor_psychiatrist",
  infectionist: "doctor_infectionist",
  phthisiatrist: "doctor_phthisiatrician",
  uzist: "doctor_uzist",
};

const columnStorageKey = "vova-medcenter-column-widths-v3";

const columns = [
  { key: "number", label: "№" },
  { key: "encounterDate", label: "Дата обращения" },
  { key: "fio", label: "ФИО" },
  { key: "birth", label: "Дата рождения" },
  { key: "registration", label: "Регистрация" },
  { key: "category", label: "Категории и условия допуска" },
  { key: "reference", label: "№ справки" },
  { key: "gynecologist", label: "Гинеколог" },
  { key: "stomatologist", label: "Стоматолог" },
  { key: "dermatologist", label: "Дерматолог" },
  { key: "neurologist", label: "Невролог" },
  { key: "surgeon", label: "Хирург" },
  { key: "otolaryngologist", label: "Отоларинголог" },
  { key: "ophthalmologist", label: "Офтальмолог" },
  { key: "therapist", label: "Терапевт" },
  { key: "psychiatrist", label: "Психиатр" },
  { key: "infectionist", label: "Инфекционист" },
  { key: "phthisiatrician", label: "Фтизиатр" },
  { key: "uzist", label: "Узист" },
  { key: "note", label: "Примечания" },
  { key: "cardNumber", label: "Номер карты" },
  { key: "noNumber", label: "б/н" },
  { key: "fg", label: "ФГ" },
  { key: "organization", label: "Организация" },
  { key: "mkb10", label: "МКБ10" },
  { key: "realDate", label: "Реальная дата" },
] as const;

type ClientColumnKey = (typeof columns)[number]["key"];
type SortDirection = "asc" | "desc";

type SortConfig = {
  key: ClientColumnKey;
  direction: SortDirection;
} | null;

type CertificateKind = "086" | "095";
type CertificatePrintVariant = "driver_front" | "driver_back" | "tractor_front" | "tractor_back";

const lastCertificateSeriesStorageKey = "vova-medcenter-last-certificate-series";
const defaultCertificateSeries = "40";

const certificateKinds: Array<{ kind: CertificateKind; title: string; description: string }> = [
  { kind: "086", title: "Справка 086у", description: "Для поступления и обучения" },
  { kind: "095", title: "Справка 095у", description: "О временной нетрудоспособности" },
];

const certificateSeriesCodes = [
  "40655",
  "4076",
  "ГВ",
  "ГИМС",
  "40290",
  "ВУМ",
  "ЭЭГ",
  "4023",
  "ОСК",
  "ОРД",
  "4024",
  "4025",
  "41",
  "1",
  "-4",
  "409",
  "095",
  "425",
  "40",
  "Проф2",
  "ЮП",
  "4022",
  "086",
  "ЛМК",
  "ВС",
  "ГТО",
];

const sideActions: Array<{ label: string; route?: string; anchor?: "top" | "doctors" | "services" }> = [
  { label: "Главное", anchor: "top" },
  { label: "Врачи", anchor: "doctors" },
  { label: "Услуги", anchor: "services" },
  { label: "Шаблоны", route: "/documents" },
  { label: "Загрузка", route: "/documents" },
  { label: "Сотрудник", route: "/settings" },
  { label: "Касса", route: "/reports" },
  { label: "XML", route: "/documents" },
  { label: "Бланки", route: "/blanks" },
  { label: "Отчеты", route: "/reports" },
  { label: "Пункты вредности", route: "/settings" },
];

const emptyClientForm: ClientPayload = {
  last_name: "",
  first_name: "",
  middle_name: "",
  birth_date: "",
  sex: "",
  phone: "",
  email: "",
  document_type: "Паспорт РФ",
  document_series: "",
  document_number: "",
  document_issued_by: "",
  document_issued_date: "",
  snils: "",
  oms_policy: "",
  address_text: "",
  profession: "",
  work_place: "",
  organization: "",
  notes: "",
};

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = formatDateInput(new Date());

function fullName(client?: Client | null) {
  if (!client) return "";
  return [client.last_name, client.first_name, client.middle_name ?? ""].filter(Boolean).join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU").format(date);
}

function compactPayload(form: ClientPayload): ClientPayload {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? null : value]),
  ) as ClientPayload;
}

function clientToForm(client: Client): ClientPayload {
  return {
    last_name: client.last_name,
    first_name: client.first_name,
    middle_name: client.middle_name ?? "",
    birth_date: client.birth_date,
    sex: client.sex ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    document_type: client.document_type ?? "Паспорт РФ",
    document_series: client.document_series ?? "",
    document_number: client.document_number ?? "",
    document_issued_by: client.document_issued_by ?? "",
    document_issued_date: client.document_issued_date ?? "",
    snils: client.snils ?? "",
    oms_policy: client.oms_policy ?? "",
    address_text: client.address_text ?? "",
    notes: client.notes ?? "",
    registration_text: client.registration_text ?? "",
    admission_category: client.admission_category ?? "",
    reference_number: client.reference_number ?? "",
    doctor_gynecologist: client.doctor_gynecologist ?? "",
    doctor_stomatologist: client.doctor_stomatologist ?? "",
    doctor_dermatologist: client.doctor_dermatologist ?? "",
    doctor_neurologist: client.doctor_neurologist ?? "",
    doctor_surgeon: client.doctor_surgeon ?? "",
    doctor_otolaryngologist: client.doctor_otolaryngologist ?? "",
    doctor_ophthalmologist: client.doctor_ophthalmologist ?? "",
    doctor_therapist: client.doctor_therapist ?? "",
    doctor_psychiatrist: client.doctor_psychiatrist ?? "",
    doctor_infectionist: client.doctor_infectionist ?? "",
    doctor_phthisiatrician: client.doctor_phthisiatrician ?? "",
    doctor_uzist: client.doctor_uzist ?? "",
    indications: client.indications ?? "",
    encounter_date_text: client.encounter_date_text ?? "",
    card_number: client.card_number ?? "",
    journal_number: client.journal_number ?? "",
    no_number: client.no_number ?? "",
    flg: client.flg ?? "",
    profession: client.profession ?? "",
    work_place: client.work_place ?? "",
    organization: client.organization ?? "",
    mkb10: client.mkb10 ?? "",
    real_date_text: client.real_date_text ?? "",
    legacy_payload_json: client.legacy_payload_json ?? null,
  };
}

function parseApiError(error: unknown) {
  if (!(error instanceof Error)) return "Не удалось выполнить действие";
  try {
    const detail = JSON.parse(error.message).detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) {
      const duplicate = detail.full_name ? `: ${detail.full_name}, № ${detail.patient_number}` : "";
      return `${detail.message}${duplicate}`;
    }
  } catch {
    return error.message;
  }
  return error.message;
}

function servicePrice(service: Service) {
  return Number(service.price || 0);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function displayValue(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "не указано";
  return String(value);
}

function displayTableValue(value?: string | number | null, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function resolveAdmissionCategory(client?: Client | null) {
  if (!client) return "";
  const directValue = String(client.admission_category ?? "").trim();
  if (directValue) return directValue;
  const services = Array.isArray(client.services)
    ? client.services.map((service) => String(service ?? "").trim()).filter(Boolean)
    : [];
  return services.join(", ");
}

function renderDoctorMark(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }

  const normalized = text.toLowerCase();
  if (["x", "х", "крест", "cross", "required", "pending"].includes(normalized)) {
    return "×";
  }
  if (["✓", "✔", "+", "ok", "done", "completed", "yes", "да"].includes(normalized)) {
    return "✓";
  }

  return text;
}

function getClientDoctorMark(client: Client, roleCode: string) {
  const field = doctorClientFieldByCode[roleCode];
  const value = field ? client[field] : "";
  return typeof value === "string" ? value : "";
}

function mergeDoctorRoles(apiRoles: DoctorRole[]) {
  const byCode = new Map<string, DoctorRole>();
  [...apiRoles, ...fallbackDoctorRoles].forEach((role) => {
    if (role.code === "chairman" || !role.is_active) return;
    if (!byCode.has(role.code)) byCode.set(role.code, role);
  });
  return Array.from(byCode.values()).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ru-RU"));
}

function defaultExamText(roleName: string) {
  return `${roleName}: противопоказаний не выявлено.`;
}

function clientColumnValue(client: Client, key: ClientColumnKey) {
  switch (key) {
    case "number":
      return client.patient_number;
    case "fio":
      return fullName(client);
    case "birth":
      return formatDate(client.birth_date);
    case "registration":
      return client.registration_text || client.address_text || "";
    case "category":
      return resolveAdmissionCategory(client);
    case "reference":
      return client.reference_number || "";
    case "gynecologist":
      return client.doctor_gynecologist || renderDoctorMark(client.doctor_gynecologist);
    case "stomatologist":
      return client.doctor_stomatologist || renderDoctorMark(client.doctor_stomatologist);
    case "dermatologist":
      return client.doctor_dermatologist || renderDoctorMark(client.doctor_dermatologist);
    case "neurologist":
      return client.doctor_neurologist || renderDoctorMark(client.doctor_neurologist);
    case "surgeon":
      return client.doctor_surgeon || renderDoctorMark(client.doctor_surgeon);
    case "otolaryngologist":
      return client.doctor_otolaryngologist || renderDoctorMark(client.doctor_otolaryngologist);
    case "ophthalmologist":
      return client.doctor_ophthalmologist || renderDoctorMark(client.doctor_ophthalmologist);
    case "therapist":
      return client.doctor_therapist || renderDoctorMark(client.doctor_therapist);
    case "psychiatrist":
      return client.doctor_psychiatrist || renderDoctorMark(client.doctor_psychiatrist);
    case "infectionist":
      return client.doctor_infectionist || renderDoctorMark(client.doctor_infectionist);
    case "phthisiatrician":
      return client.doctor_phthisiatrician || renderDoctorMark(client.doctor_phthisiatrician);
    case "uzist":
      return client.doctor_uzist || renderDoctorMark(client.doctor_uzist);
    case "note":
      return client.notes || "";
    case "encounterDate":
      return formatDate(client.encounter_date_text) || client.encounter_date_text || "";
    case "cardNumber":
      return client.card_number || client.patient_number;
    case "noNumber":
      return client.no_number || "";
    case "fg":
      return client.flg || "";
    case "organization":
      return client.organization || "";
    case "mkb10":
      return client.mkb10 || "";
    case "realDate":
      return client.real_date_text || "";
    default:
      return "";
  }
}

function normalizeColumnValue(value: string | number) {
  return String(value).trim().toLocaleLowerCase("ru-RU");
}

function compareColumnValues(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return normalizeColumnValue(a).localeCompare(normalizeColumnValue(b), "ru-RU", {
    numeric: true,
    sensitivity: "base",
  });
}

function parseDateSortValue(value?: string | null) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return parsed;
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return text;
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
}

function clientColumnSortValue(client: Client, key: ClientColumnKey) {
  switch (key) {
    case "birth":
      return parseDateSortValue(client.birth_date);
    case "encounterDate":
      return parseDateSortValue(client.encounter_date_text);
    case "realDate":
      return parseDateSortValue(client.real_date_text);
    default:
      return clientColumnValue(client, key);
  }
}

function isAmbulatoryTemplate(template: DocumentTemplate) {
  const source = `${template.name} ${template.file_name}`.toLowerCase();
  return source.includes("амб") && template.template_type === "xls";
}

function findCertificateTemplate(templates: DocumentTemplate[], kind: CertificateKind) {
  return templates.find((template) => {
    const source = `${template.name} ${template.file_name}`.toLowerCase();
    return source.includes(kind);
  }) ?? null;
}

function normalizeCertificateSeries(value?: string | null) {
  return String(value ?? "").trim();
}

function getCertificateKindFromSeries(value?: string | null): CertificateKind | null {
  const normalized = normalizeCertificateSeries(value);
  if (normalized === "086" || normalized === "095") return normalized;
  return null;
}

function getCertificateSeriesOptions(seriesOptions: Array<{ series?: string | null }>) {
  const values = [...certificateSeriesCodes];
  seriesOptions.forEach((item) => {
    const series = normalizeCertificateSeries(item.series);
    if (series) values.push(series);
  });
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase("ru-RU");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readSavedColumnWidths() {
  try {
    const saved = window.localStorage.getItem(columnStorageKey);
    const parsed = saved ? JSON.parse(saved) : {};
    return parsed && typeof parsed === "object" ? parsed as Record<string, number> : {};
  } catch {
    return {};
  }
}

export function ClientListPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [doctorRoles, setDoctorRoles] = useState<DoctorRole[]>([]);
  const [doctorExams, setDoctorExams] = useState<DoctorExam[]>([]);
  const [activeDoctorRole, setActiveDoctorRole] = useState<DoctorRole | null>(null);
  const [doctorExamForm, setDoctorExamForm] = useState({
    doctor_name: "",
    result_text: "",
    diagnosis: "",
    comment: "",
    is_completed: false,
  });
  const [clientEncounters, setClientEncounters] = useState<Encounter[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState<ClientPayload>(emptyClientForm);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [paymentType, setPaymentType] = useState("cash");
  const [visitDate, setVisitDate] = useState(today);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloadingDocument, setDownloadingDocument] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [certificatePrintOpen, setCertificatePrintOpen] = useState(false);
  const [certificateKind, setCertificateKind] = useState<CertificateKind>("086");
  const [certificateSeries, setCertificateSeries] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [certificateDate, setCertificateDate] = useState(today);
  const [certificatePickerOpen, setCertificatePickerOpen] = useState(false);
  const [certificateSeriesSearch, setCertificateSeriesSearch] = useState("");
  const [certificateSeriesOptions, setCertificateSeriesOptions] = useState<Array<{ series?: string | null }>>([]);
  const [certificateBlankForm, setCertificateBlankForm] = useState<BlankForm | null>(null);
  const [certificateBlankLoading, setCertificateBlankLoading] = useState(false);
  const [certificatePrintMessage, setCertificatePrintMessage] = useState("");
  const [certificatePrintError, setCertificatePrintError] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => readSavedColumnWidths());
  const [columnFilters, setColumnFilters] = useState<Record<ClientColumnKey, string>>(
    () => Object.fromEntries(columns.map((column) => [column.key, ""])) as Record<ClientColumnKey, string>,
  );
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const topSectionRef = useRef<HTMLElement>(null);
  const doctorsSectionRef = useRef<HTMLDivElement>(null);
  const servicesSectionRef = useRef<HTMLElement>(null);

  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedServices = services.filter((service) => selectedServiceIds.includes(service.id));
  const visibleDoctorRoles = useMemo(() => mergeDoctorRoles(doctorRoles), [doctorRoles]);
  const ambulatoryTemplate = useMemo(
    () => templates.find((template) => isAmbulatoryTemplate(template)) ?? null,
    [templates],
  );
  const certificateTemplates = useMemo(
    () => ({
      "086": findCertificateTemplate(templates, "086"),
      "095": findCertificateTemplate(templates, "095"),
    }),
    [templates],
  );
  const selectedCertificateTemplate = certificateTemplates[certificateKind];
  const selectedCertificateMeta = certificateKinds.find((item) => item.kind === certificateKind) ?? certificateKinds[0];
  const certificateBlankType = selectedCertificateTemplate?.blank_type || "driver_medical_certificate";
  const certificateSeriesChoices = useMemo(
    () => getCertificateSeriesOptions(certificateSeriesOptions),
    [certificateSeriesOptions],
  );
  const filteredCertificateSeriesChoices = useMemo(() => {
    const query = normalizeCertificateSeries(certificateSeriesSearch).toLocaleLowerCase("ru-RU");
    return certificateSeriesChoices.filter((item) => !query || item.toLocaleLowerCase("ru-RU").includes(query));
  }, [certificateSeriesChoices, certificateSeriesSearch]);
  const latestEncounter = clientEncounters[0] ?? null;
  const totalAmount = useMemo(
    () => selectedServices.reduce((sum, service) => sum + servicePrice(service), 0),
    [selectedServices],
  );
  const activeColumnFilterCount = useMemo(
    () => Object.values(columnFilters).filter((value) => value.trim()).length,
    [columnFilters],
  );
  const visibleClients = useMemo(() => {
    const activeFilters = Object.entries(columnFilters)
      .map(([key, value]) => [key as ClientColumnKey, normalizeColumnValue(value)] as const)
      .filter(([key]) => key !== "encounterDate")
      .filter(([, value]) => value);

    const filtered = activeFilters.length
      ? clients.filter((client) =>
        activeFilters.every(([key, value]) => normalizeColumnValue(clientColumnValue(client, key)).includes(value)),
      )
      : [...clients];

    if (!sortConfig) return filtered;

    return filtered.sort((a, b) => {
      const result = compareColumnValues(clientColumnSortValue(a, sortConfig.key), clientColumnSortValue(b, sortConfig.key));
      return sortConfig.direction === "asc" ? result : -result;
    });
  }, [clients, columnFilters, sortConfig]);

  async function loadServices() {
    try {
      const result = await api.getServices();
      setServices(result);
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function loadTemplates() {
    try {
      const result = await api.getTemplates();
      setTemplates(result);
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function loadDoctorRoles() {
    try {
      const result = await api.getDoctorRoles();
      setDoctorRoles(result);
    } catch {
      setDoctorRoles([]);
    }
  }

  async function loadDoctorExams(clientId: number) {
    try {
      const result = await api.getDoctorExams({ clientId });
      setDoctorExams(result);
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function loadClientEncounters(clientId: number) {
    try {
      const result = await api.getEncounters(clientId);
      setClientEncounters(result);
    } catch (err) {
      setError(parseApiError(err));
    }
  }

  async function loadClients(value = search) {
    const trimmed = value.trim();
    const encounterDate = columnFilters.encounterDate.trim();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const result = await api.getClients(trimmed, 50, encounterDate || undefined);
      setClients(result);
      setSelectedClientId((current) => {
        if (current && result.some((client) => client.id === current)) return current;
        return result[0]?.id ?? null;
      });
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadServices();
    void loadTemplates();
    void loadDoctorRoles();
  }, []);

  useEffect(() => {
    const focusId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(focusId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadClients(search);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [search, columnFilters.encounterDate]);

  useEffect(() => {
    if (selectedClient && !isEditingClient) {
      setClientForm(clientToForm(selectedClient));
    }
  }, [selectedClientId, selectedClient, isEditingClient]);

  useEffect(() => {
    if (!selectedClientId) {
      setClientEncounters([]);
      setDoctorExams([]);
      return;
    }
    void loadClientEncounters(selectedClientId);
    void loadDoctorExams(selectedClientId);
  }, [selectedClientId]);

  function startCreate() {
    const parts = search.trim().split(/\s+/).filter(Boolean);
    setIsEditingClient(true);
    setSelectedClientId(null);
    setClientForm({
      ...emptyClientForm,
      last_name: parts[0] ?? "",
      first_name: parts[1] ?? "",
      middle_name: parts.slice(2).join(" "),
    });
  }

  function startEdit() {
    if (!selectedClient) return;
    setIsEditingClient(true);
    setClientForm(clientToForm(selectedClient));
  }

  function cancelEdit() {
    setIsEditingClient(false);
    if (selectedClient) setClientForm(clientToForm(selectedClient));
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = compactPayload(clientForm);
      const saved = selectedClient && isEditingClient
        ? await api.updateClient(selectedClient.id, payload)
        : await api.createClient(payload);
      setSearch(saved.last_name);
      setSelectedClientId(saved.id);
      setClientForm(clientToForm(saved));
      setIsEditingClient(false);
      setNotice(`Клиент сохранен: № ${saved.patient_number}`);
      await loadClients(saved.last_name);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function createVisit() {
    if (!selectedClient) {
      setError("Сначала выберите или создайте клиента.");
      return;
    }
    if (selectedServiceIds.length === 0) {
      setError("Выберите хотя бы одну услугу.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const encounter = await api.createEncounter({
        center_id: 1,
        client_id: selectedClient.id,
        encounter_date: visitDate,
        payment_type: paymentType,
        total_amount: totalAmount.toFixed(2),
        comment: comment || null,
      });

      await Promise.all(
        selectedServices.map((service) =>
          api.createEncounterService({
            encounter_id: encounter.id,
            service_id: service.id,
            quantity: 1,
            unit_price: service.price,
            line_total: service.price,
            sequence_number: null,
            notes: null,
          }),
        ),
      );

      setNotice(`Обращение № ${encounter.id} оформлено. Сумма: ${totalAmount.toFixed(2)}`);
      const selectedServiceNames = selectedServices.map((service) => service.name);
      setClients((current) =>
        current.map((client) =>
          client.id === selectedClient.id
            ? { ...client, encounter_date_text: visitDate, services: selectedServiceNames }
            : client,
        ),
      );
      setClientEncounters((current) => [encounter, ...current.filter((item) => item.id !== encounter.id)]);
      setComment("");
      setSelectedServiceIds([]);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedClient() {
    if (!selectedClient) {
      setError("Сначала выберите клиента.");
      return;
    }

    const confirmed = window.confirm(
      `Удалить клиента ${fullName(selectedClient)} (№ ${selectedClient.patient_number})?\n\nЗапись будет перемещена в удалённые, а не удалена физически.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingClient(true);
    setError("");
    setNotice("");
    try {
      await api.deleteClient(selectedClient.id);
      setClients((current) => current.filter((item) => item.id !== selectedClient.id));
      setClientEncounters([]);
      setSelectedClientId(null);
      setIsEditingClient(false);
      setNotice(`Клиент № ${selectedClient.patient_number} перемещён в удалённые.`);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setDeletingClient(false);
    }
  }

  function toggleService(serviceId: number) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  function toggleColumnSort(key: ClientColumnKey) {
    setSortConfig((current) => {
      if (current?.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  }

  function updateColumnFilter(key: ClientColumnKey, value: string) {
    setColumnFilters((current) => ({ ...current, [key]: value }));
  }

  function clearColumnFilters() {
    setColumnFilters(Object.fromEntries(columns.map((column) => [column.key, ""])) as Record<ClientColumnKey, string>);
    setSortConfig(null);
  }

  function focusNextFormField(event: ReactKeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

    event.preventDefault();
    const fields = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])",
      ),
    );
    const currentIndex = fields.indexOf(target);
    const nextField = fields[currentIndex + 1];
    if (nextField) {
      nextField.focus();
      if (nextField instanceof HTMLInputElement) {
        nextField.select();
      }
    }
  }


  function findDoctorExam(roleCode: string) {
    const currentEncounterId = latestEncounter?.id ?? null;
    return doctorExams.find((exam) => exam.doctor_role_id === roleCode && exam.encounter_id === currentEncounterId)
      ?? doctorExams.find((exam) => exam.doctor_role_id === roleCode)
      ?? null;
  }

  function isDoctorCompleted(roleCode: string) {
    const exam = findDoctorExam(roleCode);
    if (exam?.is_completed) return true;
    return renderDoctorMark(selectedClient ? getClientDoctorMark(selectedClient, roleCode) : "") === "✓";
  }

  function openDoctorExam(role: DoctorRole) {
    if (!selectedClient) {
      setError("Сначала выберите клиента в таблице.");
      return;
    }
    const exam = findDoctorExam(role.code);
    setActiveDoctorRole(role);
    setDoctorExamForm({
      doctor_name: exam?.doctor_name ?? role.name,
      result_text: exam?.result_text ?? defaultExamText(role.name),
      diagnosis: exam?.diagnosis ?? "",
      comment: exam?.comment ?? "",
      is_completed: exam?.is_completed ?? renderDoctorMark(getClientDoctorMark(selectedClient, role.code)) === "✓",
    });
  }

  function closeDoctorExamDialog() {
    setActiveDoctorRole(null);
  }

  async function saveDoctorExam() {
    if (!selectedClient || !activeDoctorRole) {
      setError("Сначала выберите клиента и врача.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const savedExam = await api.saveDoctorExam({
        client_id: selectedClient.id,
        encounter_id: latestEncounter?.id ?? null,
        doctor_role_id: activeDoctorRole.code,
        doctor_name: doctorExamForm.doctor_name || activeDoctorRole.name,
        result_text: doctorExamForm.result_text || null,
        diagnosis: doctorExamForm.diagnosis || null,
        comment: doctorExamForm.comment || null,
        fields_json: {},
        is_completed: doctorExamForm.is_completed,
      });

      setDoctorExams((current) => [
        savedExam,
        ...current.filter((exam) => exam.id !== savedExam.id),
      ]);

      const clientField = doctorClientFieldByCode[activeDoctorRole.code];
      if (clientField) {
        const mark = savedExam.is_completed ? "✓" : "×";
        const updatedClient = await api.updateClient(selectedClient.id, compactPayload({
          ...clientToForm(selectedClient),
          [clientField]: mark,
        }));
        setClients((current) => current.map((client) => (client.id === updatedClient.id ? updatedClient : client)));
        setClientForm(clientToForm(updatedClient));
      }

      setNotice(`${activeDoctorRole.name}: заключение сохранено.`);
      setActiveDoctorRole(null);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function handleSideAction(action: (typeof sideActions)[number]) {
    if (action.route) {
      navigate(action.route);
      return;
    }
    const target = action.anchor === "doctors"
      ? doctorsSectionRef.current
      : action.anchor === "services"
        ? servicesSectionRef.current
        : topSectionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function downloadDemoDocument() {
    if (!selectedClient) {
      setError("Сначала выберите клиента.");
      return;
    }

    const selectedServiceNames = selectedServices.map((service) => service.name).join(", ") || "услуги не выбраны";
    const documentText = [
      "МЕДИЦИНСКАЯ СПРАВКА",
      "",
      `Пациент: ${fullName(selectedClient)}`,
      `№ пациента: ${selectedClient.patient_number}`,
      `Дата рождения: ${formatDate(selectedClient.birth_date)}`,
      `Регистрация: ${displayValue(selectedClient.registration_text || selectedClient.address_text)}`,
      `Категории и условия допуска: ${displayValue(resolveAdmissionCategory(selectedClient))}`,
      `№ справки: ${displayValue(selectedClient.reference_number)}`,
      `Дата обращения: ${displayValue(selectedClient.encounter_date_text || visitDate)}`,
      `Организация: ${displayValue(selectedClient.organization)}`,
      `МКБ10: ${displayValue(selectedClient.mkb10)}`,
      "",
      `Выбранные услуги: ${selectedServiceNames}`,
      `Сумма: ${formatMoney(totalAmount)} руб.`,
      "",
      "Заключение: годен.",
      "Документ сформирован в демонстрационной версии рабочего места оператора.",
    ].join("\n");

    const blob = new Blob([documentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spravka-${selectedClient.patient_number}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Справка для ${fullName(selectedClient)} сформирована.`);
  }

  useEffect(() => {
    window.localStorage.setItem(columnStorageKey, JSON.stringify(columnWidths));
  }, [columnWidths]);

  async function printAmbulatoryCard() {
    if (!selectedClient) {
      setError("Сначала выберите клиента.");
      return;
    }
    if (!ambulatoryTemplate) {
      setError("Шаблон амбулаторной карты Excel не найден.");
      return;
    }

    setPrinting(true);
    setError("");
    setNotice("");
    try {
      const response = await api.printDocument({
        template_id: ambulatoryTemplate.id,
        client_id: selectedClient.id,
        encounter_id: latestEncounter?.id ?? null,
      });
      window.open(buildGeneratedDocumentUrl(response.output_file_name, true), "_blank", "noopener,noreferrer");
      setNotice(response.message);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setPrinting(false);
    }
  }

  function openCertificatePrintDialog() {
    if (!selectedClient) {
      setError("Сначала выберите клиента.");
      return;
    }

    setError("");
    setCertificatePrintError("");
    setCertificatePrintMessage("");
    setCertificatePickerOpen(false);
    setCertificateKind("086");
    setCertificateSeries(window.localStorage.getItem(lastCertificateSeriesStorageKey) || defaultCertificateSeries);
    setCertificateNumber("");
    setCertificateDate(latestEncounter?.encounter_date ?? selectedClient.encounter_date_text ?? visitDate);
    setCertificateSeriesSearch("");
    setCertificateSeriesOptions([]);
    setCertificateBlankForm(null);
    setCertificatePrintOpen(true);
    void loadCertificateSeriesOptions("driver_medical_certificate");
  }

  function closeCertificatePrintDialog() {
    if (printing) return;
    setCertificatePrintOpen(false);
    setCertificatePickerOpen(false);
  }

  async function loadCertificateSeriesOptions(blankType: string) {
    try {
      const result = await api.getBlankSeries({ blankType, centerId: 1 });
      setCertificateSeriesOptions(result);
    } catch {
      setCertificateSeriesOptions([]);
    }
  }

  function selectCertificateSeries(value: string) {
    const normalized = normalizeCertificateSeries(value);
    setCertificateSeries(normalized);
    if (normalized) {
      window.localStorage.setItem(lastCertificateSeriesStorageKey, normalized);
    }
    const nextKind = getCertificateKindFromSeries(normalized);
    if (nextKind) {
      setCertificateKind(nextKind);
      void loadCertificateSeriesOptions(certificateTemplates[nextKind]?.blank_type || "driver_medical_certificate");
    }
    setCertificateNumber("");
    setCertificateBlankForm(null);
    setCertificatePickerOpen(false);
    setCertificateSeriesSearch("");
    setCertificatePrintError("");
    setCertificatePrintMessage("");
  }

  async function findCertificateBlankNumber() {
    const series = normalizeCertificateSeries(certificateSeries);
    if (!series) {
      setCertificatePrintError("Укажите серию бланка.");
      return;
    }

    setCertificateBlankLoading(true);
    setCertificatePrintError("");
    setCertificatePrintMessage("");
    try {
      const blank = await api.getNextBlankForm({
        blankType: certificateBlankType,
        centerId: 1,
        series,
      });
      setCertificateBlankForm(blank);
      const blankNumber = blank.full_number || String(blank.number_value ?? "");
      setCertificateNumber(blankNumber);
      window.localStorage.setItem(lastCertificateSeriesStorageKey, series);
      if (selectedClient && blankNumber) {
        const updatedClient = await api.updateClient(selectedClient.id, compactPayload({
          ...clientToForm(selectedClient),
          reference_number: blankNumber,
        }));
        setClients((current) => current.map((client) => (client.id === updatedClient.id ? updatedClient : client)));
        setClientForm(clientToForm(updatedClient));
        setCertificatePrintMessage("Номер бланка сохранен в карточке клиента.");
      }
    } catch (err) {
      setCertificateBlankForm(null);
      setCertificateNumber("");
      setCertificatePrintError(parseApiError(err));
    } finally {
      setCertificateBlankLoading(false);
    }
  }

  async function printSelectedCertificate(printVariant: CertificatePrintVariant) {
    if (!selectedClient) {
      setCertificatePrintError("Сначала выберите клиента.");
      return;
    }
    if (!ambulatoryTemplate) {
      setCertificatePrintError("Шаблон водительской/тракторной формы не найден.");
      return;
    }

    if (!certificateNumber) {
      setCertificatePrintError("Сначала нажмите \"Найти номер\", чтобы сохранить номер в карточке клиента.");
      return;
    }

    setPrinting(true);
    setCertificatePrintError("");
    setNotice("");
    try {
      const response = await api.printDocument({
        template_id: ambulatoryTemplate.id,
        client_id: selectedClient.id,
        encounter_id: latestEncounter?.id ?? null,
        print_variant: printVariant,
      });
      window.open(buildGeneratedDocumentUrl(response.output_file_name, true), "_blank", "noopener,noreferrer");
      setCertificatePrintMessage(response.message);
    } catch (err) {
      setCertificatePrintError(parseApiError(err));
    } finally {
      setPrinting(false);
    }
  }

  async function downloadAmbulatoryCard() {
    if (!selectedClient) {
      setError("Сначала выберите клиента.");
      return;
    }
    if (!ambulatoryTemplate) {
      setError("Шаблон амбулаторной карты Excel не найден.");
      return;
    }

    setDownloadingDocument(true);
    setError("");
    setNotice("");
    try {
      const response = await api.generateDocument({
        template_id: ambulatoryTemplate.id,
        client_id: selectedClient.id,
        encounter_id: latestEncounter?.id ?? null,
      });
      window.open(buildGeneratedDocumentUrl(response.output_file_name), "_blank", "noopener,noreferrer");
      setNotice(`Амбулаторная карта ${response.output_file_name} сформирована.`);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setDownloadingDocument(false);
    }
  }

  function startColumnResize(key: string, event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const root = document.documentElement;
    const currentWidth = Number.parseInt(
      getComputedStyle(root).getPropertyValue(`--excel-col-${key}`).trim(),
      10,
    );
    const initialWidth = columnWidths[key] || currentWidth || 80;
    const startX = event.clientX;

    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(22, initialWidth + moveEvent.clientX - startX);
      setColumnWidths((current) => ({ ...current, [key]: nextWidth }));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const columnStyle = Object.fromEntries(
    Object.entries(columnWidths).map(([key, width]) => [`--excel-col-${key}`, `${width}px`]),
  ) as CSSProperties;

  return (
    <div className="operator-shell">
      <aside className="operator-sidebar">
        <div className="operator-logo">
            <div className="operator-logo__mark">M</div>
            <div>
              <strong>MedCenters</strong>
              <span>Рабочее место</span>
            </div>
        </div>

        <div className="operator-menu">
          {sideActions.map((item) => (
            <button key={item.label} type="button" className="operator-menu__item" onClick={() => handleSideAction(item)}>
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="operator-main" ref={topSectionRef}>
        <header className="operator-header">
          <div>
            <div className="operator-eyebrow">Единая система для двух медцентров</div>
            <h1>Картотека пациентов</h1>
          </div>
        </header>

        {error ? <div className="operator-alert operator-alert--error">{error}</div> : null}
        {notice ? <div className="operator-alert">{notice}</div> : null}

        <section className="operator-table-card">
          <div className="sketch-doctors sketch-doctors--top" ref={doctorsSectionRef}>
            {visibleDoctorRoles.map((role) => {
              const completed = isDoctorCompleted(role.code);
              return (
                <button
                  key={role.code}
                  type="button"
                  className={completed ? "doctor-pill doctor-pill--completed" : "doctor-pill"}
                  onClick={() => openDoctorExam(role)}
                  title={selectedClient ? `Открыть заключение: ${role.name}` : "Сначала выберите клиента"}
                >
                  <span>{completed ? "✓ " : ""}{role.name}</span>
                </button>
              );
            })}
          </div>

          <div className="operator-search">
            <input
              ref={searchInputRef}
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="поиск"
            />
            <button type="button" onClick={() => void loadClients(search)}>
              Найти
            </button>
            <button type="button" onClick={startCreate}>
              Добавить
            </button>
            <span>
              {loading
                ? "Идет поиск..."
                : `Показано: ${visibleClients.length}${activeColumnFilterCount ? ` из ${clients.length}` : ""}`}
            </span>
            {activeColumnFilterCount || sortConfig ? (
              <button type="button" onClick={clearColumnFilters}>
                Сбросить фильтры
              </button>
            ) : null}
          </div>

          <div className="sketch-table sketch-table--excel" style={columnStyle}>
            <div className="sketch-table__grid sketch-table__grid--head">
              {columns.map((column) => {
                const sortMark = sortConfig?.key === column.key ? (sortConfig.direction === "asc" ? "↑" : "↓") : "";
                return (
                <span key={column.key} className="sketch-head-cell sketch-head-cell--resizable">
                  <button
                    className="sketch-head-sort"
                    type="button"
                    title={`Сортировать: ${column.label}`}
                    aria-label={`Сортировать столбец ${column.label}`}
                    onClick={() => toggleColumnSort(column.key)}
                  >
                    <span>{column.label}</span>
                    <span className="sketch-head-sort__mark">{sortMark}</span>
                  </button>
                  <button
                    className="col-resize-handle"
                    type="button"
                    aria-label={`Изменить ширину столбца ${column.label}`}
                    onMouseDown={(event) => startColumnResize(column.key, event)}
                  />
                </span>
                );
              })}
            </div>

            <div className="sketch-table__grid sketch-table__grid--filters">
              {columns.map((column) => (
                <span key={column.key} className="sketch-filter-cell">
                  <input
                    type={column.key === "encounterDate" ? "date" : "text"}
                    value={columnFilters[column.key]}
                    onChange={(event) => updateColumnFilter(column.key, event.target.value)}
                    placeholder="фильтр"
                    aria-label={`Фильтр столбца ${column.label}`}
                  />
                </span>
              ))}
            </div>

              {visibleClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  className={
                    client.id === selectedClientId
                      ? "sketch-table__grid sketch-table__grid--row sketch-table__grid--active"
                      : "sketch-table__grid sketch-table__grid--row"
                  }
                  onClick={() => {
                    setSelectedClientId(client.id);
                    setIsEditingClient(false);
                  }}
                >
                  <span>{client.patient_number}</span>
                  <span>{formatDate(client.encounter_date_text) || client.encounter_date_text || ""}</span>
                  <span>{fullName(client)}</span>
                  <span>{formatDate(client.birth_date)}</span>
                  <span>{client.registration_text || client.address_text || "-"}</span>
                  <span title={displayValue(resolveAdmissionCategory(client))}>{displayTableValue(resolveAdmissionCategory(client))}</span>
                  <span>{client.reference_number || ""}</span>
                  <span title={client.doctor_gynecologist || ""}>{renderDoctorMark(client.doctor_gynecologist)}</span>
                  <span title={client.doctor_stomatologist || ""}>{renderDoctorMark(client.doctor_stomatologist)}</span>
                  <span title={client.doctor_dermatologist || ""}>{renderDoctorMark(client.doctor_dermatologist)}</span>
                  <span title={client.doctor_neurologist || ""}>{renderDoctorMark(client.doctor_neurologist)}</span>
                  <span title={client.doctor_surgeon || ""}>{renderDoctorMark(client.doctor_surgeon)}</span>
                  <span title={client.doctor_otolaryngologist || ""}>{renderDoctorMark(client.doctor_otolaryngologist)}</span>
                  <span title={client.doctor_ophthalmologist || ""}>{renderDoctorMark(client.doctor_ophthalmologist)}</span>
                  <span title={client.doctor_therapist || ""}>{renderDoctorMark(client.doctor_therapist)}</span>
                  <span title={client.doctor_psychiatrist || ""}>{renderDoctorMark(client.doctor_psychiatrist)}</span>
                  <span title={client.doctor_infectionist || ""}>{renderDoctorMark(client.doctor_infectionist)}</span>
                  <span title={client.doctor_phthisiatrician || ""}>{renderDoctorMark(client.doctor_phthisiatrician)}</span>
                  <span title={client.doctor_uzist || ""}>{renderDoctorMark(client.doctor_uzist)}</span>
                  <span>{client.notes || ""}</span>
                  <span>{client.card_number || client.patient_number}</span>
                  <span>{client.no_number || ""}</span>
                  <span>{client.flg || ""}</span>
                  <span>{client.organization || ""}</span>
                  <span>{client.mkb10 || ""}</span>
                  <span>{client.real_date_text || ""}</span>
                </button>
              ))}

              {!loading && clients.length === 0 && search.trim() ? (
                <div className="operator-empty">Клиент не найден. Нажмите “Добавить”, ФИО подтянется из поиска.</div>
              ) : null}
              {!loading && clients.length === 0 && !search.trim() ? (
                <div className="operator-empty">Клиентов пока нет. Добавьте первого пациента или импортируйте старую базу.</div>
              ) : null}
              {!loading && clients.length > 0 && visibleClients.length === 0 ? (
                <div className="operator-empty">По фильтрам в столбцах ничего не найдено.</div>
              ) : null}
          </div>
        </section>

        <section className="operator-bottom">
          <form className="client-work-card" onSubmit={saveClient} onKeyDown={focusNextFormField}>
            <div className="work-card__head">
              <h2>{isEditingClient ? "Информация о клиенте" : "Информация о клиенте"}</h2>
              <div className="work-card__actions">
                {selectedClient ? (
                  <button type="button" onClick={startEdit}>
                    Изменить
                  </button>
                ) : null}
                {selectedClient ? (
                  <button type="button" onClick={() => void deleteSelectedClient()} disabled={deletingClient}>
                    {deletingClient ? "Удаляю..." : "Удалить"}
                  </button>
                ) : null}
                {isEditingClient ? (
                  <button type="button" onClick={cancelEdit}>
                    Отмена
                  </button>
                ) : null}
                <button type="submit" disabled={saving || !isEditingClient}>
                  {saving ? "Сохраняю..." : "Сохранить"}
                </button>
              </div>
            </div>

            <div className="client-summary-grid">
              <div>
                <span>№ пациента</span>
                <strong>{selectedClient ? selectedClient.patient_number : "не выбран"}</strong>
              </div>
              <div>
                <span>ФИО</span>
                <strong>{selectedClient ? fullName(selectedClient) : "найдите клиента сверху"}</strong>
              </div>
              <div>
                <span>Дата рождения</span>
                <strong>{selectedClient ? formatDate(selectedClient.birth_date) : "не указано"}</strong>
              </div>
              <div>
                <span>Категории</span>
                <strong>{displayValue(resolveAdmissionCategory(selectedClient))}</strong>
              </div>
              <div className="client-summary-grid__wide">
                <span>Регистрация</span>
                <strong>{displayValue(selectedClient?.registration_text || selectedClient?.address_text)}</strong>
              </div>
              <div>
                <span>Организация</span>
                <strong>{displayValue(selectedClient?.organization)}</strong>
              </div>
              <div>
                <span>Место работы</span>
                <strong>{displayValue(selectedClient?.work_place)}</strong>
              </div>
              <div>
                <span>Профессия</span>
                <strong>{displayValue(selectedClient?.profession)}</strong>
              </div>
              <div>
                <span>МКБ10</span>
                <strong>{displayValue(selectedClient?.mkb10)}</strong>
              </div>
              <div className="client-summary-grid__wide">
                <span>Примечание</span>
                <strong>{displayValue(selectedClient?.notes)}</strong>
              </div>
            </div>

            <div className="client-form-grid">
              <label>
                Фамилия
                <input value={clientForm.last_name} onChange={(e) => setClientForm({ ...clientForm, last_name: e.target.value })} disabled={!isEditingClient} required />
              </label>
              <label>
                Имя
                <input value={clientForm.first_name} onChange={(e) => setClientForm({ ...clientForm, first_name: e.target.value })} disabled={!isEditingClient} required />
              </label>
              <label>
                Отчество
                <input value={clientForm.middle_name ?? ""} onChange={(e) => setClientForm({ ...clientForm, middle_name: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Дата рождения
                <input type="date" value={clientForm.birth_date} onChange={(e) => setClientForm({ ...clientForm, birth_date: e.target.value })} disabled={!isEditingClient} required />
              </label>
              <label>
                Телефон
                <input value={clientForm.phone ?? ""} onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                СНИЛС
                <input value={clientForm.snils ?? ""} onChange={(e) => setClientForm({ ...clientForm, snils: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Тип документа
                <input value={clientForm.document_type ?? ""} onChange={(e) => setClientForm({ ...clientForm, document_type: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Серия паспорта
                <input value={clientForm.document_series ?? ""} onChange={(e) => setClientForm({ ...clientForm, document_series: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Номер паспорта
                <input value={clientForm.document_number ?? ""} onChange={(e) => setClientForm({ ...clientForm, document_number: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Дата выдачи
                <input type="date" value={clientForm.document_issued_date ?? ""} onChange={(e) => setClientForm({ ...clientForm, document_issued_date: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label className="client-form-grid__wide">
                Кем выдан
                <input value={clientForm.document_issued_by ?? ""} onChange={(e) => setClientForm({ ...clientForm, document_issued_by: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Полис
                <input value={clientForm.oms_policy ?? ""} onChange={(e) => setClientForm({ ...clientForm, oms_policy: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label className="client-form-grid__wide">
                Регистрация
                <input value={clientForm.address_text ?? ""} onChange={(e) => setClientForm({ ...clientForm, address_text: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Профессия
                <input value={clientForm.profession ?? ""} onChange={(e) => setClientForm({ ...clientForm, profession: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Место работы
                <input value={clientForm.work_place ?? ""} onChange={(e) => setClientForm({ ...clientForm, work_place: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label>
                Организация
                <input value={clientForm.organization ?? ""} onChange={(e) => setClientForm({ ...clientForm, organization: e.target.value })} disabled={!isEditingClient} />
              </label>
              <label className="client-form-grid__wide">
                Комментарий
                <textarea value={clientForm.notes ?? ""} onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })} disabled={!isEditingClient} />
              </label>
            </div>
          </form>

          <section className="visit-work-card" ref={servicesSectionRef}>
            <div className="work-card__head">
              <h2>Оформление обращения</h2>
              <strong>{selectedClient ? fullName(selectedClient) : "Клиент не выбран"} • услуг: {services.length}</strong>
            </div>

            <div className="visit-print-bar">
              <div className="visit-print-bar__text">
                <strong>Амбулаторная карта</strong>
                <span>
                  {latestEncounter
                    ? `Для обращения № ${latestEncounter.id} от ${formatDate(latestEncounter.encounter_date)}`
                    : "Будет сформирована по карточке клиента без выбранного обращения"}
                </span>
              </div>
              <div className="visit-print-bar__actions">
                <button className="secondary-action" type="button" disabled={!selectedClient} onClick={openCertificatePrintDialog}>
                  Печать
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  disabled={!selectedClient || downloadingDocument}
                  onClick={() => void downloadAmbulatoryCard()}
                >
                  {downloadingDocument ? "Формирую Excel..." : "Скачать Excel"}
                </button>
              </div>
            </div>

            <div className="visit-controls">
              <label>
                Дата
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </label>
              <label>
                Оплата
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  <option value="cash">Наличные</option>
                  <option value="card">Карта</option>
                  <option value="invoice">Безнал</option>
                </select>
              </label>
              <label>
                Сумма
                <input value={totalAmount.toFixed(2)} readOnly />
              </label>
            </div>

            <div className="services-picker">
              {services.length === 0 ? (
                <div className="services-empty">Услуги не загрузились. Проверьте, что backend запущен на 8000.</div>
              ) : null}
              {services.map((service) => (
                <label key={service.id} className={selectedServiceIds.includes(service.id) ? "service-pill service-pill--active" : "service-pill"}>
                  <input
                    type="checkbox"
                    checked={selectedServiceIds.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                  />
                  <span>{service.name}</span>
                  {selectedServiceIds.includes(service.id) ? <span className="service-pill__remove" aria-hidden="true">×</span> : null}
                  <strong>{service.price}</strong>
                </label>
              ))}
            </div>

            <textarea
              className="visit-comment"
              placeholder="Комментарий к обращению"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="visit-actions">
              <button className="primary-action" type="button" disabled={saving} onClick={() => void createVisit()}>
                {saving ? "Оформляю..." : "Оформить обращение"}
              </button>
              <button className="secondary-action" type="button" disabled={!selectedClient} onClick={downloadDemoDocument}>
                Сформировать справку
              </button>
            </div>
          </section>
        </section>
      </main>

      {activeDoctorRole ? (
        <div className="doctor-exam-modal" role="presentation" onClick={closeDoctorExamDialog}>
          <section
            className="doctor-exam-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-exam-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="doctor-exam-dialog__head">
              <div>
                <span>Врачебное заключение</span>
                <h2 id="doctor-exam-title">{activeDoctorRole.name}</h2>
                <p>{selectedClient ? fullName(selectedClient) : "Клиент не выбран"}</p>
              </div>
              <button type="button" aria-label="Закрыть" onClick={closeDoctorExamDialog} disabled={saving}>
                ×
              </button>
            </div>

            <div className="doctor-exam-form">
              <label>
                Врач / исполнитель
                <input
                  value={doctorExamForm.doctor_name}
                  onChange={(event) => setDoctorExamForm((current) => ({ ...current, doctor_name: event.target.value }))}
                />
              </label>
              <label>
                Диагноз / МКБ10
                <input
                  value={doctorExamForm.diagnosis}
                  onChange={(event) => setDoctorExamForm((current) => ({ ...current, diagnosis: event.target.value }))}
                  placeholder="при необходимости"
                />
              </label>
              <label className="doctor-exam-form__wide">
                Заключение
                <textarea
                  value={doctorExamForm.result_text}
                  onChange={(event) => setDoctorExamForm((current) => ({ ...current, result_text: event.target.value }))}
                />
              </label>
              <label className="doctor-exam-form__wide">
                Комментарий
                <textarea
                  value={doctorExamForm.comment}
                  onChange={(event) => setDoctorExamForm((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="можно оставить пустым"
                />
              </label>
              <label className="doctor-exam-check">
                <input
                  type="checkbox"
                  checked={doctorExamForm.is_completed}
                  onChange={(event) => setDoctorExamForm((current) => ({ ...current, is_completed: event.target.checked }))}
                />
                <span>Осмотр пройден — поставить галочку в общей таблице</span>
              </label>
            </div>

            <div className="doctor-exam-actions">
              <button type="button" onClick={closeDoctorExamDialog} disabled={saving}>
                Отмена
              </button>
              <button type="button" onClick={() => void saveDoctorExam()} disabled={saving}>
                {saving ? "Сохраняю..." : "Сохранить заключение"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {certificatePrintOpen ? (
        <div className="certificate-print-modal" role="presentation" onClick={closeCertificatePrintDialog}>
          <section
            className="certificate-print-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="certificate-print-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="certificate-print-dialog__head">
              <div>
                <span>Печать результатов</span>
                <h2 id="certificate-print-title">{fullName(selectedClient)}</h2>
              </div>
              <button type="button" aria-label="Закрыть" onClick={closeCertificatePrintDialog} disabled={printing}>
                ×
              </button>
            </div>

            <div className="certificate-print-person">
              <strong>{fullName(selectedClient)}</strong>
            </div>

            <div className="certificate-print-form">
              <label className="certificate-print-form__wide">
                <span>Укажите серию и номер бланка</span>
                <div className="certificate-series-picker">
                  <button
                    className="certificate-series-picker__field"
                    type="button"
                    onClick={() => setCertificatePickerOpen(true)}
                  >
                    <span>{certificateSeries || "серия"}</span>
                    <strong>{selectedCertificateMeta.title}</strong>
                  </button>
                  <input
                    value={certificateNumber}
                    readOnly
                    placeholder="номер"
                  />
                  {certificatePickerOpen ? (
                    <div className="certificate-service-list">
                      {certificateKinds.map((item) => {
                        const template = certificateTemplates[item.kind];
                        return (
                          <button
                            key={item.kind}
                            type="button"
                            className={item.kind === certificateKind ? "certificate-service-list__item certificate-service-list__item--active" : "certificate-service-list__item"}
                            onClick={() => {
                              setCertificateKind(item.kind);
                              setCertificatePickerOpen(false);
                              setCertificatePrintError("");
                              setCertificatePrintMessage("");
                            }}
                          >
                            <span>{item.title}</span>
                            <small>{template ? item.description : "шаблон не найден"}</small>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <button type="button" disabled={certificateBlankLoading || !certificateSeries} onClick={() => void findCertificateBlankNumber()}>
                    {certificateBlankLoading ? "Ищу..." : "Найти номер"}
                  </button>
                </div>
              </label>

              <label>
                <span>Серия</span>
                <button className="certificate-input-button" type="button" onClick={() => setCertificatePickerOpen(true)}>
                  {certificateSeries || "086"}
                </button>
              </label>
              <label>
                <span>Номер</span>
                <input value={certificateNumber} readOnly />
              </label>
              <label>
                <span>Дата</span>
                <input type="date" value={certificateDate} onChange={(event) => setCertificateDate(event.target.value)} />
              </label>
            </div>

            <div className="certificate-print-actions certificate-print-actions--grid">
              <button type="button" disabled={printing || !ambulatoryTemplate || !certificateNumber} onClick={() => void printSelectedCertificate("driver_front")}>
                {printing ? "Печатаю..." : "Печатать лицевую часть"}
              </button>
              <button type="button" disabled={printing || !ambulatoryTemplate || !certificateNumber} onClick={() => void printSelectedCertificate("driver_back")}>
                Печатать оборот
              </button>
              <button type="button" disabled={printing || !ambulatoryTemplate || !certificateNumber} onClick={() => void printSelectedCertificate("tractor_front")}>
                Лицевая трактора
              </button>
              <button type="button" disabled={printing || !ambulatoryTemplate || !certificateNumber} onClick={() => void printSelectedCertificate("tractor_back")}>
                Оборот трактора
              </button>
              <button type="button" onClick={closeCertificatePrintDialog} disabled={printing}>
                Отмена
              </button>
            </div>

            {!ambulatoryTemplate ? (
              <div className="certificate-print-alert certificate-print-alert--error">
                Шаблон {selectedCertificateMeta.title} не найден. Проверьте реестр шаблонов.
              </div>
            ) : null}
            {certificatePrintError ? <div className="certificate-print-alert certificate-print-alert--error">{certificatePrintError}</div> : null}
            {certificatePrintMessage ? <div className="certificate-print-alert">{certificatePrintMessage}</div> : null}
          </section>
        </div>
      ) : null}
      {certificatePickerOpen ? (
        <div className="certificate-series-modal" role="presentation" onClick={() => setCertificatePickerOpen(false)}>
          <section className="certificate-series-dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="certificate-series-dialog__head">
              <strong>Введите строку или выберите из имеющихся</strong>
              <button type="button" onClick={() => setCertificatePickerOpen(false)} aria-label="Закрыть">
                ×
              </button>
            </div>
            <div className="certificate-series-dialog__top">
              <input
                value={certificateSeriesSearch}
                onChange={(event) => setCertificateSeriesSearch(event.target.value)}
                autoFocus
              />
              <button type="button" onClick={() => selectCertificateSeries(certificateSeriesSearch || certificateSeries)}>
                OK
              </button>
            </div>
            <div className="certificate-series-dialog__list">
              {filteredCertificateSeriesChoices.map((series) => (
                <button
                  key={series}
                  type="button"
                  className={series === certificateSeries ? "certificate-series-dialog__item certificate-series-dialog__item--active" : "certificate-series-dialog__item"}
                  onClick={() => setCertificateSeriesSearch(series)}
                  onDoubleClick={() => selectCertificateSeries(series)}
                >
                  {series}
                </button>
              ))}
            </div>
            <div className="certificate-series-dialog__selected">{certificateSeriesSearch || certificateSeries}</div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
