import React from 'react';
import { FieldComponentProps } from '../types';

export const Select: React.FC<
  FieldComponentProps<unknown, 'select', HTMLSelectElement> &
    Omit<
      React.HTMLProps<HTMLSelectElement>,
      'value' | 'checked' | 'onChange' | 'onBlur' | 'onFocus' | 'defaultValue' | 'defaultChecked'
    >
> = ({
  type: _type,
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
  readOnly,
  multiple,
  formId: _formId,
  errorHtmlElement: _errorHtmlElement,
  setValue: _setValue,
  ...intrinsic
}) => {
  const sharedProps = {
    ref: componentRef as React.Ref<HTMLSelectElement>,
    onChange,
    onFocus,
    onBlur,
    'aria-invalid': errors.length > 0,
    'aria-required': validation?.required,
    disabled,
    multiple,
    value: (value ?? (multiple ? [] : '')) as any,
    ...intrinsic
  };
  const c = readOnly
    ? React.Children.toArray(children).filter((child) => {
        if (!React.isValidElement(child)) return false;
        const optionValue = (child.props as { value?: unknown }).value;
        return multiple && Array.isArray(value)
          ? value.includes(optionValue)
          : optionValue === value;
      })
    : children;

  return <select {...sharedProps}>{c}</select>;
};
