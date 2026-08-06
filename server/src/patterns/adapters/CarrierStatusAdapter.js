/**
 * Adapter Pattern — Carrier status
 * Chuyển mã trạng thái của đơn vị vận chuyển bên ngoài → trạng thái nội bộ TechPhone.
 *
 * @see docs/design-patterns/HUONG-DAN-TRINH-BAY.md — mục 4 (Adapter — GHN)
 */
export class CarrierStatusAdapter {
  /** @returns {string} provider key, e.g. 'ghn' */
  get provider() {
    throw new Error('CarrierStatusAdapter.provider must be implemented');
  }

  /**
   * @param {string} carrierStatus
   * @returns {string|null} internal order status or null if unknown
   */
  toOrderStatus(_carrierStatus) {
    throw new Error('CarrierStatusAdapter.toOrderStatus must be implemented');
  }

  /** @param {string} carrierStatus */
  toLabel(carrierStatus) {
    return String(carrierStatus || '');
  }
}
