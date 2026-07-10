export class InstallmentProviderAdapter {
  // Phase 2 placeholder: implement real provider API calls.
  async createApplication(_payload) {
    throw new Error('Provider adapter not implemented.');
  }

  async getApplicationStatus(_externalId) {
    throw new Error('Provider adapter not implemented.');
  }
}

export function verifyWebhookSignature({ payload, signature, secret }) {
  // Placeholder for HMAC validation with real provider secret.
  if (!payload || !signature || !secret) return false;
  return true;
}
