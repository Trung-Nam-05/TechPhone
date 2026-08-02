import { CarrierStatusAdapter } from './CarrierStatusAdapter.js';

/** Adapter GHN Open API → order.status nội bộ TechPhone */
export class GhnStatusAdapter extends CarrierStatusAdapter {
  get provider() {
    return 'ghn';
  }

  toOrderStatus(ghnStatus) {
    const s = String(ghnStatus || '').toLowerCase().trim();
    if (!s) return null;
    if (['cancel', 'cancelled', 'canceled'].includes(s)) return 'cancelled';
    if (['ready_to_pick', 'picking'].includes(s)) return 'await_pickup';
    if (['picked', 'storing'].includes(s)) return 'picked';
    if (['transporting', 'delivering'].includes(s)) return 'shipping';
    if (['delivered'].includes(s)) return 'completed';
    if (['delivery_fail'].includes(s)) return 'delivery_failed';
    if (['waiting_to_return', 'return', 'returned', 'return_transporting'].includes(s)) return 'returned';
    return null;
  }

  toLabel(status) {
    const labels = {
      ready_to_pick: 'Sẵn sàng lấy hàng',
      picking: 'Đang lấy hàng',
      picked: 'Đã lấy hàng',
      storing: 'Đang nhập kho',
      transporting: 'Đang vận chuyển',
      delivering: 'Đang giao hàng',
      delivered: 'Giao thành công',
      delivery_fail: 'Giao thất bại',
      waiting_to_return: 'Chờ hoàn hàng',
      return: 'Đang hoàn hàng',
      returned: 'Đã hoàn hàng',
      cancel: 'Đã hủy',
      cancelled: 'Đã hủy',
    };
    return labels[String(status || '').toLowerCase()] || String(status || 'GHN');
  }
}

export const ghnStatusAdapter = new GhnStatusAdapter();
