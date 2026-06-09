export type PolishStyle = "fluent" | "professional" | "concise" | "casual" | "academic";

export interface PolishRequest {
  text: string;
  style: PolishStyle;
  locale?: "zh-CN" | "en-US";
  noteId?: string;
}

export interface PolishResponse {
  polishedText: string;
  style: PolishStyle;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface AiErrorResponse {
  error:
    | string
    | {
        code?: string;
        message: string;
      };
}
