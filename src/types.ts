import type React from 'react';
import type { RefObject } from 'react';
import { FieldError, ModularFieldType } from './enums';
import { registeredTypes } from './config';

export type ElementType = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type ErrorMessages = {
  [key: string]: string;
};

export type Field = [string, ModularFieldType, ValidationType | undefined, Function, Function];

export type ValidationType = {
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
   * A custom validator function, should return an error string if value isn't valid or null if it is
   */
  validator?: (value: any) => string | null;
  validateOnBlur?: boolean;
  /**
   * The group prop allows the form to validate multiple fields
   */
  group?: string;
  /**
   * groupMin tells the form how many fields in the group must be valid for the form to be submitted
   */
  groupMin?: number;
};

export type FormValues = {
  [field: string]: any;
};

type Data = { [field: string]: any };

export type ModularFormConfiguration = {
  defaultFormMethod: 'POST' | 'GET';
  displayMultipleErrors: boolean;
  handleSameNameFieldValues: (
    name: string | (string | number)[],
    values: any[]
  ) => {
    [key: string]: any;
  };
  fieldClassName: string;
  errorClassName: string;
  greedyValidation: boolean;
  handleSingleCheckboxAsArray: boolean;
  validateOnBlur: boolean;
  errorMessages: {
    [key: string]: string;
  };
};

export type ModularFormProps = {
  id: string;
  handleSameNameFieldValues?: SameNameFieldValuesHandler;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>, data: { [field: string]: any }) => void;
  onSubmitError?: (e: React.SyntheticEvent, data: Data) => unknown;
  parseAccessors?: boolean;
  [attribute: string]: any;
};

export type CoerceType = 'int' | 'float' | 'string' | 'array';

export type ModularFormFieldProps = {
  className?: string;
  disableOnInvalidForm?: boolean;
  wrapperProps?: any;
  error?: string;
  formId?: string;
  label?: string;
  name?: string | (string | number)[];
  type: keyof typeof registeredTypes;
  onChange?: (e: any, ...any: any[]) => void;
  onBlur?: (e: React.SyntheticEvent) => void;
  onFocus?: (e: React.SyntheticEvent) => void;
  validation?: ValidationType;
  errorMessages?: Partial<ErrorMessages>;
  coerceType?: CoerceType;
  errorHtmlElement?: string | HTMLElement;
  hideErrors?: boolean;
  onErrorChange?: (errors: (FieldError | string)[]) => void;
  [intrinsicAttribute: string]: any;
} & ({ id: string } | { id?: string; name: string | (string | number)[]; formId: string });

export type FieldComponentProps = {
  onChange?: (e: unknown, ...any: any[]) => void;
  onBlur?: (e: React.SyntheticEvent) => void;
  onFocus?: (e: React.SyntheticEvent) => void;
  errors: (FieldError | string)[];
  validation?: ValidationType;
  componentRef: React.MutableRefObject<any>;
  setComponentRef: (value: any) => RefObject<any>;
  [key: string]: any;
};

export type SameNameFieldValuesHandler = (name: string, values: any[]) => { [name: string]: any };

export type ComponentOptions = {
  Component: React.ComponentType<FieldComponentProps>;
  labelBefore?: boolean;
  extraClass?: string;
  checkable?: boolean;
} & (
  | {
      getValue: (ref: RefObject<any>) => any;
      isStatic?: boolean;
    }
  | {
      getValue?: (ref: RefObject<any>) => any;
      isStatic: true;
    }
);
