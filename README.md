# react-modulr-forms

This library aims at solving the issues of complex forms in an extensible way. 
It allows multiple types of validation and arranging forms inn any way you see fit. It allows
plugin any external library into it's validation process to prevent form submission or display
errors in a unified manner.

## Components

### ModularForm
The ModularForm component will wrap our FormField elements, it simply has an `id` prop that will be referenced
by each field. It can wrap its elements but any element outside of the form will also be registered as 
long as it holds the correct formId.

```TSX
import { ModularForm } from 'react-modular-forms';
const formId = 'my-form';
<ModularForm id={formId}>

</ModularForm>
```

### ModularFormField
The ModularFormField is used to render any form field element. It must have a `formId` prop to reference it's
parent form and either a `name` or an `id` prop.

If you need to pass a class to the input field or the inner component you can use the `innerClassName` prop.

```TSX

Every native HTML form field element should be supported out of the box.
```TSX
const formId = 'my-form';
<ModularForm id={formId}>
    
    <ModularFormField formId={formId} name="email" type="email" />

</ModularForm>
```

## Validation
Validation is implemented by providing the `validation` prop to ModularFormField components.
```TSX

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
```

## Registering new components with registerType

The registerType helper allows you to register external libraries or custom components as form fields.
If you for example wanted to register react-select as component:
```TSX
import React from 'react';
import Select from 'react-select';

const ReactSelectWrapper = ({ name, value: _value, onChange, componentRef,...props }: FieldComponentProps) => {
    const [value, setValue] = useState<any>(_value);

    useEffect(() => {
        componentRef.current = value;
    }, []);
    return (
        <Select
            name={Array.isArray(name) ? name.join('.') : name}
            value={value}
            onChange={(option) => {
                setValue(option);
                componentRef.current = option.value;
                onChange(null, option.value);
                return option;
            }}
            {...props}
        />
    );
};

registerType('react-select', {
    Component: ReactSelectWrapper,
    getValue: (ref: RefObject<string | undefined>) => ref.current
});

```

When registering custom form field types, you should ensure events
methods are handled on the component for validation to be properly handled. You can use
the `componentRef` or the `setComponentRef` props to give the library something to access the
field's value. This ref will be passed to the `getValue` function that will be used to validate the field.

```TSX
{
  onChange?: (e: unknown, ...any: any[]) => void;
  onBlur?: (e: React.SyntheticEvent) => void;
  onFocus?: (e: React.SyntheticEvent) => void;
  componentRef: React.MutableRefObject<any>;
  setComponentRef: (value: any) => RefObject<any>;
}
```

### Using registerType to register complex types without adding validation hooks
If you wish to create ModularFormField types without adding validation hook you can use the 
`isStatic` boolean option of the `registerType` function. This will prevent the logic from being
implemented twice if the components referenced are already ModularFormFields. This will allow the
creation of complex fields with ease or even group multiple fields into a single component.

```TSX
registerType('address-fields', {
    Component: ({ formId, prefix }: FieldComponentProps & { prefix: string}) => {
        return <>
            <ModularFormField formId={formId} type="text" name={`${prefix}address`} label="Address" validation={{required: true}} />
            <ModularFormField formId={formId} type="text" name={`${prefix}city`} label="City" validation={{required: true}}  />
            <ModularFormField formId={formId} type="tel" name={`${prefix}zipcode`} label="Zipcode" validation={{required: true}}  />
            <ModularFormField formId={formId} type="text" name={`${prefix}country`} label="Country" validation={{required: true}}  />
        </>
    },
    isStatic: true
});
```
