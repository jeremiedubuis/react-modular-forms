import { describe, it, expect } from 'vitest';
import { accessorsToObject, arrayToAccessor } from '../lib/accessorsHelpers';

describe('accessorsHelpers', () => {
  it.each([
    '__proto__.polluted',
    'user.__proto__.polluted',
    'items[0].__proto__.polluted',
    'constructor.prototype.polluted',
    'user.constructor.prototype.polluted',
    'prototype.polluted'
  ])('rejects unsafe path %s without changing prototypes', (name) => {
    expect(() => accessorsToObject({ [name]: 'yes' })).toThrow('Unsafe accessor');
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(Array.prototype).not.toHaveProperty('polluted');
  });

  it('does not traverse inherited properties', () => {
    expect(accessorsToObject({ 'toString.description': 'safe' })).toEqual({
      toString: { description: 'safe' }
    });
    expect(Object.prototype.toString).not.toHaveProperty('description');
  });

  it.each(['', '.', 'user..name', 'user[bad]', '.user', '[0].name', 'a[0]b', 'a[0]1'])(
    'rejects malformed path %s',
    (name) => {
      expect(() => accessorsToObject({ [name]: 'value' })).toThrow('Invalid accessor');
    }
  );

  it('allows constructor and prototype as leaf keys without traversing them', () => {
    expect(
      accessorsToObject({
        constructor: 'root',
        'item.constructor': 'widget',
        'item.prototype': 'draft'
      })
    ).toEqual({ constructor: 'root', item: { constructor: 'widget', prototype: 'draft' } });
  });

  it('rejects traversal through own prototype references', () => {
    const holder = { prototype: Object.prototype };
    expect(() => accessorsToObject({ holder, 'holder.prototype.polluted': 'yes' })).toThrow(
      'Unsafe accessor'
    );
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

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
