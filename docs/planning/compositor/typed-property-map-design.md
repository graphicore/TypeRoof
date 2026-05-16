# Typed Property Map Design

Status: Design Discussion Record
Date: 2026-05-15

## Context

The application uses a flat `Map<string, unknown>` as a data routing layer
(the "property values map"). This map receives values from metamodel instances,
where structured model data is destructured and the path is used as a key.
The flat shape makes inheritance straightforward — child maps override parent
map entries by key.

Currently, values in this map are untyped. The string keys encode a prefix
(e.g. `numericProperties/`, `colors/`, `generic/`) that hints at the value
type, but this is not enforced. Consumers do runtime type sniffing
(`typeof`, `isCuloriColor`, `key.startsWith(...)`) to interpret values.

## Goal

Make the identity of a value in the map **type + path**. Two entries with
the same path but different types are distinct. This enables:

- Type safety at the TypeScript level without runtime overhead at the
  consumer boundary
- Elimination of string-prefix parsing as the type discrimination mechanism
- A clean path toward typed inheritance behavior and synthetic value
  resolution

## Module Scope

The compositor **composes scopes**. A scope is a resolved typed property
map. How the composition happens — hierarchical inheritance, temporal
interpolation, or other means — is a matter of configuration and wiring
within the module.

The compositor contains two primary sub-concerns:

- **Hierarchical/spatial scope composition**: Parent scopes provide values
  to child scopes via the purpose/destiny mechanism. Inheritance behavior
  is configured per scope in the metamodel under `.compositor`.
- **Temporal scope composition**: Keymoments define how properties change
  over time within a scope. Interpolation, easing, transformation functions,
  and loops produce a resolved scope at a given time `t`. Temporal behavior
  is configured in the metamodel under `.animation`.

These sub-concerns share infrastructure — the typed property map, the
builder, dependency resolution — but have distinct mechanics and distinct
metamodel configuration. The animation sub-system has characteristics
(keymoment loops, transformation functions between moments) that differ
from hierarchical inheritance. Shared modules are expected; full
unification into one mechanism is not assumed.

## Design Decisions

### 1. JS primitive types, not metamodel types

The metamodel type system (`NumberModel`, `BooleanModel`, `StringModel`,
`_AbstractGenericModel` subclasses) is valuable in the model layer for
validation, sanitization, and serialization. However, once values cross the
flattening boundary into the property values map, the relevant type vocabulary
is simpler:

- `number`
- `string`
- `boolean`
- Culori color objects

The metamodel remains the **source of truth** for what type a given path
should hold. A manifest (derived from the metamodel) can communicate this
to consumers. But the property map itself operates on JS-level types.

Rationale: metamodel container types (e.g. `OrEmpty` wrappers, `OrderedMap`
of `NumberModel`) would create excessive sub-map proliferation for no
consumer benefit. The flattened map is a different domain — interpolation,
CSS application, inheritance merging — and those operations care about
the JS value type.

### 2. Per-type sub-maps with symbol type tokens

The property map is internally a collection of typed sub-maps, keyed by
`unique symbol` type tokens:

```ts
export const NUMBER: unique symbol = Symbol('NUMBER');
export const STRING: unique symbol = Symbol('STRING');
export const BOOLEAN: unique symbol = Symbol('BOOLEAN');
export const COLOR: unique symbol = Symbol('COLOR');

type TypeTokenMap = {
    [NUMBER]: number;
    [STRING]: string;
    [BOOLEAN]: boolean;
    [COLOR]: CuloriColor;
};
```

This gives TypeScript full type narrowing without conditional types or
template literal tricks:

```ts
map.get(NUMBER, 'x')   // number | undefined
map.get(COLOR, 'textColor')  // CuloriColor | undefined
map.set(COLOR, 'textColor', 42)  // compile error
```

The identity of a value is `(TypeToken, path)`. It is valid to have
`(NUMBER, 'x')` and `(STRING, 'x')` as distinct entries.

