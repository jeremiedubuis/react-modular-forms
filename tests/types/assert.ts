type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

// These fixtures are compiled, never executed. A mismatch requires an impossible argument.
export declare function expectTypeOf<A>(value: A): {
  toEqualTypeOf<B>(...mismatch: Equal<A, B> extends true ? [] : [never]): void;
  toMatchTypeOf<B>(...mismatch: [A] extends [B] ? [] : [never]): void;
};
