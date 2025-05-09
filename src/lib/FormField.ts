import { FieldError, ModularFieldType } from './enums';
import { CoerceType, ElementType, ValidationType } from './types';
import { config, registeredTypes } from './config';
import type { RefObject } from 'react';

export const regexMatches = (val: string, regex: string | RegExp) =>
  (regex instanceof RegExp ? regex : new RegExp(regex)).test(val);

interface IFormFieldOptions {
  id: string;
  name: string;
  componentRef: RefObject<any>;
  getValue: (ref: RefObject<any>) => any;
  type: keyof typeof registeredTypes;
  validation?: ValidationType;
  setSuccess?: Function;
  setErrors?: Function;
  setIsChecked: (checked: boolean) => void;
  disableOnInvalidForm?: boolean;
  coerceType?: CoerceType;
}

export class FormField implements IFormFieldOptions {
  public id: string;
  public name: string;
  public type: keyof typeof registeredTypes;
  validation?: ValidationType;
  componentRef: RefObject<any>;
  _setSuccess?: Function;
  _setErrors?: Function;
  _getValue: Function;
  _setIsChecked: (checked: boolean) => void;
  disableOnInvalidForm?: boolean;
  coerceType?: CoerceType;

  constructor(payload: IFormFieldOptions) {
    this.id = payload.id;
    this.type = payload.type;
    this.name = payload.name;
    this.componentRef = payload.componentRef;
    this.validation = payload.validation;
    this._setSuccess = payload.setSuccess;
    this._setErrors = payload.setErrors;
    this._getValue = payload.getValue;
    this._setIsChecked = payload.setIsChecked;
    this.disableOnInvalidForm = payload.disableOnInvalidForm;
    this.coerceType = payload.coerceType;
  }

  getErrors() {
    const value = this.getValue();
    return FormField.getErrors(this.validation, value);
  }

  getValue() {
    let v = this._getValue(this.componentRef);
    if (
      this.type === ModularFieldType.Checkbox &&
      config.handleSingleCheckboxAsArray &&
      !Array.isArray(v)
    )
      v = [v];
    return this.coerceType ? this.coerce(v) : v;
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
    return (document.getElementById(this.id) as HTMLInputElement).checked;
  }

  static getErrors(validation?: ValidationType, value?: any) {
    let errors: (string | FieldError)[] = [];
    if (!validation) return errors;

    if (validation.required && FormField.isEmpty(value)) {
      errors.push(FieldError.Empty);
      if (config.greedyValidation) return errors;
    }

    if (validation.validator) {
      let validatorError = validation.validator(value);
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

  static isEmpty(value: any) {
    return !value;
  }

  static getRegExpsError(regExps: { [error: string]: RegExp }, positive: boolean, value: any) {
    let errors: (string | FieldError)[] = [];
    if (!regExps) return errors;
    for (let error of Object.keys(regExps)) {
      if (positive ? regexMatches(value, regExps[error]) : !regexMatches(value, regExps[error]))
        errors.push(error);
    }
    return errors;
  }

  setDisabled(disabled: boolean) {
    (document.getElementById(this.id) as ElementType).disabled = disabled;
  }

  coerce(value: any) {
    switch (this.coerceType) {
      case 'array':
        return Array.isArray(value)
          ? value
          : typeof value === 'undefined' || value === null || value === ''
          ? []
          : [value];
      case 'int':
        return parseInt(value);
      case 'float':
        return parseFloat(value);
      case 'string':
        return value?.toString() || value;
    }
  }
}
