interface MessageEvent {
  data: any;
  type: string;
}

export interface WebSocketCompatible {
  protocol: string;
  send(data: string): void;
  close(code?: number | undefined, data?: string | undefined): void;
  onclose: (event: CloseEvent) => void;
  onmessage: (event: MessageEvent) => void;
}
