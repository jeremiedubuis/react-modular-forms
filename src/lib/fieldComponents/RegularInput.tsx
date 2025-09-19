import React from 'react';
import { FieldComponentProps } from '../types';

export const RegularInput = ({
  type,
  disabled,
  value,
  onBlur,
  onFocus,
  onChange,
  errors,
  validation,
  componentRef,
  setComponentRef: _setComponentRef,
  children,
  formId: _formId,
  errorHtmlElement: _errorHtmlElement,
  setValue: _setValue,
  ...intrinsic
}: FieldComponentProps<unknown, 'input', HTMLInputElement> &
  Omit<
    React.HTMLProps<HTMLInputElement>,
    'value' | 'checked' | 'onChange' | 'onBlur' | 'onFocus' | 'defaultValue' | 'defaultChecked'
  >) => {
  const sharedProps = {
    ref: componentRef as React.Ref<HTMLInputElement>,
    onChange,
    onFocus,
    onBlur,
    'aria-invalid': errors.length > 0,
    'aria-required': validation?.required,
    disabled,
    ...intrinsic
  } as any;

  if (value !== undefined) {
    sharedProps.value = value ?? '';
  }

  return (
    <>
      <input type={type} {...sharedProps} /> {children}
    </>
  );
};
