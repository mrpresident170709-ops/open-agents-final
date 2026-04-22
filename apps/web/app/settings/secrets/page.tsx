import type { Metadata } from "next";
import { SecretsSection } from "../secrets-section";

export const metadata: Metadata = {
  title: "Secrets — Settings",
  description: "Manage API keys and secrets injected into your sandboxes.",
};

export default function SecretsPage() {
  return <SecretsSection />;
}
