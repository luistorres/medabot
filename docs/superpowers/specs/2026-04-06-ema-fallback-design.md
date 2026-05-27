# EMA Fallback for INFARMED PDF Retrieval

## Problem

MedaBot's PDF retrieval depends entirely on INFARMED's website via Playwright browser automation. When INFARMED search fails or PDF download fails, users get nothing.

## Solution

Add EMA (European Medicines Agency) as a fallback source for Portuguese medicine product information PDFs. EMA provides 2,167 Portuguese PDFs via direct HTTP -- no browser automation.

## Key Facts

- EMA medicines JSON: 2,679 medicines (1,846 authorised), 6.6 MB, ~22ms parse
- EPAR documents JSON: 19,581 docs, 2,167 product info PDFs with Portuguese translations and explicit URLs
- Portuguese PDFs are full RCM+PIL documents, identical RCM structure to INFARMED
- No API key, no auth, no documented rate limits
- Coverage: centrally authorised medicines only (NOT OTC like paracetamol, ibuprofen)

---

## Architecture

INFARMED primary, EMA fallback only after INFARMED has fully failed.

```
Phase 1:   Cache check
           |-- INFARMED key hit -> return (source: infarmed)
           |-- EMA key hit -> return (source: ema)
           |-- Force refresh -> delete BOTH infarmed AND ema keys, continue
           |-- Miss -> continue

Phase 1.5: Local DB search (authorized.xlsx) -> unchanged, no EMA here

Phase 2:   Playwright INFARMED search
           |-- Results found -> Phase 3 (unchanged)
           |-- ALL strategies fail -> try EMA fallback
               |-- Found -> download PDF -> cache -> return (source: ema)
               |-- Not found -> return failure

Phase 3:   Playwright PDF download
           |-- Success -> cache -> return (source: infarmed)
           |-- Failure -> try EMA fallback
               |-- Found -> download PDF -> cache -> return (source: ema)
               |-- Not found -> return failure
```

No EMA at Phase 1.5: INFARMED Playwright gets its full shot including disambiguation.

---

## New module: `app/core/emaFallback.ts`

### `searchEMA(name, activeSubstance?): Promise<EMAMatch | null>`

**Data loading** -- promise singleton, lazy:
```typescript
let emaCachePromise: Promise<EMAMedicine[]> | null = null;
function getEmaData(): Promise<EMAMedicine[]> {
  if (!emaCachePromise) {
    emaCachePromise = fetchAndParseEmaJson().catch(err => {
      emaCachePromise = null; // allow retry
      throw err;
    });
  }
  return emaCachePromise;
}
```

**JSON validation**: after parse, MUST verify `data` is array with length > 0, first entry has `name_of_medicine`, `active_substance`, `medicine_url`. If invalid, return null, log error.

**Name normalization before matching**:
- Extract brand name (first token) from AI input: `"Ozempic 1mg caneta pré-cheia"` -> `"Ozempic"`
- EMA names are clean brand names: `"Ozempic"`, `"Eliquis"`

**Two-tier safety thresholds**:
- With active substance: require `brandSimilarity >= 0.7` AND `substanceSimilarity >= 0.5`
- Without active substance: require `brandSimilarity >= 0.85`
- Combined score: `brandSim * 0.7 + substSim * 0.3`
- MUST add offline evaluation corpus before rollout (see Verification section)

```typescript
interface EMAMatch {
  name: string;
  activeSubstance: string;
  slug: string;
  pdfUrl: string;
  confidence: number;
  therapeuticArea: string;
  holder: string;
}
```

### `downloadEMAPdf(slug, medicineName?): Promise<Buffer | null>`

**Two-tier URL resolution** (not just slug construction):

1. **Tier 1**: Construct URL from slug:
   `https://www.ema.europa.eu/pt/documents/product-information/${slug}-epar-product-information_pt.pdf`
2. **Tier 2** (if Tier 1 fails): Lazy-load EPAR documents JSON, search by medicine name for explicit PT URL in `translations.pt` field. Cache this JSON alongside medicines JSON in the same promise singleton.

**PDF validation** (MUST, not optional):
- Buffer starts with `%PDF`
- Extract first 2000 chars via pdf-parse, check for `"RESUMO DAS CARACTERÍSTICAS DO MEDICAMENTO"` or `"ANEXO I"`. Reject if absent (English redirect detected).

---

## Modifications to `app/core/regulatoryPdf.ts`

### Single-attempt guard

```typescript
// At top of regulatoryPDF():
let emaAttempted = false;

async function tryEMAFallbackOnce(
  medicineInfo: MedicineSearchInput,
  cacheKey: string
): Promise<RegulatoryPDFResult | null> {
  if (emaAttempted) return null;
  emaAttempted = true;
  try {
    const match = await searchEMA(medicineInfo.name, medicineInfo.activeSubstance);
    if (!match) return null;
    const pdfBuffer = await downloadEMAPdf(match.slug, match.name);
    if (!pdfBuffer) return null;
    setCachedPdf(`ema:${cacheKey}`, { ... });
    return { rcm: pdfBuffer, ..., source: 'ema' };
  } catch (err) {
    console.error('EMA fallback failed:', err);
    return null;
  }
}
```

### 2 insertion points

