"""Independent source-row/censoring and Decimal check; not a brine EOS.

--source-pdf FILE --write-source-check verifies the pinned original locally.
The default offline CI path checks the retained packet, not a newly fetched PDF.
PDF token order is checked automatically; blank column alignment was visually
reviewed against the rendered pages and is not certified by token order alone.
"""
import argparse
from decimal import Decimal, localcontext
import hashlib
import json
from pathlib import Path
import re

root = Path(__file__).resolve().parent
data = json.loads((root / 'source.json').read_text(encoding='utf-8'))
parser = argparse.ArgumentParser()
parser.add_argument('--source-pdf', type=Path)
parser.add_argument('--write-source-check', action='store_true')
args = parser.parse_args()
pattern = r'<?(?:0|[1-9]\d*)(?:\.\d+)?(?:E[+-]\d+)?'


def expected_tokens(row):
    return [str(n) for n in row['observedSizeUm']] + [row['homogenizationC'], row['salinityNaClEquivalentWtPercent']] + [x for x in row['cells'] if x]


if args.source_pdf:
    # Optional read-only source authentication uses bundled pypdf locally.
    from pypdf import PdfReader
    raw = args.source_pdf.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == data['source']['pdfSha256']
    reader = PdfReader(args.source_pdf)
    rows = []
    for row in data['observations']:
        prefix = row['sample'] + ' ' + str(row['inclusion']) + ' '
        lines = [s.strip() for s in reader.pages[row['pdfPage'] - 1].extract_text().splitlines() if s.strip().startswith(prefix)]
        assert len(lines) == 1
        tokens = re.findall(pattern, lines[0][len(prefix):])
        assert tokens == expected_tokens(row), (row['id'], tokens, expected_tokens(row))
        rows.append(dict(id=row['id'], pdfPage=row['pdfPage'], rawRow=lines[0], numericTokens=tokens))
    check = dict(schema='vugg-fluid-source-pdf-row-check-v1', pdfSha256=data['source']['pdfSha256'],
                 method='pypdf original page text; exact nonblank numerical/censoring token sequence',
                 limitation='blank-column alignment requires visual table inspection; no source recipe completeness is proved', rows=rows)
    if args.write_source_check:
        (root / 'source-check.json').write_text(json.dumps(check, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    else:
        assert check == json.loads((root / 'source-check.json').read_text(encoding='utf-8'))
    print(json.dumps(dict(sourcePdfVerified=True, rows=len(rows), numericalAndCensoringTokens=sum(len(r['numericTokens']) for r in rows))))
    if args.write_source_check:
        raise SystemExit(0)
elif args.write_source_check:
    parser.error('--write-source-check requires the original --source-pdf')

check = json.loads((root / 'source-check.json').read_text(encoding='utf-8'))
receipt = json.loads((root / 'receipt.json').read_text(encoding='utf-8'), parse_float=Decimal)
assert check['pdfSha256'] == data['source']['pdfSha256']
assert len(check['rows']) == len(data['observations']) == len(receipt['observations']) == 3
checked = 0
with localcontext() as ctx:
    ctx.prec = 60
    eps = Decimal(2) ** -52
    status_counts = {}
    for raw, packet, observed in zip(data['observations'], check['rows'], receipt['observations']):
        assert raw['id'] == packet['id'] == observed['id']
        assert packet['numericTokens'] == expected_tokens(raw)
        prefix = raw['sample'] + ' ' + str(raw['inclusion']) + ' '
        assert packet['rawRow'].startswith(prefix)
        assert re.findall(pattern, packet['rawRow'][len(prefix):]) == packet['numericTokens']
        for element, token in zip(data['columns'], raw['cells']):
            cell = observed['elements'][element]
            assert cell['raw'] == token and cell['unit'] == 'reported_ppm'
            status = ('not-reported-host-interference' if raw['host'] == 'sphalerite' and element in ('Cu', 'Zn') else 'not-reported') if not token else 'reported-upper-limit' if token.startswith('<') else 'derived-internal-standard' if element == 'Cl' else 'reported-normalized-estimate'
            assert cell['status'] == status
            status_counts[status] = status_counts.get(status, 0) + 1
            assert cell['value'] is None if not token or token.startswith('<') else Decimal(str(cell['value'])) == Decimal(token)
            assert cell['reportedUpperLimit'] is None if not token.startswith('<') else Decimal(str(cell['reportedUpperLimit'])) == Decimal(token[1:])
            checked += 1
        assert observed['waterKg'] is None and observed['absoluteComponentMoles'] is None
        assert observed['prehistorySourceEligible'] is False
    assert status_counts == receipt['cellStatusCounts']
    for ratio in receipt['ratios']:
        row = next(x for x in data['observations'] if x['id'] == ratio['observationId'])
        cells = dict(zip(data['columns'], row['cells']))
        a, b = cells[ratio['numerator']], cells[ratio['denominator']]
        if not a or not b or b.startswith('<') or Decimal(b) == 0:
            assert ratio['status'] == 'unresolved' and ratio['value'] is None and ratio['reportedUpperLimit'] is None
        else:
            expected = Decimal(a.lstrip('<')) / Decimal(b)
            key = 'reportedUpperLimit' if a.startswith('<') else 'value'
            expected_status = 'reported-upper-limit' if a.startswith('<') else 'ratio-of-reported-estimates'
            assert ratio['status'] == expected_status
            actual = Decimal(str(ratio[key]))
            assert abs(actual - expected) <= 64 * eps * abs(expected)
        checked += 1
    assert receipt['productionMappingAllowed'] is False and receipt['productionReactions'] is False and receipt['transport'] is False
print(json.dumps(dict(checked=checked, cells=39, ratios=9, retainedSourcePacketChecked=True,
                     freshPdfDownloaded=False, physicalFluidSourceEligible=False), indent=2))
