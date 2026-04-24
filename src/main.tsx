import React, { useEffect, type RefObject } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ModularFieldType,
  ModularForm,
  ModularFormField,
  registerType,
  FieldComponentProps,
  config,
  useModularForm
} from './lib';
import type { DummyUser } from './custom-field-types';

config.sendEmptyStringsAs = undefined;
config.wrapField = (field) => {
  return <div style={{ border: '1px dashed black', width: 200 }}>{field}</div>;
};

const dummyUsers = [
  { id: 0, firstname: 'John', lastname: 'Doe', age: 30 },
  { id: 1, firstname: 'Jane', lastname: 'Doe', age: 25 }
];
registerType<DummyUser, 'select', HTMLSelectElement>('custom-field', {
  Component: ({ componentRef, onChange, onBlur, onFocus }) => (
    <select
      onBlur={onBlur}
      onChange={(e) => onChange?.(e, dummyUsers.find((u) => u.id.toString() === e.target.value)!)}
      onFocus={onFocus}
      ref={componentRef}
    >
      {dummyUsers.map((u) => (
        <option key={u.id} value={u.id}>
          {u.firstname} {u.lastname} ({u.age} years)
        </option>
      ))}
    </select>
  ),
  getValue: (ref: RefObject<HTMLSelectElement>) => {
    return dummyUsers.find((u) => u.id.toString() === ref.current?.value)!;
  }
});

registerType<Date | null, 'select', Date>('date-picker', {
  Component: ({ componentRef, onChange, onBlur, onFocus, value, setValue }) => {
    function valueToDate(value: number) {
      const d = new Date();
      const deltaDay = d.getDay() - value;
      d.setDate(d.getDate() - deltaDay);
      return d;
    }

    useEffect(() => {
      componentRef.current = value || valueToDate(0);
      setValue(componentRef.current);
    }, []);
    return (
      <select
        onBlur={onBlur}
        onChange={(e) => {
          const d = valueToDate(parseInt(e.target.value, 10));
          console.log(e.target.value, d);
          componentRef.current = d;
          setValue(componentRef.current);
          onChange?.(e, componentRef.current);
        }}
        onFocus={onFocus}
      >
        <option value={0}>Sunday</option>
        <option value={1}>Monday</option>
        <option value={2}>Tuesday</option>
        <option value={3}>Wednesday</option>
        <option value={4}>Thursday</option>
        <option value={5}>Friday</option>
        <option value={6}>Saturday</option>
      </select>
    );
  },
  getValue: (ref) => {
    return ref.current;
  }
});

registerType('address-fields', {
  Component: ({
    formId,
    prefix = '',
    errorHtmlElement
  }: FieldComponentProps<string, unknown> & { prefix?: string }) => {
    return (
      <>
        <ModularFormField
          formId={formId}
          type="text"
          name={`${prefix}address`}
          label="Address"
          validation={{ required: true }}
          errorHtmlElement={errorHtmlElement}
        />
        <ModularFormField
          formId={formId}
          type="text"
          name={`${prefix}city`}
          label="City"
          validation={{ required: true }}
          errorHtmlElement={errorHtmlElement}
        />
        <ModularFormField
          formId={formId}
          type="tel"
          name={`${prefix}zipcode`}
          label="Zipcode"
          validation={{ required: true }}
          errorHtmlElement={errorHtmlElement}
        />
        <ModularFormField
          formId={formId}
          type="text"
          name={`${prefix}country`}
          label="Country"
          validation={{ required: true }}
          errorHtmlElement={errorHtmlElement}
        />
        <ModularFormField
          formId={formId}
          type="custom-field"
          name={`${prefix}custom`}
          label="Custom"
          onChange={(e, v) => console.log(e, v)}
          validation={{ required: true }}
          errorHtmlElement={errorHtmlElement}
        />
      </>
    );
  },
  isStatic: true
});

const CoercionExample = () => {
  // Example demonstrating type coercion with useModularForm
  const { ModularForm: CoercionForm, build } = useModularForm(
    [
      {
        name: 'age',
        type: 'text',
        coerceType: 'int',
        validation: { required: true },
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
          // @todo can we type this properly?
          console.log('Age changed:', e.target.value);
        },
        label: 'Age (coerced to int)'
      },
      { name: 'price', type: 'text', coerceType: 'float', label: 'Price (coerced to float)' },
      { name: 'tags', type: 'text', coerceType: 'array', label: 'Tags (coerced to array)' },
      { name: 'description', type: 'textarea', label: 'Description (string, no coercion)' },
      {
        name: 'nested.text',
        type: 'text',
        label: 'Nested Text Field (nested object)'
      },
      {
        name: 'nested2.text',
        type: 'text',
        validation: {
          required: true
        },
        label: 'Nested Text Field (nested object)'
      }
    ] as const,
    { parseAccessors: true }
  );

  return (
    <CoercionForm
      onSubmit={(e, data) => {
        e.preventDefault();
        console.log('Coerced form data:', data);
        console.log('Type checks:', {
          ageIsNumber: typeof data.age === 'number',
          priceIsNumber: typeof data.price === 'number',
          tagsIsArray: Array.isArray(data.tags),
          nestedText: typeof data.nested?.text === 'string',
          nested2Text: typeof data.nested2.text === 'string'
        });
      }}
    >
      <h2>Coercion Example Form</h2>
      {build('age', { placeholder: 'Enter a number' })}
      {build('price', { placeholder: '19.99' })}
      {build('tags', { placeholder: 'Single value converted to array' })}
      {build('description', { placeholder: 'Regular string input' })}
      {build('nested.text')}
      <button type="submit">Submit and Check Console</button>
    </CoercionForm>
  );
};

