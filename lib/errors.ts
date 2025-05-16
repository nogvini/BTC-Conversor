export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class RateLimitError extends ApiError {
  constructor(apiName: string, status: number, details?: string) {
    super(
      `${apiName} API rate limit exceeded. Status: ${status}${details ? '. Details: ' + details : ''}`,
      status
    );
  }
}

export class ExternalApiError extends ApiError {
  constructor(apiName: string, message: string, status: number = 500) {
    super(`Error from ${apiName} API: ${message}`, status);
  }
}

export class DataNotFoundError extends ApiError {
  constructor(message: string = 'Requested data not found.') {
    super(message, 404);
  }
}

export class FileSystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSystemError';
  }
} 