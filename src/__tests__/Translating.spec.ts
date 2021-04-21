import { NormalizedQuery } from "@opaquejs/query";
import { Example, examples, ignore, runAsTest } from "@opaquejs/testing";
import Knex from "knex";
import { parseOpaqueQuery, translateOpaqueQueryToKnexModifier } from "..";

const queries: [NormalizedQuery, string][] = [
  // Comparators
  [{ key: "key", comparator: "==", value: "test" }, "`key` = 'test'"],
  [{ key: "key", comparator: "!=", value: "test" }, "`key` != 'test'"],
  [{ key: "key", comparator: ">", value: "test" }, "`key` > 'test'"],
  [{ key: "key", comparator: "<", value: "test" }, "`key` < 'test'"],
  [{ key: "key", comparator: ">=", value: "test" }, "`key` >= 'test'"],
  [{ key: "key", comparator: "<=", value: "test" }, "`key` <= 'test'"],
  [{ key: "key", comparator: "in", value: ["test", "test 2"] }, "`key` in ('test', 'test 2')"],

  // Connected
  [
    {
      _or: [
        { key: "key", comparator: "==", value: "test 1" },
        { key: "key 2", comparator: "==", value: "test 2" },
      ],
    },
    "(`key` = 'test 1') or (`key 2` = 'test 2')",
  ],
  [
    {
      _and: [
        { key: "key", comparator: "==", value: "test 1" },
        { key: "key 2", comparator: "==", value: "test 2" },
      ],
    },
    "(`key` = 'test 1') and (`key 2` = 'test 2')",
  ],
  [
    {
      _and: [
        { key: "key", comparator: "==", value: "test 1" },
        {
          _or: [
            { key: "key", comparator: "==", value: "test 1" },
            { key: "key 2", comparator: "==", value: "test 2" },
          ],
        },
      ],
    },
    "(`key` = 'test 1') and ((`key` = 'test 1') or (`key 2` = 'test 2'))",
  ],

  [{ key: "key", comparator: "==", value: "test 1", _limit: 1 }, "`key` = 'test 1' limit 1"],
  [
    { key: "key", comparator: "==", value: "test 1", _skip: 1 },
    "`key` = 'test 1' limit 18446744073709551615 offset 1",
  ],
  [
    { key: "key", comparator: "==", value: "test 1", _skip: 1, _limit: 2 },
    "`key` = 'test 1' limit 2 offset 1",
  ],
  [{ key: "key", comparator: "==", value: null }, "`key` is null"],
  [{ key: "key", comparator: "!=", value: null }, "`key` is not null"],

  // Ordering
  [
    { key: "dummy", comparator: "==", value: null, _orderBy: [{ key: "title", direction: "asc" }] },
    "`dummy` is null order by `title` asc",
  ],
  [
    {
      key: "dummy",
      comparator: "==",
      value: null,
      _orderBy: [
        { key: "title", direction: "asc" },
        { key: "description", direction: "desc" },
      ],
    },
    "`dummy` is null order by `title` asc, `description` desc",
  ],
];

@runAsTest()
export class Translating {
  _knex() {
    return Knex({
      client: "mysql",
    });
  }

  @examples(...queries)
  translatedCorrectly(opaquequery: Example<NormalizedQuery>, sql: Example<string>) {
    const { applyGlobals, build } = parseOpaqueQuery(opaquequery);
    expect(applyGlobals(build(this._knex().queryBuilder())).toQuery()).toBe(
      `select * where ${sql}`.trim()
    );
  }

  scoped() {
    const { build } = parseOpaqueQuery({ key: "test", comparator: "==", value: "value" });
    const result = this._knex().queryBuilder().where(build);
    expect(result.toQuery()).toBe("select * where (`test` = 'value')");
  }
}
