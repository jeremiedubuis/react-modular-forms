import type { RefObject } from 'react';
import { FieldError, ModularFieldType } from './enums';
import { RegularInput } from './fieldComponents/RegularInput';
import { Textarea } from './fieldComponents/Textarea';
import { Select } from './fieldComponents/Select';
import { ComponentOptions, ModularFormConfiguration } from './types';
import { HiddenInput } from './fieldComponents/HiddenInput';
import { FileInput } from './fieldComponents/FileInput';
import { arrayToAccessor } from './accessorsHelpers';

export const config: ModularFormConfiguration = {
  defaultFormMethod: 'POST',
  displayMultipleErrors: true,
  errorClassName: 'modular-form-error',
  fieldClassName: 'modular-form-field',
  greedyValidation: true,
  handleSameNameFieldValues: (name, values: any[]) => {
    return {
      [Array.isArray(name) ? arrayToAccessor(name) : name]: values.filter(
        (v) => typeof v !== 'undefined' && v !== null
      )
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

const regularInputType = {
  Component: RegularInput,
  labelBefore: true,
  getValue: (ref: RefObject<any>) => {
    return ref.current.value;
  }
};

export const registeredTypes: { [type: string]: ComponentOptions } = {
  [ModularFieldType.Checkbox]: {
    Component: RegularInput,
    labelBefore: false,
    checkable: true,
    getValue: (ref: RefObject<any>) => {
      return ref.current.checked
        ? ref.current.getAttribute('value')
          ? ref.current.value
          : true
        : ref.current.value
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
    getValue: (ref: RefObject<any>) => {
      return ref.current.hasAttribute('multiple') ? [...ref.current.files] : ref.current.files[0];
    }
  },
  [ModularFieldType.Hidden]: {
    Component: HiddenInput,
    getValue: (ref: RefObject<HTMLInputElement>) => {
      return JSON.parse(ref.current.value);
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

export const registeredTypeStrings: string[] = Object.values(ModularFieldType);
export const registerType = (fieldType: string, componentOptions: ComponentOptions) => {
  if (typeof componentOptions.labelBefore === 'undefined') componentOptions.labelBefore = true;
  registeredTypes[fieldType] = componentOptions;
  registeredTypeStrings.push(fieldType);
};
