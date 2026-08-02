/**
 * Re-export Proxy Pattern — backward compatible với import cũ.
 * @see server/src/patterns/proxy/OrderCustomerProxy.js
 */
export {
  createCustomerOrderView,
  createCustomerOrderListView,
  sanitizeOrderForCustomer,
  sanitizeOrdersForCustomer,
} from '../patterns/proxy/OrderCustomerProxy.js';
