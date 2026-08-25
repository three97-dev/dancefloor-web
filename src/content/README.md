# Content

All copy lives in this directory. Components are structural and hold no prose, so
the argument can be edited without touching page or scene code.

| File | Holds |
| --- | --- |
| `site.ts` | Every homepage headline, the thirteen sections, seven acts, sixteen routes, nav and conversion events. |
| `resources.ts` | The two definitional articles, built to be quoted. |
| `campaigns.ts` | Paid-search landings. `adHeadline` must match the live ad verbatim. |
| `scene-data.ts` | Mock revenue data. This is why tile height means real book coverage rather than noise. |
| `types.ts` | Content types, including the `pending()` marker. |

## Pending copy

Headlines are verbatim from the content architecture. **Body prose is not.**

The architecture measured 4,916 live words from the rendered DOM but reproduces
only the H1s and H2s, so every body slot is marked `pending(...)` with a note
describing what belongs there. Pending slots render nothing rather than shipping
invented marketing copy.

Replace a slot by swapping the `pending(...)` call for the real string.

## Known gaps the architecture flagged

- **Pricing contradicts itself** — "flat annual, not per seat" against "we'll quote
  against your rep count". Reconcile with the real business model before launch.
- **Stack-size statistic in `#problem` is unsourced.** Substantiate or cut.
- **SOC 2 and the subprocessor list** must read *Documentation pending* rather than
  being implied.
- **No customer proof anywhere.** Degrades to nothing rather than an empty logo bar.
- **Legal pages are stubs** awaiting counsel, and are noindex so an empty page
  cannot be cited as the real terms.
