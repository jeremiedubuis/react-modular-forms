import React, { ReactNode } from 'react';
import type {
  RefObject,
  MutableRefObject,
  ComponentProps,
  ElementType,
  ChangeEvent,
  SyntheticEvent
} from 'react';
import { FieldError, ModularFieldType } from './enums';
import { FormField } from './FormField';

export type FormElementType = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type ErrorMessages = {
  [key: string]: string;
};

export type ValidationType = {
  /** Empty optional values skip custom and regular-expression validation. */
  required?: boolean;
  /**
   * If field valued doesn't match RegExp in negativeRegExps the error string will be displayed
   */
  negativeRegExps?: { [error: string]: RegExp };
  /**
   * If field valued  matches RegExp in positiveRegExps the error string will be displayed
   */
  positiveRegExps?: { [error: string]: RegExp };
  /**
   * A custom validator function, should return an error string if value isn't valid or null if it is.
   * Not called for empty optional values.
   */
  validator?: (value: unknown) => string | null;
  validateOnBlur?: boolean;
  /** Validate on each value change. Overrides config.validateOnInput. */
  validateOnInput?: boolean;
  /**
   * The group prop allows the form to validate multiple fields
   */
  group?: string;
  /**
   * groupMin tells the form how many fields in the group must be valid for the form to be submitted
   */
  groupMin?: number;
};

/**
 * Shape of values returned by a form. Can be provided by consumer code via generics.
 */
export type FormValues = Record<string, unknown>;

