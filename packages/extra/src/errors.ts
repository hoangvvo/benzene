import { GraphQLError } from "graphql";

export class HTTPError extends GraphQLError {
  public status: number;
  constructor(
    status: number,
    message: string,
    extensions?: GraphQLError["extensions"]
  ) {
    if (status < 100 || status > 599) {
      throw new RangeError("HTTP status code must be between 100 and 599");
    }
    super(
      message,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      extensions
    );
    this.status = status;
  }
}
