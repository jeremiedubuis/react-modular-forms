import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ModularFieldType,
  ModularForm,
  ModularFormField,
  registerType,
  FieldComponentProps,
  config
} from './lib';

config.sendEmptyStringsAs = undefined;

registerType('custom-field', {
  Component: ({ componentRef, onChange, onBlur, onFocus }) => (
    <input type="text" onChange={onChange} onBlur={onBlur} onFocus={onFocus} ref={componentRef} />
  ),
  getValue: (ref) => ref.current.value
});

registerType('address-fields', {
  Component: ({
    formId,
    prefix = '',
    errorHtmlElement
  }: FieldComponentProps & { prefix?: string }) => {
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

createRoot(document.getElementById('app')).render(
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
        validation={{ required: true }}
      />
      <ModularFormField
        formId="form"
        type={ModularFieldType.Checkbox}
        name={['blocks', 0, 'checkedNoValue']}
        id="checkbox"
        label="checkbox"
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
        multiple
        label="Files"
      />
      <ModularFormField formId="form" type={ModularFieldType.Select} id="select" label="select">
        <option>Sélectionner une option</option>
        <option value="value">Valeur</option>
      </ModularFormField>
      <ModularFormField
        formId="form"
        id="address-fields"
        type="address-fields"
        errorHtmlElement={'#address-errors'}
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
  </React.StrictMode>
);
