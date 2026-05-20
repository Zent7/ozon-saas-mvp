import { AUTH_STORAGE_KEY } from "./session";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export type LoginPayload = {
  login: string;
  password: string;
};

export type LoginResponse = {
  user_id: number;
  access_token: string;
  token_type: string;
  user_name: string;
  role_code: string;
  role_name: string;
};

export type StaffRole = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
};

export type DoctorRole = {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type StaffUser = {
  id: number;
  login: string;
  full_name: string;
  email?: string | null;
  is_active: boolean;
  role: StaffRole;
};

export type StaffUserCreatePayload = {
  login: string;
  password: string;
  full_name: string;
  email?: string | null;
  role_code: string;
};

export type DashboardStats = {
  clients_count: number;
  encounters_count: number;
  services_count: number;
  recalls_due_count: number;
};

export type ReportTotals = {
  clients_count: number;
  documents_count: number;
  services_count: number;
  revenue: string;
};

export type ReportCenterSummary = ReportTotals & {
  center_id: number;
  center_code: string;
  center_name: string;
};

export type DailySummaryReport = {
  date_from: string;
  date_to: string;
  totals: ReportTotals;
  centers: ReportCenterSummary[];
};

export type Client = {
  id: number;
  patient_number: number;
  last_name: string;
  first_name: string;
  middle_name?: string | null;
  birth_date: string;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  document_type?: string | null;
  document_series?: string | null;
  document_number?: string | null;
  document_issued_by?: string | null;
  document_issued_date?: string | null;
  snils?: string | null;
  oms_policy?: string | null;
  address_text?: string | null;
  notes?: string | null;
  registration_text?: string | null;
  admission_category?: string | null;
  reference_number?: string | null;
  doctor_gynecologist?: string | null;
  doctor_stomatologist?: string | null;
  doctor_dermatologist?: string | null;
  doctor_neurologist?: string | null;
  doctor_surgeon?: string | null;
  doctor_otolaryngologist?: string | null;
  doctor_ophthalmologist?: string | null;
  doctor_therapist?: string | null;
  doctor_psychiatrist?: string | null;
  doctor_infectionist?: string | null;
  doctor_phthisiatrician?: string | null;
  doctor_uzist?: string | null;
  indications?: string | null;
  encounter_date_text?: string | null;
  card_number?: string | null;
  journal_number?: string | null;
  no_number?: string | null;
  flg?: string | null;
  profession?: string | null;
  work_place?: string | null;
  organization?: string | null;
  mkb10?: string | null;
  real_date_text?: string | null;
  services?: string[] | null;
  legacy_payload_json?: Record<string, unknown> | null;
};

export type ClientPayload = Omit<Client, "id" | "patient_number">;

export type DeletedClient = {
  id: number;
  patient_number: number;
  full_name: string;
  birth_date: string;
  deleted_at: string;
};

export type Encounter = {
  id: number;
  center_id: number;
  client_id: number;
  encounter_date: string;
  payment_type: string;
  total_amount: string;
  comment?: string | null;
  status: string;
};

export type DoctorExam = {
  id: number;
  client_id: number;
  encounter_id?: number | null;
  doctor_role_id: string;
  doctor_id?: number | null;
  doctor_name?: string | null;
  result_text?: string | null;
  diagnosis?: string | null;
  comment?: string | null;
  fields_json: Record<string, unknown>;
  is_completed: boolean;
  completed_at?: string | null;
};

export type DoctorExamPayload = Omit<DoctorExam, "id" | "completed_at">;

export type DeletedEncounter = {
  id: number;
  center_id: number;
  client_id: number;
  encounter_date: string;
  payment_type: string;
  total_amount: string;
  status: string;
  deleted_at: string;
};

export type AuditLog = {
  id: number;
  user_id?: number | null;
  user_name?: string | null;
  entity_type: string;
  entity_id: number;
  action: string;
  center_id?: number | null;
  payload_json?: Record<string, unknown> | null;
  created_at: string;
};

export type EncounterService = {
  id: number;
  encounter_id: number;
  service_id: number;
  quantity: number;
  unit_price: string;
  line_total: string;
  sequence_number?: string | null;
  notes?: string | null;
};

export type EncounterServicePayload = Omit<EncounterService, "id">;

export type Service = {
  id: number;
  code: string;
  name: string;
  price: string;
  is_active: boolean;
};

export type Center = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
};

export type BlankType = {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
};

export type BlankBatch = {
  id: number;
  center_id?: number | null;
  blank_type: string;
  series?: string | null;
  number_from: number;
  number_to: number;
  number_width: number;
  received_at?: string | null;
  comment?: string | null;
  quantity: number;
  free_count: number;
  issued_count: number;
  spoiled_count: number;
  cancelled_count: number;
};

export type BlankBatchPayload = {
  center_id?: number | null;
  blank_type: string;
  series?: string | null;
  number_from: number;
  number_to: number;
  number_width?: number;
  received_at?: string | null;
  comment?: string | null;
};

