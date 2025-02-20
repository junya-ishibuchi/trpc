/* eslint-disable @typescript-eslint/naming-convention */
import { Simplify } from '../../types';

/**
 * @link https://github.com/remix-run/remix/blob/2248669ed59fd716e267ea41df5d665d4781f4a9/packages/remix-server-runtime/serialize.ts
 */
type JsonPrimitive = boolean | number | string | null;
// eslint-disable-next-line @typescript-eslint/ban-types
type NonJsonPrimitive = Function | symbol | undefined;
/*
 * `any` is the only type that can let you equate `0` with `1`
 * See https://stackoverflow.com/a/49928360/1490091
 */
type IsAny<T> = 0 extends T & 1 ? true : false;

// `undefined` is a weird one that's technically not valid JSON,
// but the return value of `JSON.parse` can be `undefined` so we
// support it as both a Primitive and a NonJsonPrimitive
type JsonReturnable = JsonPrimitive | undefined;

// prettier-ignore
export type Serialize<T> =
  IsAny<T> extends true ? any :
  unknown extends T ? unknown :
  T extends JsonReturnable ? T :
  T extends Map<any, any> | Set<any> ? object :
  T extends NonJsonPrimitive ? never :
  T extends { toJSON(): infer U } ? U :
  T extends [] ? [] :
  T extends [unknown, ...unknown[]] ? SerializeTuple<T> :
  T extends readonly (infer U)[] ? (U extends NonJsonPrimitive ? null : Serialize<U>)[] :
  T extends object ? Simplify<SerializeObject<UndefinedToOptional<T>>> :
  never;

/** JSON serialize [tuples](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types) */
type SerializeTuple<T extends [unknown, ...unknown[]]> = {
  [k in keyof T]: T[k] extends NonJsonPrimitive ? null : Serialize<T[k]>;
};

// prettier-ignore
type SerializeObjectKey<T extends Record<any, any>, TKey> = 
  // never include entries where the key is a symbol
  TKey extends symbol ? never : 
  // always include entries where the value is any
  IsAny<T[TKey]> extends true ? TKey :
  // always include entries where the value is unknown
  unknown extends T[TKey] ? TKey : 
  // never include entries where the value is a non-JSON primitive
  T[TKey] extends NonJsonPrimitive ? never : 
  // otherwise serialize the value
  TKey;
/**
 * JSON serialize objects (not including arrays) and classes
 * @internal
 **/
export type SerializeObject<T extends object> = {
  [$Key in keyof T as SerializeObjectKey<T, $Key>]: Serialize<T[$Key]>;
};

type FilterDefinedKeys<TObj extends object> = Exclude<
  {
    [TKey in keyof TObj]: undefined extends TObj[TKey] ? never : TKey;
  }[keyof TObj],
  undefined
>;

/*
 * For an object T, if it has any properties that are a union with `undefined`,
 * make those into optional properties instead.
 *
 * Example: { a: string | undefined} --> { a?: string}
 */
type UndefinedToOptional<T extends object> =
  // Property is not a union with `undefined`, keep as-is
  Pick<T, FilterDefinedKeys<T>> & {
    // Property _is_ a union with `defined`. Set as optional (via `?`) and remove `undefined` from the union
    [k in keyof Omit<T, FilterDefinedKeys<T>>]?: Exclude<T[k], undefined>;
  };