1. After all Playwright search strategies fail (~line 450)
2. After Playwright PDF download fails (~line 583)

### Cache key strategy

- INFARMED entries: `"ozempic|1 mg"` (unchanged)
- EMA entries: `"ema:ozempic|1 mg"` (prefixed)
- Fallback policy lives in `regulatoryPdf.ts`, NOT in `db.ts`:

```typescript
// Phase 1 cache check -- explicit reads, deterministic source
const infarmedCached = getCachedPdf(cacheKey);
if (infarmedCached) return { ...infarmedCached, source: 'infarmed' };

const emaCached = getCachedPdf(`ema:${cacheKey}`);
if (emaCached) return { ...emaCached, source: 'ema' };
```

### Force refresh policy

When `forceRefresh === true`, delete BOTH keys:
```typescript
if (forceRefresh) {
  deleteCachedPdf(cacheKey);
  deleteCachedPdf(`ema:${cacheKey}`);
}
```

### Source field on return type

Add `source?: 'infarmed' | 'ema'` to `RegulatoryPDFResult` interface (~line 265). Set `source: 'infarmed'` on all existing success paths.

---

## UI source badge -- full state plumbing

### `app/server/fetchRegulatoryPdf.ts`
Add `source` to the response object alongside `data`, `confidence`, `matchedMedicine`:
```typescript
return {
  data: result.rcm.toString("base64"),
  ...,
  source: result.source || 'infarmed',
};
```

### `app/components/App.tsx`
New state variable:
```typescript
const [pdfSource, setPdfSource] = useState<'infarmed' | 'ema'>('infarmed');
```

Set it when PDF response arrives (~line 109):
```typescript
setPdfSource(pdfResponse.source || 'infarmed');
```

Reset on `handleReset`:
```typescript
setPdfSource('infarmed');
```

Pass to MedicineInfoPanel (~line 419):
```typescript
<MedicineInfoPanel
  medicineInfo={medicineInfo}
  pdfSource={pdfSource}
  ...
/>
```

### `app/components/MedicineInfoPanel.tsx`
Add prop `pdfSource: 'infarmed' | 'ema'` to interface (~line 7).

Render badge near the medicine name:
```tsx
<span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
  pdfSource === 'ema'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-green-100 text-green-700'
}`}>
  {pdfSource === 'ema' ? 'EMA' : 'INFARMED'}
</span>
```

---

## Files changed

| File | Change |
|------|--------|
| `app/core/emaFallback.ts` | **NEW** -- EMA JSON loading (promise singleton), search with safety thresholds, two-tier PDF download, Portuguese content validation |
| `app/core/regulatoryPdf.ts` | Add `source` to return type, explicit dual-key cache reads, force-refresh deletes both keys, `tryEMAFallbackOnce` helper, 2 insertion points |
| `app/server/fetchRegulatoryPdf.ts` | Pass `source` field to client |
| `app/components/App.tsx` | New `pdfSource` state, set from response, pass as prop, reset on new search |
| `app/components/MedicineInfoPanel.tsx` | New `pdfSource` prop, render source badge |

`db.ts` is NOT changed. Fallback key logic stays in `regulatoryPdf.ts`.

---

## Risks

| Risk | Sev | Mitigation |
|------|-----|------------|
| Wrong medicine match | P0 | High thresholds (0.85 name-only, 0.7+0.5 dual). Offline evaluation corpus required before rollout. |
| Source badge lies on cache hit | P0 | Explicit dual-key reads with deterministic source assignment. |
| Force refresh returns stale EMA data | P0 | Delete both `cacheKey` and `ema:${cacheKey}` on refresh. |
| EMA slug URL breaks | P1 | Two-tier resolution: slug construction first, EPAR documents JSON lookup second. |
| UI can't render source (missing plumbing) | P1 | Full state chain specified: server -> App.tsx `pdfSource` state -> MedicineInfoPanel prop. |
| No unit test infra | P2 | Add test script with mocked HTTP fixtures (deterministic integration tests), not unit tests. |
| Concurrent fallback fetches | P2 | Promise singleton pattern. |
| EMA returns malformed JSON | P2 | Validate structure, return null, allow retry. |

## Verification

1. **Offline evaluation corpus** (MUST before rollout):
   - Build a set of 30+ medicine name pairs: AI-identified Portuguese names vs EMA English names
   - Include adversarial cases: Lyrica/Lixiana, Xarelto/Xalkori, branded families, Portuguese INN variants
   - Run through matching logic, measure false positive rate and reject rate
   - Acceptance gate: zero false positives on the test set

2. **Integration tests** (mocked HTTP, no external calls):
   - Mock EMA medicines JSON and EPAR documents JSON
   - Test: known medicine matches with correct slug and confidence
   - Test: similar-name medicines do NOT match (below threshold)
   - Test: slug URL failure triggers tier-2 EPAR documents lookup
   - Test: English PDF redirect is detected and rejected
   - Test: cache key isolation (EMA vs INFARMED)
   - Test: force refresh clears both keys

3. **Manual E2E**:
   - EMA-covered medicine with INFARMED working -> INFARMED badge
   - Simulate INFARMED failure -> EMA badge, correct PDF
   - INFARMED-only medicine -> INFARMED badge, EMA returns null
   - Force refresh with EMA-cached entry -> re-fetches, not stale
