export class AppError extends Error {
  constructor(
    public code: string,
    public override message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
  }
}

export const ErrorCodes = {
  // Auth
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  UNAUTHORIZED: "UNAUTHORIZED",

  // General
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
} as const;
