import { describe, it, expect, beforeEach } from 'vitest';
import { FormStore } from '../lib/FormStore';
import { ModularFieldType } from '../lib/enums';
import { config } from '../lib/config';

function registerDate(
  store: FormStore,
  { id, name, value }: { id: string; name: string; value: Date }
) {
  const ref = { current: value } as any;
  store.registerField(
    id,
    'date-picker' as unknown as ModularFieldType, // custom type string allowed at runtime
    name,
    ref,
    () => ref.current,
    {},
    () => {},
    () => {},
    () => {},
    false,
    undefined
  );
}

describe('Date value preservation', () => {
  beforeEach(() => {
    // Use mapping that triggers deep recursion to ensure we don't touch Date
    config.sendEmptyStringsAs = null as any;
  });

  it('keeps Date instances intact through getValues()', () => {
    const s = FormStore.getForm('date-keep');
    const date = new Date('2025-01-02T03:04:05Z');
    registerDate(s, { id: 'd1', name: 'when', value: date });

    const v: any = s.getValues();
    expect(v.when).toBeInstanceOf(Date);
    expect(v.when.getTime()).toBe(date.getTime());
  });
});
