const API_BASE_URL = "http://localhost:8000/api/v1";

export type Client = {
  id: number;
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

export type Service = {
  id: number;
  code: string;
  name: string;
  price: string;
  is_active: boolean;
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

export type Payment = {
  id: number;
  encounter_id: number;
  payment_date: string;
  payment_type: string;
  amount: string;
  status: string;
  comment?: string | null;
};

export type ClientDocument = {
  id: number;
  client_id: number;
  document_type: string;
  series?: string | null;
  number?: string | null;
  issued_by?: string | null;
  issued_at?: string | null;
  notes?: string | null;
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
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

export const api = {
  getClients: (search = "") => request<Client[]>(`/clients${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createClient: (payload: Omit<Client, "id">) =>
    request<Client>("/clients", { method: "POST", body: JSON.stringify(payload) }),
  getEncounters: () => request<Encounter[]>("/encounters"),
  getRecalls: () => request<Recall[]>("/recalls"),
  getTemplates: () => request<DocumentTemplate[]>("/documents/templates"),
  getServices: () => request<Service[]>("/services"),
  getEncounterServices: (encounterId?: number) =>
    request<EncounterService[]>(`/encounter-services${encounterId ? `?encounter_id=${encounterId}` : ""}`),
  getPayments: (encounterId?: number) =>
    request<Payment[]>(`/payments${encounterId ? `?encounter_id=${encounterId}` : ""}`),
  getClientDocuments: (clientId?: number) =>
    request<ClientDocument[]>(`/client-documents${clientId ? `?client_id=${clientId}` : ""}`),
};
