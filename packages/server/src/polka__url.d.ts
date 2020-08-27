declare module '@polka/url' {
  import { IncomingMessage } from 'http';
  export default function (
    req: IncomingMessage,
    toDecode: true
  ): {
    path: string;
    pathname: string;
    search: string | null;
    query: { [key: string]: string } | null;
    href: string;
    _raw: string;
  };
}
