export interface HealthResponse {
  status: string;
}

export interface PredictionRequest {
  query: string;
}

export interface PredictionResponse {
  query: string;
  response: string;
  created_at: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "/api";

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function buildApiError(response: Response, fallbackMessage: string): Promise<ApiError> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const data = (await response.json()) as { detail?: unknown; message?: unknown };
      const detail = typeof data.detail === "string" ? data.detail : undefined;
      const message = typeof data.message === "string" ? data.message : undefined;
      return new ApiError(detail || message || fallbackMessage, response.status);
    } catch {
      return new ApiError(fallbackMessage, response.status);
    }
  }

  try {
    const text = (await response.text()).trim();
    return new ApiError(text || fallbackMessage, response.status);
  } catch {
    return new ApiError(fallbackMessage, response.status);
  }
}

export async function healthCheck(): Promise<HealthResponse> {
  const response = await fetch(buildUrl("/health"));

  if (!response.ok) {
    throw await buildApiError(response, `Falha ao consultar health (${response.status})`);
  }

  return (await response.json()) as HealthResponse;
}

export async function predict(request: PredictionRequest): Promise<PredictionResponse> {
  const response = await fetch(buildUrl("/predict"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw await buildApiError(response, `Falha ao consultar predict (${response.status})`);
  }

  return (await response.json()) as PredictionResponse;
}