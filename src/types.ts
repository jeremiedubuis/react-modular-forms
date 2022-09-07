import type React from "react";
import type { RefObject } from "react";
import { FieldError, ModularFieldType } from "./enums";

export type ElementType =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export type ErrorMessages = {
  [key: string]: string;
};

export type Field = [
  string,
  ModularFieldType,
  ValidationType | undefined,
  Function,
  Function
];

export type ValidationType = {
  required?: boolean;
  negativeRegExps?: { [error: string]: RegExp };
  positiveRegExps?: { [error: string]: RegExp };
  validator?: (value: any) => string | null;
  validateOnBlur?: boolean;
  group?: string;
  groupMin?: number;
};

export type FormValues = {
  [field: string]: any;
};

type Data = { [field: string]: any };

export type ModularFormConfiguration = {
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
  onSubmit?: (
    e: React.FormEvent<HTMLFormElement>,
    data: { [field: string]: any }
  ) => void;
  onSubmitError?: (e: React.SyntheticEvent, data: Data) => unknown;
  parseAccessors?: boolean;
  [attribute: string]: any;
};

export type CoerceType = "int" | "float" | "string";

export type ModularFormFieldProps = {
  className?: string;
  disableOnInvalidForm?: boolean;
  wrapperProps?: any;
  error?: string;
  formId?: string;
  label?: string;
  name?: string | (string | number)[];
  type: ModularFieldType | string;
  onChange?: (e: any, ...any: any[]) => void;
  onBlur?: (e: React.SyntheticEvent) => void;
  onFocus?: (e: React.SyntheticEvent) => void;
  validation?: ValidationType;
  errorMessages?: Partial<ErrorMessages>;
  coerceType?: CoerceType;
  [intrinsicAttribute: string]: any;
} & (
  | { id: string }
  | { id?: string; name: string | (string | number)[]; formId: string }
);

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

export type SameNameFieldValuesHandler = (
  name: string,
  values: any[]
) => { [name: string]: any };
