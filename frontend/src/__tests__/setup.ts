/**
 * Test Setup
 *
 * Global setup for Vitest + React Testing Library (Next.js edition).
 */

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn();

// Mock Chart.js to avoid canvas issues in tests
vi.mock("chart.js", () => {
  const chartMock = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
  }));
  (chartMock as Record<string, unknown>).register = vi.fn();

  return {
    Chart: chartMock,
    registerables: [],
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    BarElement: vi.fn(),
    RadialLinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    Filler: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
    ArcElement: vi.fn(),
  };
});

// Mock react-chartjs-2
vi.mock("react-chartjs-2", () => ({
  Bar: () => null,
  Radar: () => null,
  Doughnut: () => null,
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock next/link
vi.mock("next/link", () => {
  const { createElement } = require("react");
  return {
    default: (props: Record<string, unknown>) => {
      return createElement("a", { ...props, href: props.href }, props.children);
    },
  };
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});
