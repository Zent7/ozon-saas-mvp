const API_BASE_URL = "http://localhost:8000/api/v1";

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
  snils?: string | null;
  oms_policy?: string | null;
  address_text?: string | null;
  notes?: string | null;
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "API request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),
  getClients: (search = "") => request<Client[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createClient: (payload: Omit<Client, "id" | "patient_number">) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(payload) }),
  getEncounters: () => request<Encounter[]>("/encounters"),
  createEncounter: (payload: Omit<Encounter, "id" | "status">) =>
    request<Encounter>("/encounters", { method: "POST", body: JSON.stringify(payload) }),
  getServices: () => request<Service[]>("/services"),
  getRecalls: () => request<Recall[]>("/recalls"),
  getTemplates: () => request<DocumentTemplate[]>("/documents/templates"),
};
