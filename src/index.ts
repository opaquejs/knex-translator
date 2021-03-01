import { NormalizedQuery } from "@opaquejs/query";

const OpaqueLucidComparatorMapping = {
  "==": "=",
  ">": ">",
  "<": "<",
  ">=": ">=",
  "<=": "<=",
  in: "in",
  "!=": "!=",
} as const;

export interface LucidLike {
  limit(n: number): this;
  offset(n: number): this;
  where(
    key: string,
    comparator: typeof OpaqueLucidComparatorMapping[keyof typeof OpaqueLucidComparatorMapping],
    value: any
  ): this;
  andWhere(m: (q: this) => this): this;
  orWhere(m: (q: this) => this): this;
}

export function translateOpaqueQueryToLucidModifier(source: NormalizedQuery) {
  return <T extends LucidLike>(lucid: T): T => {
    if (source._limit != undefined) {
      lucid = lucid.limit(source._limit);
    }
    if (source._skip != undefined) {
      lucid = lucid.offset(source._skip);
    }
    if ("key" in source) {
      return lucid.where(source.key, OpaqueLucidComparatorMapping[source.comparator], source.value as any);
    }
    if ("_and" in source) {
      for (const subsource of source._and) {
        lucid = lucid.andWhere(translateOpaqueQueryToLucidModifier(subsource));
      }
      return lucid;
    }
    if ("_or" in source) {
      for (const subsource of source._or) {
        lucid = lucid.orWhere(translateOpaqueQueryToLucidModifier(subsource));
      }
      return lucid;
    }
    return lucid;
  };
}
