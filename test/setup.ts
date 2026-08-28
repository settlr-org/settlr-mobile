import { vi } from "vitest";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  deleteItemAsync: vi.fn(async () => {}),
}));

vi.mock("expo-router", async () => {
  const actual = await vi.importActual("expo-router");
  return {
    ...actual,
    router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
    useFocusEffect: vi.fn((cb) => cb()),
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  };
});
