export const LEGAL_POLICY_VERSION = "2026-08-24";
export const AI_CONSENT_VERSION = "2026-08-24";

export function buildSignupConsentMetadata(aiProcessingAllowed: boolean) {
  const acceptedAt = new Date().toISOString();

  return {
    legalConsent: {
      termsAccepted: true,
      termsVersion: LEGAL_POLICY_VERSION,
      privacyAcknowledged: true,
      privacyVersion: LEGAL_POLICY_VERSION,
      minimumAgeConfirmed: true,
      acceptedAt,
      aiProcessingAllowed,
      aiConsentVersion: AI_CONSENT_VERSION,
      aiConsentUpdatedAt: acceptedAt,
      aiProviders: ["Google Gemini", "OpenAI", "ElevenLabs"],
    },
  };
}
