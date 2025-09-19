import React from 'react';
import { FieldComponentProps } from '../types';

export const HiddenInput: React.FC<
  FieldComponentProps<unknown, 'input', HTMLInputElement> &
    Omit<
      React.HTMLProps<HTMLInputElement>,
      'value' | 'checked' | 'onChange' | 'onBlur' | 'onFocus' | 'defaultValue' | 'defaultChecked'
    >
> = ({
  type,
  disabled,
  value,
  onBlur: _onBlur,
  onFocus: _onFocus,
  onChange,
  errors: _errors,
  validation: _validation,
  componentRef,
  setComponentRef: _setComponentRef,
  children,
  formId: _formId,
  errorHtmlElement: _errorHtmlElement,
  setValue: _setValue,
  ...intrinsic
}) => {
  const inputRef = componentRef as React.Ref<HTMLInputElement> | undefined;

  const sharedProps = {
    ref: inputRef,
    onChange,
    disabled,
    value: JSON.stringify(value),
    ...intrinsic
  };

  return (
    <>
      <input type={type} {...sharedProps} /> {children}
    </>
  );
};
