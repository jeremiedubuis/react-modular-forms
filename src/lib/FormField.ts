import { FieldError, ModularFieldType } from './enums';
import { CoerceType, CoercedValue, FormElementType, ValidationType } from './types';
import { config, registeredTypes } from './config';
import type { RefObject } from 'react';

export const regexMatches = (val: unknown, regex: string | RegExp) =>
  (regex instanceof RegExp ? regex : new RegExp(regex)).test(String(val));

interface IFormFieldOptions<
  TRawValue = unknown,
  TElement = HTMLElement,
  TRef = TElement,
  TCoerce extends CoerceType | undefined = CoerceType | undefined
> {
  id: string;
  name: string;
  componentRef: RefObject<TRef>;
  rawGetValue: (ref: RefObject<TRef>) => TRawValue;
  type: keyof typeof registeredTypes;
  validation?: ValidationType;
  setSuccess?: (success: boolean) => void;
  setErrors?: (errors: (FieldError | string)[]) => void;
  setIsChecked: (checked: boolean) => void;
  disableOnInvalidForm?: boolean;
  coerceType?: TCoerce;
}

export class FormField<
  TRawValue = unknown,
  TElement = HTMLElement,
  TRef = TElement,
  TCoerce extends CoerceType | undefined = CoerceType | undefined,
  TValue = CoercedValue<TRawValue, TCoerce>
> {
  public id: string;
  public name: string;
  public type: keyof typeof registeredTypes;
  validation?: ValidationType;
  componentRef: RefObject<TRef>;
  _setSuccess?: (success: boolean) => void;
  _setErrors?: (errors: (FieldError | string)[]) => void;
  _getRawValue: (ref: RefObject<TRef>) => TRawValue;
  _setIsChecked: (checked: boolean) => void;
  disableOnInvalidForm?: boolean;
  coerceType?: TCoerce;

  constructor(payload: IFormFieldOptions<TRawValue, TElement, TRef, TCoerce>) {
    this.id = payload.id;
    this.type = payload.type;
    this.name = payload.name;
    this.componentRef = payload.componentRef;
    this.validation = payload.validation;
    this._setSuccess = payload.setSuccess;
    this._setErrors = payload.setErrors;
    this._getRawValue = payload.rawGetValue;
    this._setIsChecked = payload.setIsChecked;
    this.disableOnInvalidForm = payload.disableOnInvalidForm;
    this.coerceType = payload.coerceType;
  }

  getErrors(): (FieldError | string)[] {
    const value = this.getValue();
    const errs = FormField.getErrors(this.validation, value as unknown as TRawValue);
    if (
      process.env.NODE_ENV !== 'production' &&
      this.validation?.required &&
      this.coerceType === 'array' &&
      Array.isArray(value) &&
      value.length === 0
    ) {
      console.warn(
        `[react-modular-forms] Required field "${this.name}" coerced as array is empty; ensure UI enforces at least one selection.`
      );
    }
    return errs;
  }

  getValue(): TValue {
    let v = this._getRawValue(this.componentRef) as unknown as TRawValue;
    if (
      this.type === ModularFieldType.Checkbox &&
      config.handleSingleCheckboxAsArray &&
      !Array.isArray(v)
    ) {
      v = [v] as unknown as TRawValue;
    }
    const coerced = this.coerceType ? (this.coerce(v as unknown) as unknown) : (v as unknown);
    return coerced as TValue;
  }

  setSuccess() {
    this._setErrors?.([]);
    this._setSuccess?.(true);
  }

  setErrors(errors: (FieldError | string)[]) {
    this._setErrors?.(errors);
    this._setSuccess?.(errors.length === 0);
  }

  setIsChecked(checked: boolean) {
    this._setIsChecked(checked);
  }

  isChecked() {
    const el = this.componentRef?.current as unknown as HTMLInputElement | null;
    return !!el?.checked;
  }

  static getErrors(validation?: ValidationType, value?: unknown) {
    let errors: (string | FieldError)[] = [];
    if (!validation) return errors;

    if (validation.required && FormField.isEmpty(value)) {
      errors.push(FieldError.Empty);
      if (config.greedyValidation) return errors;
    }

    if (validation.validator) {
      const validatorError = validation.validator(value);
      if (validatorError) {
        errors.push(validatorError);
        if (config.greedyValidation) return errors;
      }
    }

    if (validation.negativeRegExps) {
      errors = errors.concat(FormField.getRegExpsError(validation.negativeRegExps, false, value));
    }
    if (validation.positiveRegExps) {
      errors = errors.concat(FormField.getRegExpsError(validation.positiveRegExps, true, value));
    }

    return errors;
  }

  static isEmpty(value: unknown) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    // Objects: treat empty plain object as empty for required if no enumerable keys
    if (typeof value === 'object') {
      try {
        if (Object.getPrototypeOf(value) === Object.prototype) {
          return Object.keys(value as Record<string, unknown>).length === 0;
        }
      } catch {
        return false;
      }
    }
    return false;
  }

  static getRegExpsError(regExps: { [error: string]: RegExp }, positive: boolean, value: unknown) {
    const errors: (string | FieldError)[] = [];
    if (!regExps) return errors;
    for (const error of Object.keys(regExps)) {
      if (positive ? regexMatches(value, regExps[error]) : !regexMatches(value, regExps[error]))
        errors.push(error);
    }
    return errors;
  }

  setDisabled(disabled: boolean) {
    const el = this.componentRef?.current as unknown as
      | Partial<FormElementType>
      | Record<string, any>
      | null;
    if (el && typeof el === 'object' && 'disabled' in el) {
      try {
        (el as FormElementType).disabled = disabled as boolean;
      } catch {
        // ignore if not assignable
      }
    }
  }

  coerce(value: unknown) {
    switch (this.coerceType) {
      case 'array':
        return Array.isArray(value)
          ? value
          : value === undefined || value === null || value === ''
          ? []
          : [value];
      case 'int': {
        if (value === null || typeof value === 'undefined') return value;
        if (value === '') return undefined;
        const n = parseInt(String(value), 10);
        return Number.isNaN(n) ? undefined : n;
      }
      case 'float': {
        if (value === null || typeof value === 'undefined') return value;
        if (value === '') return undefined;
        const f = parseFloat(String(value));
        return Number.isNaN(f) ? undefined : f;
      }
      case 'string':
        return (value as { toString?: () => string })?.toString?.() ?? value;
      default:
        return value;
    }
  }
}
