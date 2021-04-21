import { NormalizedQuery, OrderEntry } from "@opaquejs/query";

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
  whereNotNull(key: string): this;
  andWhere(m: (q: this) => this): this;
  orWhere(m: (q: this) => this): this;
  orderBy(config: { column: string; order: "asc" | "desc" }[]): this;
}

export function translateOrderBy(source: OrderEntry[]) {
  return source.map((entry) => ({ column: entry.key, order: entry.direction }));
}

export function parseOpaqueQuery(source: NormalizedQuery) {
  return {
    build: translateOpaqueQueryToKnexModifier(source),
    applyGlobals: <T extends KnexLike>(query: T) => {
      if (source._limit != undefined) query = query.limit(source._limit);
      if (source._skip != undefined) query = query.offset(source._skip);
      if (source._orderBy != undefined) query = query.orderBy(translateOrderBy(source._orderBy));

      return query;
    },
    get orderBy() {
      return translateOrderBy(source._orderBy || []);
    },
    get limit() {
      return source._limit;
    },
    get offset() {
      return source._skip;
    },
  };
}

export function translateOpaqueQueryToKnexModifier(source: NormalizedQuery) {
  return <T extends KnexLike>(knex: T): T => {
    if ("key" in source) {
      if (source.value === null && source.comparator == "==") {
        return knex.whereNull(source.key);
      }
      if (source.value === null && source.comparator == "!=") {
        return knex.whereNotNull(source.key);
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
