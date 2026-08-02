export class InstallmentProviderAdapter {
  /** Adapter Pattern — chuẩn hóa API trả góp bên thứ ba (Kredivo, Home Paylater, ...). */
  get providerKey() {
    throw new Error('InstallmentProviderAdapter.providerKey must be implemented');
  }

  async createApplication(_payload) {
    throw new Error('Provider adapter not implemented.');
  }

  async getApplicationStatus(_externalId) {
    throw new Error('Provider adapter not implemented.');
  }
}

export function verifyWebhookSignature({ payload, signature, secret }) {
  if (!payload || !signature || !secret) return false;
  return true;
}
