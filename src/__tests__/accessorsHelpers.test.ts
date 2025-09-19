import { describe, it, expect } from 'vitest';
import { accessorsToObject, arrayToAccessor } from '../lib/accessorsHelpers';

describe('accessorsHelpers', () => {
  it('arrayToAccessor builds correct paths', () => {
    expect(arrayToAccessor(['user', 'address', 0, 'street'])).toBe('user.address[0].street');
    expect(arrayToAccessor(['items', 3, 'name'])).toBe('items[3].name');
  });

  it('accessorsToObject parses flat accessors into nested object/array structure', () => {
    const flat = {
      'user.name': 'John',
      'user.address[0].street': 'Main St',
      'user.address[0].zip': '12345',
      'user.address[1].street': 'Second St',
      'user.address[1].zip': '54321',
      'tags[0]': 'a',
      'tags[1]': 'b'
    };

    const nested = accessorsToObject(flat) as any;

    expect(nested).toEqual({
      user: {
        name: 'John',
        address: [
          { street: 'Main St', zip: '12345' },
          { street: 'Second St', zip: '54321' }
        ]
      },
      tags: ['a', 'b']
    });
  });
});