### Extensible type tokens

The four built-in type tokens (`NUMBER`, `STRING`, `BOOLEAN`, `COLOR`)
cover the common cases. Domain-specific value types can register
additional typed maps on demand by declaring a new symbol token:

```ts
// In the font module
export const FONT: unique symbol = Symbol('FONT');
declare module './property-map' {
    interface TypeTokenMap {
        [FONT]: FontObject;
    }
}
```

TypeScript's module augmentation extends the `TypeTokenMap` interface
from anywhere. At runtime, the `PropertyValuesMap` creates a new inner
`Map` the first time it encounters an unknown token.

This keeps the system open — no `Map<string, unknown>` escape hatch is
needed. Every value has a declared type. The built-in tokens are just the
ones that ship by default; adding a new one is declaring a symbol and
extending the type token map.

Proliferation of tokens is a governance question, not a technical
limitation.

### 3. Old prefix constants are replaced

The prefix constants (`NUMERIC = 'numericProperties/'`,
`COLOR = 'colors/'`, `GENERIC = 'generic/'`, etc.) served a dual role:
namespace and type hint. Both roles are now covered by the type tokens
and the path structure. The `GENERIC` prefix, which mixed numbers, strings,
and booleans, no longer needs to exist — its contents distribute across
the appropriate typed sub-maps.

The metamodel provides the information that consumers previously derived
from prefixes (e.g. "this is a color, extract it accordingly"). A manifest
derived from the metamodel can formalize this mapping.

### 4. Legacy bridge via overloaded access

During migration, the old-style string keys (`'numericProperties/x'`)
continue to work through a compatibility path:

```ts
interface PropertyValuesMap {
    // New style — fully typed
    get<T extends TypeToken>(type: T, path: string): TypeTokenMap[T] | undefined;
    // Legacy — works, returns unknown, emits deprecation warning
    get(legacyKey: string): unknown;
}
```

The legacy accessor parses the prefix, routes to the correct typed sub-map,
and warns. Consumers are motivated to migrate because the legacy path
returns `unknown`. The mapping from old prefixes to type tokens lives in
one place and can be removed when migration is complete.

### 5. Synthetic values and the builder

Synthetic values are functions with named dependencies that compute one or
more property values. They exist in two modes:

- **Non-propagating**: Resolves to a concrete value in the current scope.
  Children inherit the concrete result.
- **Propagating**: Resolves to a concrete value in the current scope AND
  is inherited as a synthetic definition. Children re-evaluate it against
  their own scope (where dependencies may have different concrete values).

A **builder** is the transitional object that constructs a `PropertyValuesMap`.
It accepts:

- Concrete values (from the broom wagon / generators)
- Synthetic definitions (from generators)
- A parent `PropertyValuesMap` (for inheritance)

The builder handles dependency resolution (topological sort), synthetic
evaluation, and inheritance merging. The resulting `PropertyValuesMap` is
immutable and contains only concrete, typed values from the consumer
perspective. Propagating synthetic definitions are carried internally for
child builders to access.

### 6. Inheritance behavior is a general property attribute

