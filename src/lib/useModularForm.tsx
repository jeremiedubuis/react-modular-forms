import React, { useId, useMemo, useRef } from 'react';
import { ModularForm } from './ModularForm';
import { ModularFormField } from './ModularFormField';
import type { ModularFormFieldProps, ModularFormProps, FormValues } from './types';
import type { ValuesFromFieldsArray, FieldNames } from './types';
import type { FormStore } from './FormStore';
import { config } from './config';

const WrapFieldContext = React.createContext<
  | ((field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement)
  | null
  | undefined
>(undefined);

// For the array API we REQUIRE each element to have a `name: string` so we can infer keys.
export type NamedField = ModularFormFieldProps<any> & { name: string };

type ExplicitFieldIds<T extends readonly NamedField[]> = Extract<T[number], { id: string }>['id'];

type HasFieldWithoutExplicitId<T extends readonly NamedField[]> = Extract<
  T[number],
  { id?: undefined }
> extends never
  ? false
  : true;

type BuildableFieldId<T extends readonly NamedField[]> = [ExplicitFieldIds<T>] extends [never]
  ? string
  : HasFieldWithoutExplicitId<T> extends true
  ? ExplicitFieldIds<T> | string
  : ExplicitFieldIds<T>;

export type { ValuesFromFieldsArray };

export interface UseModularFormReturn<
  TFields extends readonly NamedField[],
  TValues extends FormValues
> {
  /**
   * A `ModularForm` component instance bound to the generated `formId`.
   * The `onSubmit` handler is strongly typed with `TValues` inferred from the provided fields.
   *
   * Example:
   * const { ModularForm, build } = useModularForm([
   *   { name: 'age', type: 'text', coerceType: 'int', validation: { required: true } },
   *   { name: 'nickname', type: 'text' }
   * ] as const);
   *
   * <ModularForm onSubmit={(e, data) => {
   *   // data.age is number, data.nickname?: string | undefined
   * }}/>
   */
  ModularForm: React.ForwardRefExoticComponent<
    Omit<ModularFormProps<TValues>, 'id'> & React.RefAttributes<FormStore<TValues>>
  >;
  build: <K extends FieldNames<TFields>>(
    name: K,
    overrides?: Partial<ModularFormFieldProps>,
    options?: {
      wrap?: (field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement;
    }
  ) => React.ReactElement;
  buildById: <K extends BuildableFieldId<TFields>>(
    id: K,
    overrides?: Partial<ModularFormFieldProps>,
    options?: {
      wrap?: (field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement;
    }
  ) => React.ReactElement;
  formId: string;
  fields: TFields;
  /**
   * Returns the current form values from the FormStore.
   * This is useful for accessing form values imperatively without waiting for form submission.
   */
  getFormValues: () => Partial<TValues>;
}

/** Options accepted by the `useModularForm` hook */
export interface UseModularFormOptions<ParseAccessors extends boolean = false> {
  /** Provide a custom stable id for the underlying form (otherwise an auto id is used) */
  id?: string;
  parseAccessors?: ParseAccessors;
}

/**
 * useModularForm
 * Creates a typed form binding returning:
 *  - A `ModularForm` component whose `onSubmit` second argument is strongly typed from the provided field definitions.
 *  - A `build(name)` helper to render individual fields with preserved definitions & override support.
 *
 * Basic usage:
 * const { ModularForm, build } = useModularForm([
 *   { name: 'age', type: 'text', coerceType: 'int', validation: { required: true } },
 *   { name: 'tags', type: 'text', coerceType: 'array' }
 * ] as const);
 *
 * <ModularForm onSubmit={(e, data) => {
 *   // data.age: number (required)
 *   // data.tags?: unknown[] (optional)
 * }}>
 *   {build('age')}
 *   {build('tags')}
 * </ModularForm>
 */
// Distribute value inference over a possibly union field array to produce a union of value shapes
type DistributeValuesFromFieldsArray<
  T,
  ParseAccessors extends boolean = false
> = T extends readonly NamedField[] ? ValuesFromFieldsArray<T, ParseAccessors> : never;

// Extract ParseAccessors boolean from options type
type ExtractParseAccessors<T> = T extends { parseAccessors: infer P }
  ? P extends boolean
    ? P
    : false
  : false;

export function useModularForm<
  TFieldArray extends readonly NamedField[],
  TOptions extends UseModularFormOptions<boolean> = UseModularFormOptions<false>,
  ParseAccessors extends boolean = ExtractParseAccessors<TOptions>,
  TValues extends DistributeValuesFromFieldsArray<
    TFieldArray,
    ParseAccessors
  > = DistributeValuesFromFieldsArray<TFieldArray, ParseAccessors>
>(fields: TFieldArray, options?: TOptions): UseModularFormReturn<TFieldArray, TValues> {
  const reactId = useId();
  const formId = options?.id || `mf-${reactId}`;
  const formStoreRef = useRef<FormStore<TValues> | null>(null);

  const getFieldBuildId = React.useCallback(
    (field: NamedField) => (field.id || `${formId}-${field.name}`) as string,
    [formId]
  );

  const fieldsByName = useMemo(() => {
    const map: Record<string, NamedField[]> = {};
    fields.forEach((field) => {
      if (!map[field.name]) {
        map[field.name] = [];
      }
      map[field.name].push(field);
    });
    return map;
  }, [fields]);

  const fieldsById = useMemo(() => {
    const map: Record<string, NamedField> = {};
    fields.forEach((field) => {
      map[getFieldBuildId(field)] = field;
    });
    return map;
  }, [fields, getFieldBuildId]);

  // Memoize the bound component so its identity stays stable across re-renders.
  // Without this, React sees a new component type each render and will unmount/remount
  // the form, which destroys the FormStore and resets field values.
  const ModularFormBound = useMemo(() => {
    const C = React.forwardRef<FormStore<TValues>, Omit<ModularFormProps<TValues>, 'id'>>(
      ({ children, wrapField, ...p }, ref) => {
        const ModularFormTyped = ModularForm as unknown as React.ForwardRefExoticComponent<
          ModularFormProps<TValues> & React.RefAttributes<FormStore<TValues>>
        >;

        // Create a combined ref that updates both the external ref and our internal ref
        const combinedRef = React.useCallback(
          (instance: FormStore<TValues> | null) => {
            formStoreRef.current = instance;
            if (typeof ref === 'function') {
              ref(instance);
            } else if (ref) {
              ref.current = instance;
            }
          },
          [ref]
        );

        return (
          <WrapFieldContext.Provider value={wrapField}>
            <ModularFormTyped
              parseAccessors={options?.parseAccessors}
              {...({ ...p, id: formId } as ModularFormProps<TValues>)}
              ref={combinedRef}
            >
              {children}
            </ModularFormTyped>
          </WrapFieldContext.Provider>
        );
      }
    );
    C.displayName = 'BoundModularForm';
    return C;
  }, [formId]);

  const buildFieldElement = React.useCallback(
    (
      base: NamedField,
      overrides?: Partial<ModularFormFieldProps>,
      options?: {
        wrap?: (field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement;
      }
    ) => {
      const props: any = {
        ...base,
        ...overrides,
        name: base.name,
        formId,
        id: (overrides?.id || getFieldBuildId(base)) as string
      };
      const element = <ModularFormField key={props.id} {...props} />;

      if (options?.wrap === null) return element;
      if (typeof options?.wrap === 'function') return options.wrap(element, props);

      return (
        <WrapFieldContext.Consumer>
          {(ctx) => {
            if (ctx === null) return element;
            const wrapFn = ctx || config.wrapField;
            return wrapFn ? wrapFn(element, props) : element;
          }}
        </WrapFieldContext.Consumer>
      );
    },
    [formId, getFieldBuildId]
  );

  const build = useMemo(
    () =>
      <K extends FieldNames<TFieldArray>>(
        name: K,
        overrides?: Partial<ModularFormFieldProps>,
        options?: {
          wrap?: (field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement;
        }
      ) => {
        const matches = fieldsByName[name as string] || [];
        if (matches.length === 0) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `useModularForm.build: field with name "${String(
                name
              )}" does not exist in the current form. Rendering nothing.`
            );
          }
          return <></>;
        }

        if (matches.length > 1) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `useModularForm.build: field name "${String(
                name
              )}" is ambiguous because multiple fields share that name. Use buildById(...) for checkbox or radio groups. Rendering nothing.`
            );
          }
          return <></>;
        }

        return buildFieldElement(matches[0], overrides, options);
      },
    [buildFieldElement, fieldsByName]
  );

  const buildById = useMemo(
    () =>
      <K extends BuildableFieldId<TFieldArray>>(
        id: K,
        overrides?: Partial<ModularFormFieldProps>,
        options?: {
          wrap?: (field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement;
        }
      ) => {
        const base = fieldsById[id as string];
        if (!base) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `useModularForm.buildById: field with id "${String(
                id
              )}" does not exist in the current form. Rendering nothing.`
            );
          }
          return <></>;
        }

        return buildFieldElement(base, overrides, options);
      },
    [buildFieldElement, fieldsById]
  );

  const getFormValues: () => Partial<TValues> = React.useCallback(() => {
    if (!formStoreRef.current) {
      return {};
    }
    return formStoreRef.current.getValues();
  }, []);

  return {
    ModularForm: ModularFormBound,
    build,
    buildById,
    formId,
    fields,
    getFormValues
  };
}

export default useModularForm;
