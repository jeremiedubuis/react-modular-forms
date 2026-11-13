import { describe, it, expectTypeOf } from 'vitest';
import type { ValuesFromFieldsArray } from '../lib/types';
import { ModularFieldType } from '../lib';

describe('custom same-name field handling', () => {
  it('default behavior: checkbox groups return arrays', () => {
    const fields = [
      { name: 'tags', type: ModularFieldType.Checkbox, value: 'react' },
      { name: 'tags', type: ModularFieldType.Checkbox, value: 'typescript' },
      { name: 'tags', type: ModularFieldType.Checkbox, value: 'nodejs' }
    ] as const;

    type Values = ValuesFromFieldsArray<typeof fields>;

    // Default behavior: multiple checkboxes with explicit values return string[]
    expectTypeOf<Values['tags']>().toEqualTypeOf<string[] | undefined>();
  });

  it('default behavior: checkbox groups without explicit values return boolean arrays', () => {
    const fields = [
      { name: 'options', type: ModularFieldType.Checkbox },
      { name: 'options', type: ModularFieldType.Checkbox },
      { name: 'options', type: ModularFieldType.Checkbox }
    ] as const;

    type Values = ValuesFromFieldsArray<typeof fields>;

    // Default behavior: checkboxes without values return boolean[]
    expectTypeOf<Values['options']>().toEqualTypeOf<boolean[] | undefined>();
  });

  it('default behavior: radio groups return single value', () => {
    const fields = [
      { name: 'color', type: ModularFieldType.Radio, value: 'red' },
      { name: 'color', type: ModularFieldType.Radio, value: 'blue' },
      { name: 'color', type: ModularFieldType.Radio, value: 'green' }
    ] as const;

    type Values = ValuesFromFieldsArray<typeof fields>;

    // Default behavior: radio groups return single value
    expectTypeOf<Values['color']>().toEqualTypeOf<string | undefined>();
  });

  it('required fields work correctly', () => {
    const fields = [
      {
        name: 'interests',
        type: ModularFieldType.Checkbox,
        value: 'a',
        validation: { required: true }
      },
      {
        name: 'interests',
        type: ModularFieldType.Checkbox,
        value: 'b',
        validation: { required: true }
      }
    ] as const;

    type Values = ValuesFromFieldsArray<typeof fields>;

    // Required checkbox group
    expectTypeOf<Values['interests']>().toEqualTypeOf<string[]>();
  });
});