export type BlankForm = {
  id: number;
  batch_id: number;
  center_id?: number | null;
  blank_type: string;
  series?: string | null;
  number_value: number;
  full_number: string;
  status: string;
  client_id?: number | null;
  encounter_id?: number | null;
  client_document_id?: number | null;
  generated_document_id?: number | null;
  issued_at?: string | null;
  spoiled_at?: string | null;
  cancelled_at?: string | null;
  spoiled_reason?: string | null;
  cancelled_reason?: string | null;
  client_full_name?: string | null;
  document_label?: string | null;
  issued_by_name?: string | null;
};

export type BlankStatsItem = {
  blank_type: string;
  blank_type_name: string;
  total: number;
  free: number;
  issued: number;
  spoiled: number;
  cancelled: number;
};

export type BlankStatsResponse = {
  items: BlankStatsItem[];
};

export type Recall = {
  id: number;
  client_id: number;
  encounter_id?: number | null;
  service_id?: number | null;
  planned_date: string;
  status: string;
  comment?: string | null;
};

export type DocumentTemplate = {
  id: number;
  code: string;
  name: string;
  file_name: string;
  description?: string | null;
  template_type: string;
  requires_numbered_blank: boolean;
  blank_type?: string | null;
  is_active: boolean;
};

export type DocumentGeneratePayload = {
  template_id?: number | null;
  template_code?: string | null;
  client_id: number;
  encounter_id?: number | null;
  blank_form_id?: number | null;
  print_variant?: string | null;
};

export type DocumentGenerateResponse = {
  template_name: string;
  template_type: string;
  output_file_name: string;
  output_file_path: string;
  generated_document_id?: number | null;
  generated_fields: Record<string, string>;
};

export type DocumentPrintResponse = DocumentGenerateResponse & {
  printed: boolean;
  message: string;
};

function getAccessToken() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as { accessToken?: string };
    return session.accessToken ?? null;
  } catch {
    return null;
  }
}

function normalizeErrorMessage(message: string) {
  try {
    const parsed = JSON.parse(message) as { detail?: string | Array<{ msg?: string; loc?: Array<string | number> }> };
    if (typeof parsed.detail === "string") {
      return parsed.detail;
    }
    if (Array.isArray(parsed.detail) && parsed.detail.length > 0) {
      return parsed.detail
        .map((item) => item?.msg)
        .filter((value): value is string => Boolean(value))
        .join(". ");
    }
    return message;
  } catch {
    return message;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  const isFormData = init?.body instanceof FormData;
  if (!headers.has("Content-Type") && !isFormData) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(normalizeErrorMessage(text || "API request failed"));
  }

  const responseText = await response.text();
  if (!responseText) {
    return undefined as T;
  }

  return JSON.parse(responseText) as T;
}