Inheritance behavior (inherit / don't inherit / propagate-as-synthetic)
is not specific to synthetics — it is a general attribute of any entry
in the property map. A concrete value can be non-inheriting. A synthetic
can be inheriting. The builder handles all cases uniformly.

*Detailed mechanics of inheritance behavior are intentionally left open
for future design work.*

## Inheritance: Purpose and Destiny

### Roles

Inheritance is defined by two roles:

- **Provider** (parent scope): Declares one or more **purposes** for a value.
  A purpose is a tag that describes what the value is for.
- **Receiver** (child scope): Declares **destiny** — a **selector** that
  matches against available purposes, plus one or more **slots** that define
  what happens with the matched value.

### Slots

A slot defines a single action for a matched value. A destiny's selector
can have multiple slots, each performing one action independently:

- **Local property**: The value becomes a concrete property in this scope.
- **Re-route**: The value is re-published under a different purpose for
  children further down.
- **Pass-through**: The value propagates unchanged with its original purpose.

These are not mutually exclusive. A single selector match can trigger
multiple slots — e.g. store locally AND re-route under a new purpose AND
pass through under the original purpose.

### Purpose sets

A provider can declare multiple purposes for a single value. The purpose
set `{"body-text", "foreground"}` means the value matches a selector for
`"body-text"` or `"foreground"` independently.

### Eigen properties

A value with an empty purpose set is local-only — invisible to children,
not propagated. No separate concept is needed; the eigen/inherited
distinction is a natural consequence of the purpose mechanism.

### Selector resolution

When multiple parent values match a selector, resolution must be
deterministic and controllable. Ordering and scope distance are candidates.
Exact resolution rules are intentionally left open for future design work.

### Default behavior

The default inheritance behavior mirrors the current system: properties
marked as inheriting pass through. A scope can override this default
via its compositor configuration — e.g. blocking all inheritance unless
explicitly slotted. The default itself is configurable per scope in the
`.compositor` field of the metamodel.

### Configuration

The purpose/destiny configuration lives in the metamodel as a field
(e.g. `.compositor`) on the model that defines the scope. Leaf consumers
primarily use receiver/destiny mechanisms. Root providers primarily use
provider/purpose mechanisms. Scopes in the middle do both.

### Builder inspection and tracing

The builder is the single place where resolution happens — purpose matching,
slot routing, synthetic evaluation, scope merging. It is also the natural
place to instrument.

Tracing is opt-in at runtime, not a development-only concern. Like browser
DevTools (computed styles panel, cascade inspection), tracing is always
available to the user — a designer working with the software can opt in
to see how each value arrived at its destination. When tracing is not
requested, there is zero overhead.

When enabled, the builder produces trace records alongside the resolved
values: which purpose matched which selector, what slots fired, what was
re-routed, what synthetics were evaluated, what was dropped. This trace
is part of the builder's output and can be consumed by UI inspection
components.

The builder's architecture must not discard information that tracing would
need. The resolution logic must be instrumentable on demand without
requiring a separate code path.

### Open areas (Purpose and Destiny)

- Exact selector resolution rules (ordering, distance, specificity).
- Interaction between propagating synthetics and the purpose/destiny
  mechanism.

## Open Areas

- **Inheritance mechanics**: The precise rules for how the builder merges
  parent and child entries — override semantics, conflict resolution,
  interaction between concrete and synthetic values across scopes.

- **Manifest design**: How the metamodel-derived manifest is structured
  and consumed. Whether it is a type-level construct (for TypeScript
  narrowing) or a runtime object (for dynamic dispatch), or both.

- **Iteration API**: How consumers iterate over all properties regardless
  of type (needed for some existing patterns like `setTypographicPropertiesToSample`).

- **Migration path**: Concrete steps for transitioning existing code from
  prefix-string keys to typed access.

## Relationship to Existing Code

- `ProcessedPropertiesSystemRecord`: Currently carries `prefix`, `fullKey`,
  `modelFieldName`, `registryKey`. Parts of this may evolve into or be
  replaced by the manifest.

- `REGISTERED_PROPERTIES`: Currently mirrors the prefix → property-set
  structure. Would be superseded by the type-token–based structure.

- `childrenPropertiesBroomWagonGen`: The flattening step. Currently yields
  `[prefixedPath, item.value]`. Would yield into the builder with type
  information derived from the model.

- `SyntheticValue`: Current implementation. Would gain typed dependencies
  and return type, and a propagation mode.

- `LocalScopeTypeSpecnion.resolveSyntheticProperties`: Current resolution
  logic. Would move into the builder.

- `LocalScopeAnimanion` / `DependentValue`: Parallel system in the
  animation layer with similar dependency resolution. Candidate for
  unification with the builder.
