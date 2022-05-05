import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import { FormStore } from './FormStore';
import { config, registeredTypes } from './config';
import type { ElementType, ModularFormFieldProps } from './types';
import { FieldError, ModularFieldType } from './enums';

const cn = (...classes: (string | false | null | undefined)[]) =>
    classes.filter((c) => c).join(' ');

export const ModularFormField: React.FC<ModularFormFieldProps> = ({
    children,
    className,
    disableOnInvalidForm,
    error: errorProp,
    formId,
    id,
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
    ...intrinsic
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [errors, setErrors] = useState<(FieldError | string)[]>([]);
    const [success, setSuccess] = useState(false);
    const [value, setValue] = useState(_value);
    const componentRef = useRef();
    const setComponentRef = useCallback((node) => {
        if (node) componentRef.current = node;
    }, []);

    useEffect(() => {
        setValue(_value);
    }, [_value]);

    const name = type !== ModularFieldType.Submit ? _name || id : _name;

    useEffect(() => {
        if (!formId) return;
        const form = FormStore.getForm(formId);
        if (name) {
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

    const sharedProps = {
        children,
        className,
        id,
        name,
        onChange: (e: ChangeEvent<ElementType>) => {
            setValue(registeredTypes[type].getValue(componentRef));
            onChange?.(e);
        },
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
        'aria-invalid': !!errors,
        'aria-required': validation?.required,
        disabled,
        readOnly,
        type,
        value,
        componentRef,
        setComponentRef,
        errors,
        ...intrinsic
    };

    const Component = registeredTypes[type].Component;
    const extraClass = registeredTypes[type].extraClass;

    return (
        <div
            className={cn(
                config.fieldClassName,
                className,
                `is-${type}`,
                isFocused && 'is-focused',
                (errorProp || errors.length > 0) && 'has-error',
                validation && success && 'has-success',
                readOnly && 'is-read-only',
                extraClass
            )}
            {...wrapperProps}
        >
            {registeredTypes[type].labelBefore && label && <label htmlFor={id}>{label}</label>}
            <Component {...sharedProps} />
            {!registeredTypes[type].labelBefore && label && <label htmlFor={id}>{label}</label>}

            {(errorProp || errors.length > 0) && (
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
                            .map((e, i) => (
                                <p key={i}>{errorMessages?.[e] || config.errorMessages[e] || e}</p>
                            ))
                    )}
                </div>
            )}
        </div>
    );
};