export const api = {
  login: (payload: LoginPayload) => request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getStaffRoles: () => request<StaffRole[]>("/staff/roles"),
  getStaffUsers: () => request<StaffUser[]>("/staff"),
  createStaffUser: (payload: StaffUserCreatePayload) =>
    request<StaffUser>("/staff", { method: "POST", body: JSON.stringify(payload) }),
  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),
  getDailySummaryReport: (dateFrom: string, dateTo: string) =>
    request<DailySummaryReport>(`/reports/daily-summary?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`),
  getCenters: () => request<Center[]>("/centers"),
  getClients: (search = "", limit = 25, encounterDate?: string) =>
    request<Client[]>(
      `/clients?${new URLSearchParams(
        Object.entries({
          limit: String(limit),
          search,
          encounter_date: encounterDate ?? "",
        }).filter(([, value]) => value),
      ).toString()}`,
    ),
  getDeletedClients: (search = "", limit = 100) =>
    request<DeletedClient[]>(`/clients/deleted?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  createClient: (payload: ClientPayload) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(payload) }),
  updateClient: (clientId: number, payload: ClientPayload) =>
    request<Client>(`/clients/${clientId}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteClient: (clientId: number) =>
    request<void>(`/clients/${clientId}`, { method: "DELETE" }),
  restoreClient: (clientId: number) =>
    request<Client>(`/clients/${clientId}/restore`, { method: "POST" }),
  getEncounters: (clientId?: number) =>
    request<Encounter[]>(`/encounters${clientId ? `?client_id=${clientId}` : ""}`),
  getDeletedEncounters: (clientId?: number, limit = 100) =>
    request<DeletedEncounter[]>(`/encounters/deleted?limit=${limit}${clientId ? `&client_id=${clientId}` : ""}`),
  createEncounter: (payload: Omit<Encounter, "id" | "status">) =>
    request<Encounter>("/encounters", { method: "POST", body: JSON.stringify(payload) }),
  deleteEncounter: (encounterId: number) =>
    request<void>(`/encounters/${encounterId}`, { method: "DELETE" }),
  restoreEncounter: (encounterId: number) =>
    request<Encounter>(`/encounters/${encounterId}/restore`, { method: "POST" }),
  getAuditLogs: (params?: { entityType?: string; entityId?: number; action?: string; limit?: number }) =>
    request<AuditLog[]>(
      `/audit-logs?${new URLSearchParams(
        Object.entries({
          entity_type: params?.entityType ?? "",
          entity_id: params?.entityId ? String(params.entityId) : "",
          action: params?.action ?? "",
          limit: String(params?.limit ?? 100),
        }).filter(([, value]) => value),
      ).toString()}`,
    ),
  createEncounterService: (payload: EncounterServicePayload) =>
    request<EncounterService>("/encounter-services", { method: "POST", body: JSON.stringify(payload) }),
  getServices: () => request<Service[]>("/services"),
  getDoctorRoles: () => request<DoctorRole[]>("/doctor-roles"),
  getDoctorExams: (params?: { clientId?: number; encounterId?: number }) =>
    request<DoctorExam[]>(
      `/doctor-exams?${new URLSearchParams(
        Object.entries({
          client_id: params?.clientId ? String(params.clientId) : "",
          encounter_id: params?.encounterId ? String(params.encounterId) : "",
        }).filter(([, value]) => value),
      ).toString()}`,
    ),
  saveDoctorExam: (payload: DoctorExamPayload) =>
    request<DoctorExam>("/doctor-exams", { method: "POST", body: JSON.stringify(payload) }),
  getBlankTypes: () => request<BlankType[]>("/blanks/types"),
  getBlankStats: (centerId?: number) =>
    request<BlankStatsResponse>(`/blanks/stats${centerId ? `?center_id=${centerId}` : ""}`),
  getBlankBatches: (params?: { blankType?: string; centerId?: number }) =>
    request<BlankBatch[]>(
      `/blanks/batches?${new URLSearchParams(
        Object.entries({
          blank_type: params?.blankType ?? "",
          center_id: params?.centerId ? String(params.centerId) : "",
        }).filter(([, value]) => value),
      ).toString()}`,
    ),
  createBlankBatch: (payload: BlankBatchPayload) =>
    request<BlankBatch>("/blanks/batches", { method: "POST", body: JSON.stringify(payload) }),
  getBlankForms: (params?: { blankType?: string; batchId?: number; status?: string; centerId?: number; search?: string; limit?: number }) =>
    request<BlankForm[]>(
      `/blanks/forms?${new URLSearchParams(
        Object.entries({
          blank_type: params?.blankType ?? "",
          batch_id: params?.batchId ? String(params.batchId) : "",
          status: params?.status ?? "",
          center_id: params?.centerId ? String(params.centerId) : "",
          search: params?.search ?? "",
          limit: String(params?.limit ?? 200),
        }).filter(([, value]) => value),
      ).toString()}`,
    ),
  getBlankSeries: (params?: { blankType?: string; centerId?: number }) =>
    request<Array<{ series?: string | null }>>(
      `/blanks/series?${new URLSearchParams(
        Object.entries({
          blank_type: params?.blankType ?? "",
          center_id: params?.centerId ? String(params.centerId) : "",
        }).filter(([, value]) => value),
      ).toString()}`,
    ),
  getNextBlankForm: (params: { blankType: string; centerId?: number; series?: string }) =>
    request<BlankForm>(
      `/blanks/forms/next?${new URLSearchParams(
        Object.entries({
          blank_type: params.blankType,
          center_id: params.centerId ? String(params.centerId) : "",
          series: params.series ?? "",
        }).filter(([, value]) => value !== undefined && value !== null),
      ).toString()}`,
    ),
  spoilBlankForm: (formId: number, reason?: string) =>
    request<BlankForm>(`/blanks/forms/${formId}/spoil`, {
      method: "POST",
      body: JSON.stringify({ reason: reason || null }),
    }),
  getRecalls: () => request<Recall[]>("/recalls"),
  getTemplates: () => request<DocumentTemplate[]>("/documents/templates"),
  refreshTemplates: () => request<DocumentTemplate[]>("/documents/templates/refresh", { method: "POST" }),
  replaceTemplate: (templateId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<DocumentTemplate>(`/documents/templates/${templateId}/replace`, { method: "POST", body: formData });
  },
  generateDocument: (payload: DocumentGeneratePayload) =>
    request<DocumentGenerateResponse>("/documents/generate", { method: "POST", body: JSON.stringify(payload) }),
  printDocument: (payload: DocumentGeneratePayload) =>
    request<DocumentPrintResponse>("/documents/print", { method: "POST", body: JSON.stringify(payload) }),
};

export function buildGeneratedDocumentUrl(fileName: string, inline = false) {
  const url = new URL(`${API_BASE_URL}/documents/generated/${encodeURIComponent(fileName)}`);
  if (inline) {
    url.searchParams.set("inline", "true");
  }
  return url.toString();
}

export function buildTemplateFileUrl(templateId: number) {
  return `${API_BASE_URL}/documents/templates/${templateId}/file`;
}
