import React from 'react';
import { expectTypeOf } from './assert';
import { FormStore, ModularForm, useModularForm } from 'react-modular-forms';

export function DirectForm() {
  const ref = React.useRef<FormStore<{ email: string }>>(null);
  return (
    <ModularForm<{ email: string }>
      id="direct"
      ref={ref}
      onSubmit={(_event, data) => {
        expectTypeOf(data.email).toEqualTypeOf<string>();
        // @ts-expect-error Unknown properties must not be accepted.
        void data.missing;
      }}
    />
  );
}

export function NestedForm() {
  const { ModularForm: Form } = useModularForm(
    [
      { name: 'user.address[0].city', type: 'text', validation: { required: true } },
      { name: 'user.address[0].zip', type: 'text', validation: { required: true } },
      { name: 'items[0].name', type: 'text', validation: { required: true } },
      { name: 'matrix[0][1]', type: 'number', coerceType: 'int', validation: { required: true } }
    ] as const,
    { parseAccessors: true, validateOnInput: true }
  );
  return (
    <Form
      onSubmit={(_event, data) => {
        expectTypeOf(data.user.address[0].city).toEqualTypeOf<string>();
        expectTypeOf(data.user.address[0].zip).toEqualTypeOf<string>();
        expectTypeOf(data.items[0].name).toEqualTypeOf<string>();
        expectTypeOf(data.matrix[0][1]).toEqualTypeOf<number>();
        // @ts-expect-error Brackets denote arrays rather than literal property names.
        void data.user['address[0]'];
      }}
    />
  );
}

export function DefaultGroupsAndSelects() {
  const { ModularForm: Form } = useModularForm([
    { id: 'a', name: 'tags', type: 'checkbox', value: 'a' },
    { id: 'b', name: 'tags', type: 'checkbox', value: 'b' },
    { name: 'selection', type: 'select', multiple: true, validation: { required: true } },
    { name: 'single', type: 'select' },
    { id: 'mixed-text', name: 'mixed', type: 'text' },
    { id: 'mixed-number', name: 'mixed', type: 'number', coerceType: 'int' }
  ] as const);
  return (
    <Form
      onSubmit={(_event, data) => {
        expectTypeOf(data.tags).toEqualTypeOf<string[] | undefined>();
        expectTypeOf(data.selection).toEqualTypeOf<string[]>();
        expectTypeOf(data.single).toEqualTypeOf<string | undefined>();
        expectTypeOf(data.mixed).toEqualTypeOf<(string | number)[] | undefined>();
      }}
    />
  );
}

export function BooleanSelects({ multiple }: { multiple: boolean }) {
  const { ModularForm: Form } = useModularForm([
    { name: 'dynamic', type: 'select', multiple, validation: { required: true } },
    { name: 'single', type: 'select', multiple: false },
    { name: 'optional', type: 'select', ...({ multiple } as { multiple?: boolean }) }
  ] as const);
  return (
    <Form
      onSubmit={(_event, data) => {
        expectTypeOf(data.dynamic).toEqualTypeOf<string | string[]>();
        expectTypeOf(data.single).toEqualTypeOf<string | undefined>();
        expectTypeOf(data.optional).toEqualTypeOf<string | string[] | undefined>();
        // @ts-expect-error A dynamic multiple select may return an array.
        data.dynamic.toUpperCase();
        if (Array.isArray(data.dynamic)) {
          expectTypeOf(data.dynamic).toEqualTypeOf<string[]>();
        } else {
          expectTypeOf(data.dynamic).toEqualTypeOf<string>();
        }
      }}
    />
  );
}

export function WidenedSelect() {
  const { ModularForm: Form } = useModularForm([
    { name: 'selection', type: 'select', multiple: true }
  ]);
  return (
    <Form
      onSubmit={(_event, data) => {
        expectTypeOf(data.selection).toEqualTypeOf<string | string[] | undefined>();
      }}
    />
  );
}

export function OptionalArrayAccessors() {
  const { ModularForm: Form } = useModularForm(
    [
      { name: 'tags[0]', type: 'text' },
      { name: 'tags[1]', type: 'text' },
      { name: 'matrix[0][1]', type: 'text' },
      { name: 'user.tags[0]', type: 'text' },
      { name: 'user.label', type: 'text' },
      { name: 'rows[0].tags[0]', type: 'text' },
      { name: 'required[0]', type: 'text', validation: { required: true } },
      { name: 'required[1]', type: 'text' }
    ] as const,
    { parseAccessors: true }
  );
  return (
    <Form
      onSubmit={(_event, data) => {
        expectTypeOf(data.tags).toEqualTypeOf<string[] | undefined>();
        expectTypeOf(data.matrix).toEqualTypeOf<string[][] | undefined>();
        expectTypeOf(data.user.tags).toEqualTypeOf<string[] | undefined>();
        expectTypeOf(data.rows[0].tags).toEqualTypeOf<string[] | undefined>();
        expectTypeOf(data.required).toEqualTypeOf<string[]>();
        const withoutOptionalFields: typeof data = { user: {}, rows: [{}], required: ['a'] };
        void withoutOptionalFields;
        // @ts-expect-error An array with a required field cannot be omitted.
        const withoutRequiredField: typeof data = { user: {}, rows: [] };
        void withoutRequiredField;
      }}
    />
  );
}
