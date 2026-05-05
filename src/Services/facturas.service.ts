import { API_HOST } from "../config/api";

const headers = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
  "ngrok-skip-browser-warning": "true",
});

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(String(data.message || "Error al obtener facturas"));
  }
  return data;
}

export interface GetFacturasParams {
  page?: number;
  pageSize?: number;
  estado?: string;
}

export interface FacturasListResponse {
  items: Record<string, unknown>[];
  total?: number;
  pagination?: unknown;
}

export const getFacturas = async (
  token: string,
  opts: GetFacturasParams = {},
): Promise<FacturasListResponse> => {
  const { page = 1, pageSize = 20, estado } = opts;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (estado) params.set("estado", estado);

  const response = await fetch(`${API_HOST}/facturas?${params}`, {
    method: "GET",
    headers: headers(token),
  });

  if (response.status === 404 || response.status === 501) {
    return { items: [], total: 0, pagination: { page: 1, pageSize, total: 0 } };
  }

  const raw = await parseResponse(response);
  const parsed = raw as Partial<FacturasListResponse>;
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    total: typeof parsed.total === "number" ? parsed.total : undefined,
    pagination: parsed.pagination,
  };
};
