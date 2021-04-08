import { NormalizedQuery } from "@opaquejs/query";

export const OpaqueKnexComparatorMapping = {
  "==": "=",
  ">": ">",
  "<": "<",
  ">=": ">=",
  "<=": "<=",
  in: "in",
  "!=": "!=",
} as const;

export interface KnexLike {
  limit(n: number): this;
  offset(n: number): this;
  where(
    key: string,
    comparator: typeof OpaqueKnexComparatorMapping[keyof typeof OpaqueKnexComparatorMapping],
    value: any
  ): this;
  whereNull(key: string): this;
  andWhere(m: (q: this) => this): this;
  orWhere(m: (q: this) => this): this;
}

export function translateOpaqueQueryToKnexModifier(source: NormalizedQuery) {
  return <T extends KnexLike>(knex: T): T => {
    if (source._limit != undefined) {
      knex = knex.limit(source._limit);
    }
    if (source._skip != undefined) {
      knex = knex.offset(source._skip);
    }
    if ("key" in source) {
      if (source.value === null) {
        return knex.whereNull(source.key);
      }
      return knex.where(
        source.key,
        OpaqueKnexComparatorMapping[source.comparator],
        source.value as any
      );
    }
    if ("_and" in source) {
      for (const subsource of source._and) {
        knex = knex.andWhere(translateOpaqueQueryToKnexModifier(subsource));
      }
      return knex;
    }
    if ("_or" in source) {
      for (const subsource of source._or) {
        knex = knex.orWhere(translateOpaqueQueryToKnexModifier(subsource));
      }
      return knex;
    }
    return knex;
  };
}
