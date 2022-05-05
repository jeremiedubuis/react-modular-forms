import React from 'react';
import { FormStore } from './FormStore';
import type { ModularFormProps } from './types';

export const ModularForm: React.FC<ModularFormProps> = ({
    children,
    id,
    onSubmit,
    onSubmitError,
    handleSameNameFieldValues,
    parseAccessors,
    ...intrinsic
}) => (
    <form
        id={id}
        {...intrinsic}
        onSubmit={(e) => {
            const form = FormStore.getForm(id);
            form.set(handleSameNameFieldValues, parseAccessors);
            const errors = form.getErrors(false);
            if (!errors.length) {
                onSubmit?.(e, form.getValues());
            } else {
                e.preventDefault();
                onSubmitError?.(e, errors);
            }
        }}
    >
        {children}
    </form>
);
