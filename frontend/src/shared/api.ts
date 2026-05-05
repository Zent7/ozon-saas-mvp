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
  legacy_payload_json?: Record<string, unknown> | null;
};

export type ClientPayload = Omit<Client, "id" | "patient_number">;

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
  is_active: boolean;
};

export type DocumentGeneratePayload = {
  template_id?: number | null;
  template_code?: string | null;
  client_id: number;
  encounter_id?: number | null;
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
    const parsed = JSON.parse(message) as { detail?: string };
    return parsed.detail ?? message;
  } catch {
    return message;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
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

  return (await response.json()) as T;
}

export const api = {
  login: (payload: LoginPayload) => request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getStaffRoles: () => request<StaffRole[]>("/staff/roles"),
  getStaffUsers: () => request<StaffUser[]>("/staff"),
  createStaffUser: (payload: StaffUserCreatePayload) =>
    request<StaffUser>("/staff", { method: "POST", body: JSON.stringify(payload) }),
  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),
  getClients: (search = "", limit = 25) =>
    request<Client[]>(`/clients?limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ""}`),
  createClient: (payload: ClientPayload) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(payload) }),
  updateClient: (clientId: number, payload: ClientPayload) =>
    request<Client>(`/clients/${clientId}`, { method: "PUT", body: JSON.stringify(payload) }),
  getEncounters: (clientId?: number) =>
    request<Encounter[]>(`/encounters${clientId ? `?client_id=${clientId}` : ""}`),
  createEncounter: (payload: Omit<Encounter, "id" | "status">) =>
    request<Encounter>("/encounters", { method: "POST", body: JSON.stringify(payload) }),
  createEncounterService: (payload: EncounterServicePayload) =>
    request<EncounterService>("/encounter-services", { method: "POST", body: JSON.stringify(payload) }),
  getServices: () => request<Service[]>("/services"),
  getRecalls: () => request<Recall[]>("/recalls"),
  getTemplates: () => request<DocumentTemplate[]>("/documents/templates"),
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
