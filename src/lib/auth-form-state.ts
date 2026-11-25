import { authFormConfig, type AuthFlow } from "@/lib/auth-validation";

export function createEmptyAuthFormValues(flow: AuthFlow): Record<string, string> {
  return Object.fromEntries(authFormConfig[flow].fields.map(({ name }) => [name, ""]));
}
