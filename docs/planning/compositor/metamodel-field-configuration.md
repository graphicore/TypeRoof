# Metamodel Field Configuration

Status: Design Discussion Record
Date: 2026-05-15

## Context

Not all metamodel fields participate in scope composition. Currently,
which fields become scope properties is controlled by whitelists
(`fieldsSet` in `getPropertiesBroomWagonGen`, `_skipPrefix` sets). This
is brittle — every new field requires manual inclusion or exclusion in
a separate location.

The generators that flatten model fields into the property map hard-code
prefix constants and field names, duplicating information that the model
definition already contains.

## Goal

Declare scope participation at the field definition site, eliminating
external whitelists and reducing the distance between model definition
and scope behavior.

## Design

### Configuration object on field tuples

The metamodel's `createClass` accepts field definitions as tuples. An
optional third element — a configuration object — declares how the field
participates in scope composition:

```js
const MyModel = _AbstractStructModel.createClass('MyModel'
    , ['fontSize', NumberModel, { scopeProperty: true }]
    , ['axesLocations', AxesLocationsModel, { scopeProperty: true }]
    , ['compositor', CompositorConfig]
    , ['animation', AnimationConfig]
);
```

Fields without a config object, or without `scopeProperty: true`, are
not scope properties. This is opt-in.

### Scope of the config object

The config object is intentionally minimal for now — `scopeProperty` is
the primary key. As the compositor design evolves, additional keys may
be added for scope-creation hints (e.g. how a container field flattens
into the property map, whether it creates a sub-scope).

The exact keys and their semantics are to be designed alongside the
compositor's builder implementation.

### Metamodel integration

The metamodel reads config objects during `createClass` and exposes them
as static metadata on the model class, following the existing pattern of
`fields`, `foreignKeys`, and other static properties. This makes scope
participation information available to:

- The **manifest** (the view of model structure used by both the
  compositor and the overlay system)
- The **generators** (which can derive key construction from the model
  rather than hard-coding prefixes)
- The **compositor builder** (which needs to know which fields to
  process)

### Relationship to other documents

- **`typed-property-map-design.md`**: The compositor consumes scope
  participation information to build typed property maps. The config
  object determines which fields appear in the map.
- **`property-metadata-overlays.md`**: The overlay system provides
  contextual metadata for fields that are scope properties. The manifest
  — which fields are scope properties — is informed by the config object.

## Open Areas

- Full set of config object keys beyond `scopeProperty`.
- How container fields (e.g. `AxesLocationsModel`) declare their
  flattening behavior.
- How dynamic struct fields interact with the config object — does the
  config apply to the dynamic field itself, to its variants, or both.
- Migration path from current whitelists to field-level configuration.
