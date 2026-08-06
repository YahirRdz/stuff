export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000000",
  email: "demo@boda.test",
};
