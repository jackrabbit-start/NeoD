# NeoD Docs Schema

This repo organizes docs using the `raw sources / wiki / schema` pattern described in Karpathy's LLM wiki gist.

## Layers

### Raw Sources

Raw sources are immutable or externally-owned inputs. They are read, cited, and synthesized into the wiki layer, but should not be treated as the place for ongoing synthesis.

For NeoD, typical raw sources include:

- `README.md`
- `.omx/specs/`
- `.omx/context/`
- external references and research artifacts

The landing page for this layer is [raw/README.md](raw/README.md).

### Wiki

The wiki is the maintained markdown knowledge layer for the repo. It contains synthesized, updated, cross-referenced documentation pages that are meant to evolve with the project.

NeoD stores wiki pages under [wiki/](wiki/).

### Schema

The schema tells humans and agents how the docs are structured and maintained.

For NeoD, the schema layer is:

- this file: [schema.md](schema.md)
- [AGENTS.md](../AGENTS.md) for workflow and agent behavior

## Required Special Files

- [index.md](index.md): content-oriented catalog of the wiki.
- [log.md](log.md): chronological append-only record of documentation changes.

## Maintenance Rules

- Add or update synthesized repo documentation under `docs/wiki/`.
- Update `docs/index.md` whenever a wiki page is added, removed, or renamed.
- Append a new entry to `docs/log.md` when the docs structure changes materially.
- Do not duplicate raw-source content into multiple places without synthesis value.
- Prefer linking raw sources from wiki pages instead of copying large source text.
