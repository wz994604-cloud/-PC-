export class SourceError extends Error {
  constructor(public readonly code: "SOURCE_TIMEOUT" | "SOURCE_UNAVAILABLE" | "INVALID_SOURCE_DATA", message: string) {
    super(message);
    this.name = "SourceError";
  }
}
