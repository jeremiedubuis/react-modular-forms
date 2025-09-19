import type { ElementType, RefObject } from 'react';
import { FieldError, ModularFieldType } from './enums';
import { RegularInput } from './fieldComponents/RegularInput';
import { Textarea } from './fieldComponents/Textarea';
import { Select } from './fieldComponents/Select';
import { ComponentOptions, ModularFormConfiguration } from './types';
import { HiddenInput } from './fieldComponents/HiddenInput';
import { FileInput } from './fieldComponents/FileInput';
import { arrayToAccessor } from './accessorsHelpers';
import { FormField } from './FormField';

export const config: ModularFormConfiguration = {
  defaultFormMethod: 'POST',
  displayMultipleErrors: true,
  errorClassName: 'modular-form-error',
  fieldClassName: 'modular-form-field',
  labelClassName: undefined,
  innerClassName: undefined,
  greedyValidation: true,
  wrapField: undefined,
  handleSameNameFieldValues: (name, values: unknown[], fields: FormField[]) => {
    const accessorName = Array.isArray(name) ? arrayToAccessor(name) : name;
    // All radios: return the single checked value (or undefined)
    if (fields.every((f) => f.type === 'radio')) {
      const checkedField = fields.find(
        (f) => (f.componentRef.current as HTMLInputElement | null)?.checked
      );
      return { [accessorName]: checkedField?.getValue() };
    }
    // All checkboxes: aggregate all checked values into an array (exclude unchecked / null)
    if (fields.every((f) => f.type === 'checkbox')) {
      const checkedValues = fields
        .filter((f) => (f.componentRef.current as HTMLInputElement | null)?.checked)
        .map((f) => f.getValue())
        .filter((v) => typeof v !== 'undefined' && v !== null);
      return { [accessorName]: checkedValues };
    }
    // Mixed types: retain previous behavior (filtered values array)
    return {
      [accessorName]: values.filter((v) => typeof v !== 'undefined' && v !== null)
    };
  },
  sendEmptyStringsAs: '',
  handleSingleCheckboxAsArray: false,
  validateOnBlur: true,
  errorMessages: {
    [FieldError.Empty]: 'Field is empty',
    [FieldError.Group]: 'Group error'
  }
};

const regularInputType: ComponentOptions<unknown, 'input', HTMLInputElement> = {
  Component: RegularInput,
  labelBefore: true,
  getValue: (ref: RefObject<HTMLInputElement>) => {
    return ref.current?.value;
  }
};

export const registeredTypes: { [type: string]: ComponentOptions<unknown, any, any> } = {
  [ModularFieldType.Checkbox]: {
    Component: RegularInput,
    labelBefore: false,
    checkable: true,
    getValue: (ref: RefObject<HTMLInputElement>) => {
      const el = ref.current!;
      return el.checked
        ? el.getAttribute('value')
          ? el.value
          : true
        : el.dataset.rmfPropsValue
        ? null
        : false;
    }
  },
  [ModularFieldType.Color]: regularInputType,
  [ModularFieldType.Date]: regularInputType,
  [ModularFieldType.DateTimeLocal]: regularInputType,
  [ModularFieldType.Email]: regularInputType,
  [ModularFieldType.File]: {
    Component: FileInput,
    labelBefore: true,
    getValue: (ref: RefObject<HTMLInputElement>) => {
      const el = ref.current!;
      return el.hasAttribute('multiple') ? Array.from(el.files || []) : el.files?.[0];
    }
  },
  [ModularFieldType.Hidden]: {
    Component: HiddenInput,
    getValue: (ref: RefObject<HTMLInputElement>) => {
      const raw = ref.current?.value;
      if (typeof raw === 'undefined') return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[react-modular-forms] Failed to parse hidden input JSON value:', e, raw);
        }
        return null;
      }
    }
  },
  [ModularFieldType.Number]: regularInputType,
  [ModularFieldType.Password]: regularInputType,
  [ModularFieldType.Radio]: {
    ...regularInputType,
    checkable: true,
    labelBefore: false
  },
  [ModularFieldType.Select]: {
    ...regularInputType,
    Component: Select
  },
  [ModularFieldType.Search]: regularInputType,
  [ModularFieldType.Submit]: regularInputType,
  [ModularFieldType.Tel]: regularInputType,
  [ModularFieldType.Text]: regularInputType,
  [ModularFieldType.Textarea]: {
    ...regularInputType,
    Component: Textarea
  },
  [ModularFieldType.Time]: regularInputType,
  [ModularFieldType.Url]: regularInputType
};

export const registeredTypeStrings: string[] = Object.values(ModularFieldType) as string[];
export const registerType = <TValue, TElement extends ElementType, TRef = TElement>(
  fieldType: string,
  componentOptions: ComponentOptions<TValue, TElement, TRef>
) => {
  if (typeof componentOptions.labelBefore === 'undefined') componentOptions.labelBefore = true;
  registeredTypes[fieldType] = componentOptions as ComponentOptions<unknown, any, any>;
  if (registeredTypeStrings.includes(fieldType)) return;
  registeredTypeStrings.push(fieldType);
};
