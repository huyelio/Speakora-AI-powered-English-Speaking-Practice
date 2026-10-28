export class LearningApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}
export async function learningRequest<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/vocabulary-learning/sessions${path}`, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new LearningApiError(data.error ?? "Không thể lưu tiến độ. Vui lòng thử lại.", response.status, data.code);
  return data as T;
}
