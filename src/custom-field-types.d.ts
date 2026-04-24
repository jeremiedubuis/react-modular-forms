// Local augmentation for the demo app to provide strong typing for the 'custom-field' value
import type { CustomFieldValueMap } from './lib';

export type DummyUser = {
  id: number;
  firstname: string;
  lastname: string;
  age: number;
};

declare module './lib' {
  interface CustomFieldValueMap {
    'custom-field': DummyUser;
    'date-picker': Date;
  }
}