// Global configuration object
export type ModularFormConfiguration = {
  defaultFormMethod: 'POST' | 'GET';
  displayMultipleErrors: boolean;
  handleSameNameFieldValues: (
    name: string | (string | number)[],
    values: unknown[],
    fields: FormField[]
  ) => {
    [key: string]: unknown;
  };
  fieldClassName: string;
  labelClassName?: string;
  innerClassName?: string | ((type: string) => string | undefined);
  errorClassName: string;
  greedyValidation: boolean;
  handleSingleCheckboxAsArray: boolean;
  validateOnBlur: boolean;
  /** Default for validation on value changes; false by default. */
  validateOnInput: boolean;
  errorMessages: {
    [key: string]: string;
  };
  sendEmptyStringsAs: undefined | null | '';
  /**
   * Optional global wrapper for fields produced by `useModularForm().build(...)`.
   * You can use this to add a consistent layout element around every field
   * (for example a grid cell, a tooltip provider, etc.).
   *
   * Per-call overrides passed to `build(name, overrides?, { wrap })` take precedence.
   */
  wrapField?: (field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement;
};

// Include all standard <form> element props while overriding onSubmit to inject parsed data
export type ModularFormProps<TValues extends FormValues = FormValues> = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  'onSubmit'
> & {
  /** Form identifier (required) */
  id: string;
  /**
   * Custom handler to merge values from fields sharing the same name (e.g. checkbox groups)
   */
  handleSameNameFieldValues?: SameNameFieldValuesHandler<TValues>;
  /**
   * Called when form submission passes validation with parsed/coerced form data
   */
  onSubmit?: (e: React.FormEvent<HTMLFormElement>, data: TValues) => void;
  /**
   * Called when form submission fails validation. Receives errors tuple list as data.
   */
  onSubmitError?: (e: React.SyntheticEvent, data: [string, (string | FieldError)[]][]) => unknown;
  /**
   * If true, transform accessor style field names (e.g. user.address[0].street) to nested objects.
   */
  parseAccessors?: boolean;
  /**
   * Optional per-form wrapper for fields generated via `useModularForm().build(...)`.
   * Takes precedence over global `config.wrapField`. Set to `null` to explicitly disable any wrapping.
   * Note: This prop is only observed when using the `ModularForm` returned by `useModularForm`.
   */
  wrapField?:
    | ((field: React.ReactElement, props: ModularFormFieldProps) => React.ReactElement)
    | null;
  children?: ReactNode;
};

export type CoerceType = 'int' | 'float' | 'string' | 'array';

// Maps a coerce type string to its resulting runtime value type. Useful for future API surface where
// users can specify expected output types from fields. Not yet wired into FormField generics to avoid
// breaking changes.
export type CoerceResult<T extends CoerceType, TInput = unknown> = {
  int: number;
  float: number;
  string: string;
  array: TInput[];
}[T];

// Given an original raw value type R and an optional coerce type C, produce the final runtime value type.
// If no coerce type is provided (C = undefined), keep R. Otherwise map using CoerceResult.
export type CoercedValue<R, C extends CoerceType | undefined> = C extends CoerceType
  ? CoerceResult<C, R>
  : R;

// Map built-in field types to their native element type
// Accept either enum members or their string literal equivalents for built-ins
export type BuiltinInputTypes = Exclude<`${ModularFieldType}`, 'select' | 'textarea'>;

type BuiltinFieldString = `${ModularFieldType}`;

export type ElementByBuiltinType<T extends ModularFieldType | BuiltinFieldString> = T extends
  | ModularFieldType.Select
  | 'select'
  ? HTMLSelectElement
  : T extends ModularFieldType.Textarea | 'textarea'
  ? HTMLTextAreaElement
  : HTMLInputElement;

// Derive the event element type from the field type. For custom (non-builtin) types, use null.
export type EventElementByType<TType extends string> = TType extends
  | ModularFieldType
  | BuiltinFieldString
  ? ElementByBuiltinType<TType>
  : null;

/**
 * Declaration-mergeable registry that lets consumers map custom field type strings
 * (e.g. 'my-autocomplete') to their runtime value types. The library's type
 * inference will use this registry when computing the shape of `data` in onSubmit.
 *
 * Usage (in your app):
 * declare module 'react-modular-forms' {
 *   interface CustomFieldValueMap {
 *     'custom-field': { id: number; label: string };
 *   }
 * }
 */
export interface CustomFieldValueMap {}

/**
 * Declaration-mergeable interface for customizing same-name field group return types.
 *
 * Use this when you override `config.handleSameNameFieldValues` to specify how
 * different field type combinations should be aggregated. The type system will
 * automatically use these mappings when inferring form values.
 *
 * Keys are field type patterns, values are the transformation types:
 * - 'checkbox-group': multiple checkboxes with same name
 * - 'radio-group': multiple radios with same name
 * - 'mixed-group': mixed field types with same name
 *
 * Usage example:
 * ```typescript
 * declare module 'react-modular-forms' {
 *   interface SameNameFieldValueTransforms {
 *     // Change checkbox groups to return Sets instead of arrays
 *     'checkbox-group': <T>(values: T[]) => Set<T>;
 *
 *     // Change radio groups to include null
 *     'radio-group': <T>(value: T) => T | null;
 *   }
 * }
 *
 * // Then implement the matching runtime handler:
 * config.handleSameNameFieldValues = (name, values, fields) => {
 *   if (fields.every(f => f.type === 'checkbox')) {
 *     return { [name]: new Set(values.filter(v => v != null)) };
 *   }
 *   if (fields.every(f => f.type === 'radio')) {
 *     return { [name]: values[0] ?? null };
 *   }
 *   // ... handle other cases
 * };
 * ```
 *
 * The default transforms are:
 * - 'checkbox-group': (values: T[]) => T[] (identity)
 * - 'radio-group': (value: T) => T (identity)
 * - 'mixed-group': (values: T[]) => T[] (array of values)
 */
export interface SameNameFieldValueTransforms {}

interface DefaultSameNameFieldValueTransforms {
  'checkbox-group': <T>(values: T[]) => T[];
  'radio-group': <T>(value: T) => T;
  'mixed-group': <T>(values: T[]) => T[];
}

// Map raw DOM-ish value types from field kind for value inference
export type RawValueFromFieldType<TType> = TType extends ModularFieldType.Checkbox | 'checkbox'
  ? boolean
  : TType extends ModularFieldType.File | 'file'
  ? File | File[] | undefined
  : TType extends ModularFieldType.Radio | 'radio'
  ? string | undefined
  : string;

// Resolve a value type from the custom registry if available
export type ValueFromCustomRegistry<TType> = TType extends keyof CustomFieldValueMap
  ? CustomFieldValueMap[TType]
  : never;

// Final field value type: if a coerceType is present use that, otherwise fall back to raw mapping.
// For checkboxes, refine the type based on whether an explicit value prop is present.
export type FieldValueType<F extends ModularFormFieldProps<any>> = F extends {
  coerceType: infer C;
}
  ? C extends CoerceType
    ? CoercedValue<unknown, C>
    : never
  : F extends { type: infer TType }
  ? ValueFromCustomRegistry<TType> extends never
    ? TType extends ModularFieldType.Checkbox | 'checkbox'
      ? F extends { value: infer V }
        ? V extends string
          ? string | null
          : boolean
        : boolean
      : TType extends ModularFieldType.Select | 'select'
      ? F extends { multiple: true }
        ? string[]
        : 'multiple' extends keyof F
        ? true extends F['multiple']
          ? string | string[]
          : string
        : string
      : RawValueFromFieldType<TType>
    : ValueFromCustomRegistry<TType>
  : unknown;

// Base props shared across all field kinds. Event handlers are injected per-kind below
export type ModularFormFieldBaseProps<TValue = unknown> = {
  innerClassName?: string;
  className?: string;
  disableOnInvalidForm?: boolean;
  wrapperProps?: Record<string, unknown>;
  error?: string;
  formId?: string;
  label?: ReactNode;
  labelClassName?: string;
  name?: string | (string | number)[];
  id?: string;
  value?: TValue;
  validation?: ValidationType;
  errorMessages?: Partial<ErrorMessages>;
  coerceType?: CoerceType;
  errorHtmlElement?: string | HTMLElement | null;
  hideErrors?: boolean;
  onErrorChange?: (errors: (FieldError | string)[]) => void;
  componentRef?: MutableRefObject<unknown>;
  /** Allow arbitrary intrinsic attributes without using any */
  [intrinsicAttribute: string]: unknown;
};

type ModularFormFieldSpecificProps<TValue, TType, TElement> = ModularFormFieldBaseProps<TValue> & {
  type: TType;
  onChange?: (e: React.ChangeEvent<TElement>, value: TValue) => void;
  onBlur?: (e: React.SyntheticEvent<TElement>) => void;
  onFocus?: (e: React.SyntheticEvent<TElement>) => void;
};

export type ModularFormFieldInputProps<TValue = unknown> = ModularFormFieldSpecificProps<
  TValue,
  | BuiltinInputTypes
  | Exclude<ModularFieldType, ModularFieldType.Select | ModularFieldType.Textarea>,
  HTMLInputElement
>;

export type ModularFormFieldSelectProps<TValue = unknown> = ModularFormFieldSpecificProps<
  TValue,
  'select' | ModularFieldType.Select,
  HTMLSelectElement
>;

export type ModularFormFieldTextareaProps<TValue = unknown> = ModularFormFieldSpecificProps<
  TValue,
  'textarea' | ModularFieldType.Textarea,
  HTMLTextAreaElement
>;

// Fallback for custom field types registered by users. Events are unknown to avoid incorrect DOM typing
type RegistryValueOrUnknown<TType extends string> = ValueFromCustomRegistry<TType> extends never
  ? unknown
  : ValueFromCustomRegistry<TType>;

export type ModularFormFieldCustomProps<TType extends string = string> = ModularFormFieldBaseProps<
  RegistryValueOrUnknown<TType>
> & {
  type: TType;
  onChange?: (e: any, value: RegistryValueOrUnknown<TType>) => void;
  onBlur?: (e: any) => void;
  onFocus?: (e: any) => void;
};

type FieldIdOrNameConstraint =
  | { id: string; name?: string | (string | number)[] }
  | { id?: string; name: string | (string | number)[] };

export type ModularFormFieldProps<TValue = unknown> = (
  | ModularFormFieldInputProps<TValue>
  | ModularFormFieldSelectProps<TValue>
  | ModularFormFieldTextareaProps<TValue>
  | ModularFormFieldCustomProps<string>
) &
  FieldIdOrNameConstraint;

type IntrinsicEventElement = 'input' | 'select' | 'textarea';
type IntrinsicElement<T extends IntrinsicEventElement> = T extends 'input'
  ? HTMLInputElement
  : T extends 'select'
  ? HTMLSelectElement
  : T extends 'textarea'
  ? HTMLTextAreaElement
  : never;

export interface FieldComponentProps<
  TValue,
  TElement,
  TRef = TElement extends IntrinsicEventElement ? IntrinsicElement<TElement> : unknown
> {
  onChange?: (
    e: TElement extends IntrinsicEventElement ? ChangeEvent<IntrinsicElement<TElement>> : unknown,
    value?: TValue
  ) => void;
  onBlur?: (
    e: TElement extends IntrinsicEventElement ? SyntheticEvent<IntrinsicElement<TElement>> : unknown
  ) => void;
  onFocus?: (
    e: TElement extends IntrinsicEventElement ? SyntheticEvent<IntrinsicElement<TElement>> : unknown
  ) => void;
  errors: (FieldError | string)[];
  validation?: ValidationType;
  /**
   * A ref container used by the library to retrieve a raw value via `getValue`.
   * For complex components, this may hold a non-DOM value (e.g., a string, object, etc.).
   */
  componentRef: React.MutableRefObject<TRef | null>;
  /** Setter used by wrappers to assign the componentRef to a custom value */
  setComponentRef: (value: TRef | null) => void;
  /** Raw value for controlled components */
  value?: TValue;
  /** Internally used setter - not typically needed by custom components */
  setValue: (value: TValue) => void;
  /** Field name */
  name?: string;
  formId?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  checked?: boolean;
  errorHtmlElement?: string | HTMLElement | null;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export type SameNameFieldValuesHandler<TValues extends FormValues = FormValues> = (
  name: string,
  values: unknown[],
  types: FormField[]
) => Partial<TValues>;

export type ComponentOptions<
  TValue,
  TElement extends ElementType,
  TRef = TElement extends IntrinsicEventElement ? IntrinsicElement<TElement> : unknown
> = {
  Component: React.ComponentType<
    FieldComponentProps<TValue, TElement, TRef> &
      (TElement extends IntrinsicEventElement
        ? Omit<
            ComponentProps<TElement>,
            | 'value'
            | 'checked'
            | 'onChange'
            | 'onBlur'
            | 'onFocus'
            | 'defaultValue'
            | 'defaultChecked'
          >
        : ComponentProps<TElement>)
  >;
  labelBefore?: boolean;
  extraClass?: string;
  checkable?: boolean;
} & (
  | {
      getValue: (ref: RefObject<TRef>) => TValue;
      isStatic?: boolean;
    }
  | {
      /** Static components do not expose a ref-based value getter */
      getValue?: (ref: RefObject<TRef>) => TValue;
      isStatic: true;
    }
);

// Utility helper types (exported indirectly via index)
export type ValueOf<T> = T[keyof T];
export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

// --- Shared helpers for inferring form value shapes from fields arrays ---
/**
 * IMPORTANT: Type inference for same-name field groups
 *
 * The type inference assumes the DEFAULT behavior of `config.handleSameNameFieldValues`:
 * - Multiple checkboxes with same name → array of values (e.g., string[] or boolean[])
 * - Multiple radios with same name → single value (the checked one)
 * - Mixed types → array of the union of field types
 *
 * If you override `config.handleSameNameFieldValues` or pass a custom handler to
 * `ModularForm`, the TypeScript types may not match the runtime behavior.
 *
 * Workarounds if you need custom same-name handling:
 * 1. Use direct typing: `ModularForm<YourCustomType>` instead of type inference
 * 2. Use type assertions in your onSubmit handler
 * 3. Avoid using same-name fields if your handler changes the structure significantly
 */
export type NamedFieldLike = ModularFormFieldProps<any> & { name: string };

export type FieldNames<T extends readonly NamedFieldLike[]> = T[number]['name'];

// Helper to count how many fields have a specific name
type FieldsWithName<T extends readonly NamedFieldLike[], N extends string> = Extract<
  T[number],
  { name: N }
>;

// Helper to check if all fields with a given name are of a specific type
type AllFieldsWithNameAreType<
  T extends readonly NamedFieldLike[],
  N extends string,
  Type extends string
> = FieldsWithName<T, N> extends { type: Type } ? true : false;

// Helper to get the value type for a single field
type SingleFieldValue<F extends NamedFieldLike> = FieldValueType<F>;

// Helper to determine if there are multiple fields with the same name
type HasMultipleFieldsWithName<T extends readonly NamedFieldLike[], N extends string> = Extract<
  T[number],
  { name: N }
> extends never
  ? false
  : T extends readonly [infer First, ...infer Rest extends readonly NamedFieldLike[]]
  ? First extends { name: N }
    ? Extract<Rest[number], { name: N }> extends never
      ? false
      : true
    : HasMultipleFieldsWithName<Rest, N>
  : false;

// Helper to get the array element type for checkbox groups
type CheckboxGroupValueType<T extends readonly NamedFieldLike[], N extends string> = Extract<
  T[number],
  { name: N; type: ModularFieldType.Checkbox | 'checkbox' }
> extends infer F
  ? F extends NamedFieldLike
    ? SingleFieldValue<F> extends boolean
      ? boolean
      : SingleFieldValue<F> extends string | null
      ? string
      : never
    : never
  : never;

export type RequiredNames<T extends readonly NamedFieldLike[]> = T[number] extends infer F
  ? F extends NamedFieldLike
    ? F['validation'] extends { required: true }
      ? F['name']
      : never
    : never
  : never;

export type OptionalNames<T extends readonly NamedFieldLike[]> = Exclude<
  FieldNames<T>,
  RequiredNames<T>
>;

// Helper to apply the transform from SameNameFieldValueTransforms
// We check what the return type shape is and substitute with the actual ElementType
type TransformFor<K extends keyof DefaultSameNameFieldValueTransforms> =
  K extends keyof SameNameFieldValueTransforms
    ? SameNameFieldValueTransforms[K]
    : DefaultSameNameFieldValueTransforms[K];

type ApplyTransform<
  K extends keyof DefaultSameNameFieldValueTransforms,
  ElementType,
  Transform = TransformFor<K>
> = Transform extends (...args: any[]) => infer R
  ? R extends any[]
    ? ElementType[]
    : R extends Set<any>
    ? Set<ElementType>
    : R extends Map<infer Key, any>
    ? Map<Key, ElementType>
    : R extends ReadonlySet<any>
    ? ReadonlySet<ElementType>
    : R extends ReadonlyArray<any>
    ? ReadonlyArray<ElementType>
    : Transform extends <T>(value: T) => T
    ? ElementType
    : Transform extends <T>(value: T) => T | null
    ? ElementType | null
    : Transform extends <T>(value: T) => T | undefined
    ? ElementType | undefined
    : Transform extends <T>(value: T) => T | null | undefined
    ? ElementType | null | undefined
    : R
  : ElementType;

type ApplyCheckboxTransform<ElementType> = ApplyTransform<'checkbox-group', ElementType>;
type ApplyRadioTransform<ElementType> = ApplyTransform<'radio-group', ElementType>;
type ApplyMixedTransform<ElementType> = ApplyTransform<'mixed-group', ElementType>;

// Helper types for parsing accessor notation when ParseAccessors is true

// Split a path like "user.name" or "items[0]" into tokens
// Split brackets inside each dot-delimited segment before processing the next segment.
type SplitAccessorSegment<S extends string> = S extends `${infer Head}[${infer Index}]${infer Tail}`
  ? [...(Head extends '' ? [] : [Head]), Index, ...SplitAccessorSegment<Tail>]
  : S extends ''
  ? []
  : [S];
type SplitAccessorPath<S extends string> = S extends `${infer Head}.${infer Tail}`
  ? [...SplitAccessorSegment<Head>, ...SplitAccessorPath<Tail>]
  : SplitAccessorSegment<S>;

// Build nested object/array type from accessor path tokens
// If IsOptional is true, the final property will be optional
type OnlyArrayIndices<Path extends readonly string[]> = Path extends readonly [
  infer First,
  ...infer Rest extends readonly string[]
]
  ? First extends `${number}`
    ? OnlyArrayIndices<Rest>
    : false
  : true;

type BuildNestedType<
  Path extends readonly string[],
  Value,
  IsOptional extends boolean = false
> = Path extends readonly [infer First, ...infer Rest]
  ? First extends string
    ? Rest extends readonly string[]
      ? First extends `${number}`
        ? BuildNestedType<Rest, Value, IsOptional>[]
        : // String key
        OnlyArrayIndices<Rest> extends true
        ? IsOptional extends true
          ? { [K in First]?: BuildNestedType<Rest, Value, IsOptional> }
          : { [K in First]: BuildNestedType<Rest, Value, IsOptional> }
        : { [K in First]: BuildNestedType<Rest, Value, IsOptional> }
      : never
    : never
  : Value;

// Apply accessor parsing to a single field name and its value type
type _ParseAccessorName<N extends string, Value, IsRequired extends boolean> = N extends
  | `${string}.${string}`
  | `${string}[${string}]`
  ? IsRequired extends true
    ? BuildNestedType<SplitAccessorPath<N>, Value>
    : BuildNestedType<SplitAccessorPath<N>, Value, true>
  : IsRequired extends true
  ? { [K in N]: Value }
  : { [K in N]?: Value };

// Deep merge utility type for combining nested structures
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type MergedProperty<A, B, K extends PropertyKey> = K extends keyof B
  ? K extends keyof A
    ? DeepMerge<Exclude<A[K], undefined>, Exclude<B[K], undefined>>
    : B[K]
  : K extends keyof A
  ? A[K]
  : never;

type DeepMerge<A, B> = A extends (infer AItem)[]
  ? B extends (infer BItem)[]
    ? DeepMerge<AItem, BItem>[]
    : B
  : B extends object
  ? A extends object
    ? {
        [K in RequiredKeys<A> | RequiredKeys<B>]: MergedProperty<A, B, K>;
      } & {
        [K in Exclude<keyof A | keyof B, RequiredKeys<A> | RequiredKeys<B>>]?: MergedProperty<
          A,
          B,
          K
        >;
      }
    : B
  : B;

// Merge all parsed accessor structures from an array of fields
type MergeAllAccessors<
  T extends readonly NamedFieldLike[],
  Acc = {},
  AllFields extends readonly NamedFieldLike[] = T,
  SeenNames extends string = never
> = T extends readonly [infer First, ...infer Rest]
  ? First extends NamedFieldLike
    ? Rest extends readonly NamedFieldLike[]
      ? First['name'] extends SeenNames
        ? MergeAllAccessors<Rest, Acc, AllFields, SeenNames>
        : MergeAllAccessors<
            Rest,
            DeepMerge<
              Acc,
              _ParseAccessorName<
                First['name'],
                NameToValue<AllFields, First['name']>,
                First['name'] extends RequiredNames<AllFields> ? true : false
              >
            >,
            AllFields,
            SeenNames | First['name']
          >
      : Acc
    : Acc
  : Acc;

// Improved NameToValue that uses SameNameFieldValueTransforms for same-name field groups
export type NameToValue<
  T extends readonly NamedFieldLike[],
  N extends FieldNames<T>,
  _ParseAccessors extends boolean = false
> = HasMultipleFieldsWithName<T, N extends string ? N : never> extends true
  ? // Multiple fields with same name - apply transform
    AllFieldsWithNameAreType<
      T,
      N extends string ? N : never,
      ModularFieldType.Checkbox | 'checkbox'
    > extends true
    ? // All are checkboxes -> apply checkbox-group transform
      ApplyCheckboxTransform<CheckboxGroupValueType<T, N extends string ? N : never>>
    : AllFieldsWithNameAreType<
        T,
        N extends string ? N : never,
        ModularFieldType.Radio | 'radio'
      > extends true
    ? // All are radios -> apply radio-group transform
      Extract<T[number], { name: N }> extends infer F
      ? F extends NamedFieldLike
        ? ApplyRadioTransform<SingleFieldValue<F>>
        : unknown
      : unknown
    : // Mixed types or other -> apply mixed-group transform
      ApplyMixedTransform<FieldValueType<Extract<T[number], { name: N }>>>
  : // Single field with this name
  Extract<T[number], { name: N }> extends infer F
  ? F extends NamedFieldLike
    ? FieldValueType<F>
    : unknown
  : unknown;

type _RequiredMap<T extends readonly NamedFieldLike[]> = RequiredNames<T> extends never
  ? {}
  : { [K in RequiredNames<T> & string]: NameToValue<T, K & FieldNames<T>> };

type _OptionalMap<T extends readonly NamedFieldLike[]> = OptionalNames<T> extends never
  ? {}
  : { [K in OptionalNames<T> & string]?: NameToValue<T, K & FieldNames<T>> };

export type ValuesFromFieldsArray<
  T extends readonly NamedFieldLike[],
  ParseAccessors extends boolean = false
> = ParseAccessors extends true ? MergeAllAccessors<T> : _RequiredMap<T> & _OptionalMap<T>;
