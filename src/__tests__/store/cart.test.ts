import type { Product } from '@/db/types';
import { useCartStore, cartTotalCentavos, cartItemCount } from '@/store/cart';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Test Product',
    price_centavos: 1000,
    cost_centavos: null,
    barcode: null,
    is_generated: 0,
    created_at: '2026-05-14T00:00:00.000',
    archived_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  useCartStore.setState({ items: [] });
});

describe('useCartStore', () => {
  it('starts with empty items', () => {
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('addItem adds a new product with quantity 1', () => {
    const product = makeProduct({ id: 1 });
    useCartStore.getState().addItem(product);
    expect(useCartStore.getState().items).toEqual([{ product, quantity: 1 }]);
  });

  it('addItem increments quantity when product already in cart', () => {
    const product = makeProduct({ id: 1 });
    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem(product);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('removeItem removes the item with the given productId', () => {
    const p1 = makeProduct({ id: 1 });
    const p2 = makeProduct({ id: 2, name: 'Other' });
    useCartStore.getState().addItem(p1);
    useCartStore.getState().addItem(p2);
    useCartStore.getState().removeItem(1);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0].product.id).toBe(2);
  });

  it('incrementItem increases quantity by 1', () => {
    const product = makeProduct({ id: 1 });
    useCartStore.getState().addItem(product);
    useCartStore.getState().incrementItem(1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('decrementItem decreases quantity by 1', () => {
    const product = makeProduct({ id: 1 });
    useCartStore.getState().addItem(product);
    useCartStore.getState().incrementItem(1);
    useCartStore.getState().decrementItem(1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('decrementItem removes item when quantity reaches 0', () => {
    const product = makeProduct({ id: 1 });
    useCartStore.getState().addItem(product);
    useCartStore.getState().decrementItem(1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('clearCart removes all items', () => {
    useCartStore.getState().addItem(makeProduct({ id: 1 }));
    useCartStore.getState().addItem(makeProduct({ id: 2, name: 'Other' }));
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe('cartTotalCentavos', () => {
  it('returns 0 for empty cart', () => {
    expect(cartTotalCentavos([])).toBe(0);
  });

  it('sums price × quantity across all items', () => {
    const items = [
      { product: makeProduct({ id: 1, price_centavos: 1500 }), quantity: 2 },
      { product: makeProduct({ id: 2, price_centavos: 2000 }), quantity: 1 },
    ];
    expect(cartTotalCentavos(items)).toBe(5000);
  });
});

describe('cartItemCount', () => {
  it('returns 0 for empty cart', () => {
    expect(cartItemCount([])).toBe(0);
  });

  it('sums quantities across all items', () => {
    const items = [
      { product: makeProduct({ id: 1 }), quantity: 3 },
      { product: makeProduct({ id: 2, name: 'Other' }), quantity: 2 },
    ];
    expect(cartItemCount(items)).toBe(5);
  });
});
