// Mock WebSocket for testing
import { vi } from "vitest";

export const mockSend = vi.fn();
export const mockClose = vi.fn();

// Mock fetch — onopen now calls GET /projects; return empty list by default
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ projects: [] }),
}));

const mockWsInstance = {
  readyState: 1,
  send: mockSend,
  close: mockClose,
  onopen: null as ((e: Event) => void) | null,
  onclose: null as ((e: Event) => void) | null,
  onmessage: null as ((e: MessageEvent) => void) | null,
  onerror: null as ((e: Event) => void) | null,
};

export { mockWsInstance };

// Create a proper constructor function using vi.fn().mockImplementation
// with 'function' to make it work as a constructor
const MockWebSocketFn = function(this: any, _url: string) {
  return mockWsInstance;
} as any;

MockWebSocketFn.OPEN = 1;
MockWebSocketFn.CLOSED = 3;

// Use Object.defineProperty to add prototype for 'instanceof' checks
Object.defineProperty(MockWebSocketFn, 'prototype', {
  value: { constructor: MockWebSocketFn }
});

export const MockWebSocket = vi.fn(MockWebSocketFn);

vi.stubGlobal("WebSocket", MockWebSocket);