const HookForm = () => {
  const [changed, setChanged] = React.useState(false);

  const fields = [
    {
      name: 'firstName',
      type: ModularFieldType.Text,
      validation: { required: true },
      label: 'First Name'
    },
    {
      name: 'age',
      type: ModularFieldType.Number,
      coerceType: 'int',
      validation: { required: false },
      label: 'Age'
    },
    {
      name: 'custom',
      type: 'custom-field',
      validation: { required: true },
      label: 'Custom'
    },
    {
      name: 'date',
      type: 'date-picker',
      label: 'Date'
    },
    { name: 'check', type: 'checkbox', label: 'Check me' },
    { name: 'checkWithValue', type: 'checkbox', label: 'Check me', value: 'check_me_1' }
  ] as const;

  const {
    ModularForm: ModularForm2,
    build,
    buildById
  } = useModularForm(
    changed
      ? ([
          ...fields,
          {
            id: 'contact-email',
            name: 'contactMethod',
            type: ModularFieldType.Radio,
            value: 'email',
            label: 'Contact by email'
          },
          {
            id: 'contact-phone',
            name: 'contactMethod',
            type: ModularFieldType.Radio,
            value: 'phone',
            label: 'Contact by phone'
          },
          {
            name: 'color',
            type: ModularFieldType.Color,
            validation: { required: true },
            label: 'Color'
          }
        ] as const)
      : ([
          ...fields,
          {
            id: 'contact-email',
            name: 'contactMethod',
            type: ModularFieldType.Radio,
            value: 'email',
            label: 'Contact by email'
          },
          {
            id: 'contact-phone',
            name: 'contactMethod',
            type: ModularFieldType.Radio,
            value: 'phone',
            label: 'Contact by phone'
          }
        ] as const)
  );

  return (
    <ModularForm2
      onSubmit={(e, data) => {
        console.log(data);

        if ('color' in data) {
          // data.color is available in this branch
          console.log('Picked color:', data.color);
        }
        console.log(data.check);
        console.log(data.checkWithValue);
        console.log(data.contactMethod);
        console.log(data.custom.firstname);
        e.preventDefault();
      }}
    >
      <h2>Second form</h2>
      <button type="button" onClick={() => setChanged(!changed)}>
        Change
      </button>
      {build('firstName')}
      {build('custom')}
      {build('age', undefined, {
        wrap: (field) => {
          return <div style={{ background: 'lightgrey', width: 200 }}>{field}</div>;
        }
      })}
      {build('date')}
      <h3>Preferred contact method</h3>
      {buildById('contact-email')}
      {buildById('contact-phone')}
      {changed && build('color')}
      <button>Submit</button>
    </ModularForm2>
  );
};

createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <ModularForm
      id="form"
      parseAccessors
      onSubmit={(e, data) => {
        e.preventDefault();
        console.log(data);
      }}
    >
      <ModularFormField
        formId="form"
        type={ModularFieldType.Hidden}
        name="blocks[0].hidden"
        value={['0', 1]}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Text}
        name="blocks[0].text"
        label="Text"
        onChange={(e, v) => console.log(e, v)}
        validation={{ required: true }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        name={['blocks', 0, 'checkedNoValue']}
        id="checkbox"
        label="checkbox"
        onChange={(e, v) => console.log(e, v)}
        validation={{ required: true }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        id="checkbox-a"
        name="blocks[0].checked2@special chars/toto\tata"
        label="A"
        value="a"
        validation={{ group: 'cb' }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        id="checkbox-b"
        name="abc"
        label="B"
        value="b"
        validation={{ group: 'cb' }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        id="checkbox-c"
        name="abc"
        label="C"
        value="c"
        validation={{ group: 'cb' }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Tel}
        id="tel"
        label="Tel 1"
        validation={{
          group: 'tel',
          negativeRegExps: { 'Must be number': /^\d*$/ }
        }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Tel}
        id="tel2"
        className={'test'}
        label="Tel 2"
        validation={{
          group: 'tel',
          negativeRegExps: { 'Must be number': /^\d*$/ }
        }}
      />
      <ModularFormField formId="form" type={ModularFieldType.File} id="file" label="File" />
      <ModularFormField
        formId="form"
        className={'test'}
        type={ModularFieldType.File}
        id="files"
        onChange={(e, v) => console.log(e, v)}
        multiple
        label="Files"
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Select}
        id="select"
        label="select"
        onChange={(e, v) => console.log(e, v)}
      >
        <option>Sélectionner une option</option>
        <option value="value">Valeur</option>
      </ModularFormField>
      <ModularFormField
        formId="form"
        id="address-fields"
        type="address-fields"
        errorHtmlElement={'#address-errors'}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        name={['optionalCheck']}
        id="checkbox-optional"
        label="optional checkbox"
        onChange={(e, v) => console.log(e, v)}
      />
      <ModularFormField formId="form" id="optional" type="text" name="optional" label="optional" />

      <ModularFormField
        formId="form"
        type={ModularFieldType.Radio}
        id="radio-a"
        name="radio"
        label="A"
        value="a"
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Radio}
        id="radio-b"
        name="radio"
        label="B"
        value="b"
      />
      <ModularFormField
        formId="form"
        type={'date-picker'}
        id="date-picker"
        name="date"
        label="Date"
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Submit}
        id="submit"
        value="Submit"
        disableOnInvalidForm={true}
      />

      <div>
        Address errors should be deported here:
        <div id="address-errors"></div>
      </div>
    </ModularForm>
    <HookForm />
    <CoercionExample />
  </React.StrictMode>
);
