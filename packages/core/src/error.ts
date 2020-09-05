import { GraphQLError } from 'graphql';

export class BenzeneError extends GraphQLError {
  constructor(
    message: string,
    code?: string,
    extensions?: { [key: string]: any } | null
  ) {
    if (code) (extensions = extensions || {}).code = code;
    super(
      message,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      extensions
    );
  }
}

export class BenzeneHTTPError extends BenzeneError {
  status: number;
  constructor(
    status: number,
    message: string,
    code?: string,
    extensions?: { [key: string]: any } | null
  ) {
    super(message, code, extensions);
    this.status = status;
  }
}
