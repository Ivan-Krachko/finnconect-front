import { API_HOST } from "../config/api";

export interface GetMovimientosParams {
  page?: number;
  pageSize?: number;
  sentido?: string;
}

export interface MovimientosListResponse {
  items: Record<string, unknown>[];
  pagination?: unknown;
  total?: number;
}

export const getMovimientoById = async (token: string, id: number): Promise<Record<string, unknown>> => {
  const response = await fetch(`${API_HOST}/movimientos/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    throw new Error(String(data.message || "Error al obtener el movimiento"));
  }

  return data as Record<string, unknown>;
};

export const getMovimientos = async (
  token: string,
  opts: GetMovimientosParams = {},
): Promise<MovimientosListResponse> => {
  const { page = 1, pageSize = 10, sentido } = opts;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (sentido) params.set("sentido", sentido);

  const response = await fetch(`${API_HOST}/movimientos?${params}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
  });

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("La API no devolvió JSON válido");
  }

  if (!response.ok) {
    throw new Error(String(data.message || "Error al obtener movimientos"));
  }

  const parsed = data as Partial<MovimientosListResponse> & { message?: string };
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    pagination: parsed.pagination,
    total: typeof parsed.total === "number" ? parsed.total : undefined,
  };
};
