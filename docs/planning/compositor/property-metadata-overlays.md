# Property Metadata Overlays

Status: Design Discussion Record
Date: 2026-05-15

## Context

The application uses `REGISTERED_PROPERTIES` and
`ProcessedPropertiesSystemRecord` to associate metadata (labels, defaults,
min/max, step, inherit flags) with model fields. This system is cumbersome:

- Metadata is organized by prefix (`NUMERIC`, `COLOR`, `GENERIC`), not by
  model structure.
- Adding a property requires changes in multiple files: the model definition,
  the registry, the PPS record, the generator, and the consumer.
- The `ProcessedPropertiesSystemRecord` bridges three naming worlds (model
  field name, full key, registry key) — a triple-mapping problem that the
  code comments acknowledge as fragile.
- Generators hard-code prefixed key construction
  (`yield [\`${GENERIC}fontSize\`, ...]`) rather than deriving keys from the
  model.
- The same model field may need different labels or defaults in different
  contexts, but the registry is a single global structure.

## Goal

Replace `REGISTERED_PROPERTIES` and the PPS record system with a layered
metadata mechanism that:

- Mirrors the model structure rather than an ad-hoc prefix scheme
- Separates metadata (labels, defaults, ranges) from model definitions
  (structure, types, constraints)
- Supports contextual variation (same model, different metadata per usage)
- Eliminates the triple-mapping problem

## Design

### The manifest: a view of the model structure

The metamodel is the source of truth for what fields exist, their types,
and their structural relationships. The **manifest** is a view of this
structure — not a copy, not a separate definition. If the model changes,
the manifest changes.

The manifest provides the foundation for both the compositor (typed
property map construction, scope participation) and the overlay system
(metadata about model fields). See `typed-property-map-design.md` for
how the compositor uses the manifest.

Which fields appear in the manifest is determined by field-level scope
configuration on the model. See `metamodel-field-configuration.md`.

### Overlays

An **overlay** provides contextual metadata for model fields: labels,
default values, min/max ranges, step sizes, display hints. Overlays are
separate from the model — the model defines structure and type
constraints, the overlay defines how fields are presented and configured
in a given context.

#### Creating overlays

An overlay is created from a model or from another overlay:

```js
// Base overlay from a model
const typeSpecOverlay = Overlay.from(TypeSpecModel, {
    fontSize: { label: 'Font Size', default: 12, min: 6, max: 144, step: 0.5 }
  , textColor: { label: 'Text Color' }
});

// Derived overlay — inherits from base, overrides selectively
const captionOverlay = Overlay.from(typeSpecOverlay, {
    fontSize: { label: 'Caption Size', default: 9, max: 72 }
});
```

`Overlay.from(model, overrides)` creates a base overlay. The model
provides the field structure, the overrides provide the metadata.

`Overlay.from(overlay, overrides)` creates a derived overlay. It inherits
all metadata from the parent overlay and applies partial overrides.
Partial overrides merge — `captionOverlay` still has `min: 6` and
`step: 0.5` from the base.

#### Addressing nested fields

For static model structure, both path syntax and nested objects are
supported:

```js
// Path syntax — quick for reaching deep
Overlay.from(MyModel, {
    'leading/algorithm/a/lineWidth': { label: 'Line Width A', default: 33 }
})

// Nested — natural for configuring a subtree
Overlay.from(MyModel, {
    leading: {
        algorithm: {
            a: {
                lineWidth: { label: 'Line Width A', default: 33 }
            }
        }
    }
})
```

Both forms can coexist in the same overlay definition.

#### Dynamic structs

Dynamic structs (where the model structure varies by type key) cannot use
path syntax — a path through a dynamic struct is ambiguous because the
available fields depend on which variant is active.

Instead, overlays for dynamic struct variants are defined per-variant and
referenced via a `variants` map:

```js
const autoLinearOverlay = Overlay.from(AutoLinearLeadingModel, {
    'a/lineWidth': { label: 'Line Width A', default: 33 }
  , 'a/leading': { label: 'Leading A', default: 1.1 }
  , minLeading: { label: 'Min Leading', default: 1.1 }
});

const manualLeadingOverlay = Overlay.from(ManualLeadingModel, {
    leading: { label: 'Manual Leading', default: 1.3 }
});

const typeSpecOverlay = Overlay.from(TypeSpecModel, {
    fontSize: { label: 'Font Size', default: 12 }
  , leading: {
        variants: {
            'AutoLinearLeading': autoLinearOverlay
          , 'ManualLeading': manualLeadingOverlay
        }
    }
});
```

This rule is clean:
- **Static fields**: path syntax or nested objects
- **Dynamic fields**: `variants` map to per-variant overlays

No overloaded path syntax, no ambiguity, no name policing.

#### Validation

Since `Overlay.from` takes a model (or overlay derived from a model) as
its first argument, it can validate that referenced fields exist and that
metadata values are compatible with the field's type (e.g. `default: 12`
is valid for a `NumberModel` field, not for a `BooleanModel` field).

### Default values: model vs overlay

Default values in overlays are **not** model defaults. They are contextual
presentation defaults — what a UI widget shows, what a root scope starts
with. The model's own `defaultValue` (from `NumberModel`, `BooleanModel`,
etc.) remains the structural default for the metamodel layer.

### Relationship to existing code

- **`REGISTERED_PROPERTIES`**: Replaced by one or more base overlays. The
  current global registry becomes context-specific overlays.
- **`ProcessedPropertiesSystemRecord`**: The triple-mapping problem
  dissolves. The manifest (model structure view) provides field identity.
  The overlay provides metadata. No intermediate mapping layer needed.
- **`getFromRegistry` / `getRegisteredPropertySetup`**: Replaced by
  overlay lookups.
- **Generators**: Instead of hard-coding prefixed keys, generators work
  with the manifest. Key construction is derived from the model structure.
- **`UIshowProcessedProperties` and UI components**: Consume overlay
  metadata for labels and display. The compositor's typed property map
  provides the values.

### Relationship to the compositor

The manifest is the shared foundation. The compositor uses it to know
which fields are scope properties, what types they carry, and how to
construct the typed property map. The overlay system builds on the same
manifest to provide contextual metadata.

The overlay does **not** live in the `.compositor` metamodel field —
`.compositor` is user data (scope behavior configuration). Overlays are
application-level configuration, defined alongside or outside the model.

## Open Areas

- Exact API surface of the `Overlay` class.
- How overlays are registered and selected per context at runtime.
- Whether the base layer (manifest) is a separate object or an implicit
  aspect of the overlay when created from a model.
- Integration with the compositor's builder — how the builder accesses
  overlay defaults for root scope construction.
- How existing `REGISTERED_PROPERTIES` entries migrate to overlays.
