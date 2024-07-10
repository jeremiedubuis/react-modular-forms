import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { FormStore } from './FormStore';
import { config, registeredTypes } from './config';
import type { ModularFormFieldProps } from './types';
import { FieldError, ModularFieldType } from './enums';
import { arrayToAccessor } from './accessorsHelpers';

const cn = (...classes: (string | false | null | undefined)[]) =>
  classes.filter((c) => c).join(' ');

export const ModularFormField: React.FC<ModularFormFieldProps> = ({
  children,
  innerClassName,
  className,
  disableOnInvalidForm,
  error: errorProp,
  formId,
  id: _id,
  label,
  name: _name,
  onChange,
  onFocus,
  onBlur,
  onSubmit,
  type,
  wrapperProps = {},
  validation,
  disabled,
  readOnly,
  errorMessages,
  value: _value = '',
  coerceType,
  componentRef: _componentRef,
  checked,
  errorHtmlElement,
  hideErrors,
  onErrorChange,
  ...intrinsic
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isChecked, setIsChecked] = useState(!!checked);
  const [errors, setErrors] = useState<(FieldError | string)[]>([]);
  const [success, setSuccess] = useState(false);
  const [value, setValue] = useState(_value);
  const componentRef = _componentRef || useRef();
  const setComponentRef = useCallback((node) => {
    if (node) componentRef.current = node;
  }, []);

  useEffect(() => {
    setValue(_value);
  }, [_value]);

  useEffect(() => {
    setIsChecked(!!checked);
  }, [checked]);

  const computedName = Array.isArray(_name) ? arrayToAccessor(_name) : _name;
  const id = _id || formId + computedName;

  const name = computedName
    ? computedName
    : type !== ModularFieldType.Submit
    ? computedName || _id
    : computedName;

  useEffect(() => {
    if (!formId || registeredTypes[type]?.isStatic) return;
    if (name) {
      const form = FormStore.getForm(formId);
      form.registerField(
        id,
        type,
        name,
        componentRef,
        registeredTypes[type].getValue,
        validation,
        setSuccess,
        setErrors,
        disableOnInvalidForm,
        coerceType
      );

      return () => form.unregisterField(id);
    }
  }, [name]);

  let sharedProps: any = {
    children,
    className: innerClassName,
    id,
    name,
    'aria-invalid': !!errors,
    'aria-required': validation?.required,
    disabled,
    readOnly,
    type,
    value,
    setValue,
    componentRef,
    setComponentRef,
    errors,
    checked: isChecked,
    formId,
    errorHtmlElement,
    onFocus: (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    onBlur: (e: any) => {
      setIsFocused(false);
      const validateOnBlur =
        typeof validation?.validateOnBlur !== 'undefined'
          ? validation.validateOnBlur
          : config.validateOnBlur;
      if (formId && validateOnBlur) FormStore.getForm(formId).validateField(id);
      onBlur?.(e);
    },
    ...intrinsic
  };

  if (!registeredTypes[type]?.isStatic) {
    sharedProps.onChange = (e: any, ...args: any[]) => {
      if (registeredTypes[type].checkable)
        setIsChecked((e.currentTarget as HTMLInputElement).checked);
      else setValue(registeredTypes[type].getValue(componentRef));
      onChange?.(e, ...args);
    };
  } else {
    sharedProps.onChange = onChange;
  }

  const Component = registeredTypes[type].Component;
  const extraClass = registeredTypes[type].extraClass;

  useEffect(() => {
    onErrorChange?.(errors);
  }, [errors]);

  const errorContent = !hideErrors && (errorProp || errors.length > 0) && (
    <div
      className={config.errorClassName}
      {...{
        'aria-live': 'polite',
        'aria-relevant': 'text'
      }}
    >
      {errorProp ? (
        <p>{errorProp}</p>
      ) : (
        errors
          .slice(0, config.displayMultipleErrors ? errors.length : 1)
          .map((e, i) => <p key={i}>{errorMessages?.[e] || config.errorMessages[e] || e}</p>)
      )}
    </div>
  );

  return (
    <div
      className={cn(
        config.fieldClassName,
        className,
        `is-${type}`,
        isFocused && 'is-focused',
        isChecked && 'is-checked',
        (errorProp || errors.length > 0) && 'has-error',
        validation && success && 'has-success',
        readOnly && 'is-read-only',
        value && 'has-value',
        extraClass
      )}
      {...wrapperProps}
    >
      {registeredTypes[type].labelBefore && label && <label htmlFor={id}>{label}</label>}
      <Component {...sharedProps} />
      {!registeredTypes[type].labelBefore && label && <label htmlFor={id}>{label}</label>}

      {errorContent
        ? errorHtmlElement
          ? ReactDOM.createPortal(
              errorContent,
              typeof errorHtmlElement === 'string'
                ? document.querySelector(errorHtmlElement)
                : errorHtmlElement
            )
          : errorContent
        : null}
    </div>
  );
};
