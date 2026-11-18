/**
 * Generate and audit the Markdown narrative manifest.
 *
 * Canonical inputs:
 *   - data/minerals.json supplies the mineral registry and stable ordering.
 *   - narratives/*.md supplies the set of Markdown-backed narrators.
 *
 * The generated TypeScript file is consumed before js/05-narratives.ts.  The
 * audit also rejects stale inline `|| fallback` prose wherever a narrator has
 * already delegated its prose to narrative_blurb/variant/closing, and a call
 * that does not supply a variable its template names (the game would print
 * the braces: "{rad_count} of {total_count} growth zones").
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const THIS_FILE = fileURLToPath(import.meta.url);
// The tree the audit reads: this repository, or the one named with --root (a test
// hands it a fixture tree, so the rules are held as the tool applies them and not
// only as functions).
let ROOT = path.dirname(path.dirname(THIS_FILE));
let DATA_PATH;
let NARRATIVE_DIR;
let JS_DIR;
let GENERATED_PATH;
function readTreeAt(root) {
  ROOT = root;
  DATA_PATH = path.join(ROOT, 'data', 'minerals.json');
  NARRATIVE_DIR = path.join(ROOT, 'narratives');
  JS_DIR = path.join(ROOT, 'js');
  GENERATED_PATH = path.join(JS_DIR, '04-narrative-manifest.generated.ts');
}
readTreeAt(ROOT);
const NARRATIVE_FUNCTIONS = new Set([
  'narrative_blurb',
  'narrative_closing',
  'narrative_variant',
]);

// The runtime's own interpolation pattern (js/05-narratives.ts, _narrative_interp):
// "{key}" is replaced only when the call's context object has that key, and is
// printed as written otherwise. The prose relies on the second half for crystal
// forms ({100}, {0001}, {40-41}), so a key that starts with a digit is notation.
// A key that starts with a letter or an underscore is a template variable, and
// the call that renders the section has to supply it.
const TEMPLATE_KEY_PATTERN = /\{(\w+)\}/g;

// What a "{…}" in a section may be, and nothing else:
//   - a template variable, {name}: letters, digits and underscores, starting with a
//     letter or an underscore;
//   - crystal-form notation of three or more places: {100} {0001} {10̄10} {40-41}
//     {h0-il}. Digits, the index letters h k i l, a hyphen or a combining overbar,
//     with at least one digit.
// Whatever else sits in braces the runtime prints as written and no call can fill:
// an empty "{}", a positional "{0}", a formatted "{dose:.2f}", a dotted "{c.id}",
// padding inside the braces.
const BRACE_GROUP_PATTERN = /\{([^{}]*)\}/g;
const TEMPLATE_VARIABLE_PATTERN = /^[A-Za-z_]\w*$/;
const CRYSTAL_FORM_PATTERN = /^(?=\D*\d)[0-9hkil\u0304\u0305-]{3,}$/;

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, '\n');
}

export function templateVariables(body) {
  const keys = Array.from(body.matchAll(TEMPLATE_KEY_PATTERN), match => match[1]);
  return [...new Set(keys.filter(key => TEMPLATE_VARIABLE_PATTERN.test(key) && !CRYSTAL_FORM_PATTERN.test(key)))];
}

// Braces the game would print as written although they are not crystal forms.
// Applied to a section it finds what no call can fill; applied to rendered text
// it also finds a variable a call did not fill.
export function strayBraces(text, { variablesAllowed = false } = {}) {
  const stray = [];
  const outsideGroups = text.replace(BRACE_GROUP_PATTERN, (group, inner) => {
    const accepted = CRYSTAL_FORM_PATTERN.test(inner)
      || (variablesAllowed && TEMPLATE_VARIABLE_PATTERN.test(inner));
    if (!accepted) stray.push(group);
    return '';
  });
  // A brace that closes or opens no group: "#{{crystal_id}}" prints "#{21}", and
  // "({mm × {a_width_mm} mm)" prints its first brace.
  stray.push(...(outsideGroups.match(/[{}]/g) || []));
  return [...new Set(stray)];
}

// What is wrong with a section's body on its own, whatever call renders it.
export function templateBodyComplaints(body) {
  return strayBraces(body, { variablesAllowed: true }).map(braces => (braces.length === 1
    ? `holds a "${braces}" that opens or closes no variable and no crystal form; the game would print it`
    : `holds "${braces}", which is neither a named variable ({name}) nor crystal-form notation of three or `
      + 'more places; no call can be held to it, and the game would print it as written'
  ));
}

function parseNarrative(id, filename, text, errors) {
  const normalized = normalizeNewlines(text);
  const frontmatter = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!frontmatter) {
    errors.push(`${filename}: missing YAML frontmatter`);
  } else {
    const species = frontmatter[1].match(/^(?:species|mineral):\s*(.+?)\s*$/m)?.[1];
    if (species !== id) {
      errors.push(`${filename}: frontmatter species must be "${id}", found ${JSON.stringify(species)}`);
    }
  }

  const sections = new Map();
  const headings = Array.from(normalized.matchAll(/^## ([^\n]+)\s*$/gm));
  for (let index = 0; index < headings.length; index += 1) {
    const match = headings[index];
    const heading = match[1].trim();
    const bodyStart = match.index + match[0].length;
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : normalized.length;
    const body = normalized.slice(bodyStart, bodyEnd).trim();
    if (sections.has(heading)) errors.push(`${filename}: duplicate section "${heading}"`);
    if (!body) errors.push(`${filename}: empty section "${heading}"`);
    for (const complaint of templateBodyComplaints(body)) {
      errors.push(`${filename}: section "${heading}" ${complaint}`);
    }
    sections.set(heading, body);
  }
  if (!sections.size) errors.push(`${filename}: no level-two narrative sections found`);
  return { id, filename, sections };
}

function stringLiteralValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function narrativeCallName(node) {
  if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return null;
  return NARRATIVE_FUNCTIONS.has(node.expression.text) ? node.expression.text : null;
}

function containsNarrativeCall(node) {
  if (narrativeCallName(node)) return true;
  let found = false;
  ts.forEachChild(node, child => {
    if (!found && containsNarrativeCall(child)) found = true;
  });
  return found;
}

function containsNarrativeResult(node, derivedIdentifiers) {
  if (narrativeCallName(node)) return true;
  if (ts.isIdentifier(node) && derivedIdentifiers.has(node.text)) return true;
  let found = false;
  ts.forEachChild(node, child => {
    if (!found && containsNarrativeResult(child, derivedIdentifiers)) found = true;
  });
  return found;
}

function containsInlineProse(node) {
  if (
    ts.isStringLiteral(node)
    || ts.isNoSubstitutionTemplateLiteral(node)
    || ts.isTemplateExpression(node)
  ) return true;
  let found = false;
  ts.forEachChild(node, child => {
    if (!found && containsInlineProse(child)) found = true;
  });
  return found;
}

function narrativeDerivedIdentifiers(sourceFile) {
  const derived = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    function visit(node) {
      let identifier = null;
      let value = null;
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        identifier = node.name.text;
        value = node.initializer;
      } else if (
        ts.isBinaryExpression(node)
        && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
        && ts.isIdentifier(node.left)
      ) {
        identifier = node.left.text;
        value = node.right;
      }
      if (
        identifier
        && !derived.has(identifier)
        && containsNarrativeResult(value, derived)
      ) {
        derived.add(identifier);
        changed = true;
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return derived;
}

function sourceLocation(sourceFile, node) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const displayName = path.isAbsolute(sourceFile.fileName)
    ? path.relative(ROOT, sourceFile.fileName)
    : sourceFile.fileName;
  return `${displayName.replace(/\\/g, '/')}:${line + 1}:${character + 1}`;
}

function auditNarratorSyntaxSource(sourceFile) {
  const derivedIdentifiers = narrativeDerivedIdentifiers(sourceFile);
  const inlineFallbacks = [];
  const dynamicVariants = [];

  function visit(node) {
    if (narrativeCallName(node) === 'narrative_variant' && stringLiteralValue(node.arguments[1]) === null) {
      dynamicVariants.push(
        `${sourceLocation(sourceFile, node)}: narrative_variant key must be a string literal; use exhaustive literal branches`,
      );
    }
    if (
      ts.isBinaryExpression(node)
      && node.operatorToken.kind === ts.SyntaxKind.BarBarToken
      && containsNarrativeResult(node.left, derivedIdentifiers)
    ) {
      inlineFallbacks.push(
        `${sourceLocation(sourceFile, node)}: stale inline fallback after Markdown narrative result`,
      );
    }
    if (
      ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && /fallback/i.test(node.name.text)
      && node.initializer
      && containsInlineProse(node.initializer)
    ) {
      inlineFallbacks.push(
        `${sourceLocation(sourceFile, node)}: stale named inline fallback prose`,
      );
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return { inlineFallbacks, dynamicVariants };
}

export function auditNarratorSourceText(sourceText, filename = 'fixture.ts') {
  const sourceFile = ts.createSourceFile(
    filename,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  return auditNarratorSyntaxSource(sourceFile);
}

function isContextArgument(node) {
  const call = node.parent;
  const callName = call && narrativeCallName(call);
  return !!callName && call.arguments[callName === 'narrative_variant' ? 2 : 1] === node;
}

// `const ctx = { … }`, shared between calls (the dolomite narrator renders three
// sections from one). Followed only where nothing else can touch it: within the
// outermost enclosing function the name occurs as that one const declaration and
// as the context of narrative calls, and nowhere else. A second binding of the name
// (a parameter, a loop or catch variable, a nested declaration), an assignment, a
// delete, or handing it to anything else leaves the keys unreadable.
function constObjectLiteral(identifier) {
  let container = identifier.getSourceFile();
  for (let node = identifier.parent; node; node = node.parent) {
    if (ts.isFunctionLike(node)) container = node;
  }
  let literal = null;
  let sound = true;
  function visit(node) {
    if (!sound) return;
    if (ts.isIdentifier(node) && node.text === identifier.text) {
      const parent = node.parent;
      const namesAProperty = ((ts.isPropertyAccessExpression(parent) || ts.isPropertyAssignment(parent)
        || ts.isMethodDeclaration(parent)) && parent.name === node)
        || (ts.isBindingElement(parent) && parent.propertyName === node);
      const declaresIt = ts.isVariableDeclaration(parent) && parent.name === node
        && ts.isVariableDeclarationList(parent.parent)
        && (parent.parent.flags & ts.NodeFlags.Const) !== 0
        && !!parent.initializer && ts.isObjectLiteralExpression(parent.initializer);
      if (declaresIt && !literal) literal = parent.initializer;
      else if (!namesAProperty && !isContextArgument(node)) sound = false;
    }
    ts.forEachChild(node, visit);
  }
  visit(container);
  return sound ? literal : null;
}

// The property names of a call's context argument, or null when the source
// does not state them (a spread, a computed name, a value built elsewhere).
function contextKeys(node) {
  if (!node) return [];
  while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) {
    node = node.expression;
  }
  if (ts.isConditionalExpression(node)) {
    // Either branch may render: only the keys both state are supplied.
    const whenTrue = contextKeys(node.whenTrue);
    const whenFalse = contextKeys(node.whenFalse);
    return whenTrue && whenFalse ? whenTrue.filter(key => whenFalse.includes(key)) : null;
  }
  const literal = ts.isIdentifier(node) ? constObjectLiteral(node) : node;
  if (!literal || !ts.isObjectLiteralExpression(literal)) return null;
  const keys = [];
  for (const property of literal.properties) {
    const named = (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))
      && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name));
    if (!named) return null;
    keys.push(property.name.text);
  }
  return keys;
}

// One call against the section it renders: every template variable must be a
// key of the call's context. Returns the complaint, or null when there is none.
function templateVariableComplaint(node, callName, sectionLabel, body) {
  const needed = templateVariables(body);
  if (!needed.length) return null;
  const supplied = contextKeys(node.arguments[callName === 'narrative_variant' ? 2 : 1]);
  const wanted = needed.map(key => `{${key}}`).join(', ');
  if (supplied === null) {
    return `${sectionLabel} names ${wanted}, and the call's context is not an object literal `
      + 'whose keys can be read (pass one, or a const bound to one)';
  }
  const missing = needed.filter(key => !supplied.includes(key));
  if (!missing.length) return null;
  return `${sectionLabel} names ${wanted}, and the call does not supply `
    + `${missing.map(key => `{${key}}`).join(', ')}; the game would print the braces`;
}

function narrativeSectionOfCall(node, callName) {
  if (callName === 'narrative_blurb') return 'blurb';
  if (callName === 'narrative_closing') return 'closing';
  const variant = stringLiteralValue(node.arguments[1]);
  return variant === null ? null : `variant: ${variant}`;
}

// Fixture entry point for the rule above. `templates` maps a species to its
// sections: { quartz: { 'variant: smoky': '… {dosed_pct} …' } }.
export function auditTemplateVariableSupply(sourceText, templates, filename = 'fixture.ts') {
  const sourceFile = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const complaints = [];
  function visit(node) {
    const callName = narrativeCallName(node);
    if (callName) {
      const species = stringLiteralValue(node.arguments[0]);
      const section = narrativeSectionOfCall(node, callName);
      const body = species !== null && section !== null ? templates?.[species]?.[section] : undefined;
      if (typeof body === 'string') {
        const complaint = templateVariableComplaint(node, callName, `narratives/${species}.md "${section}"`, body);
        if (complaint) complaints.push(`${sourceLocation(sourceFile, node)}: ${complaint}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return complaints;
}

// The three functions are audited as direct calls by their own names. An alias
// (`const say = narrative_variant`), `.call()` or `.bind()`, a call through an
// object (`globalThis.narrative_variant(…)`, `window['narrative_variant'](…)`) would
// each render a section the audit never matched to a context. So in a narrator file
// the names appear as direct callees and nowhere else, not even as a string.
function indirectNarrativeUses(sourceFile) {
  const complaints = [];
  function visit(node) {
    const named = (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      && NARRATIVE_FUNCTIONS.has(node.text);
    if (named) {
      const parent = node.parent;
      const isDirectCall = ts.isIdentifier(node) && ts.isCallExpression(parent) && parent.expression === node;
      if (!isDirectCall) {
        complaints.push(`${sourceLocation(sourceFile, node)}: ${node.text} must be called directly by name, `
          + 'not aliased, bound, or reached through an object or .call/.apply (the audit reads direct calls)');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return complaints;
}

export function auditIndirectNarrativeUses(sourceText, filename = 'fixture.ts') {
  return indirectNarrativeUses(
    ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
  );
}

// The audit reads js/92*-narrators files. Anywhere else in js/ a call, an alias, a
// bind or a call split over lines would render prose nothing checked, so there the
// three names may not appear at all outside a `//` comment line (a trailing comment
// or a string that mentions one is refused too: say it another way).
// js/05-narratives.ts defines them.
const NARRATIVE_NAME_TEXT = /\bnarrative_(?:blurb|closing|variant)\b/;

export function narrativeCallOutsideNarrators(name, sourceText) {
  if (/^92.*\.ts$/.test(name) || name === '05-narratives.ts') return null;
  const lines = sourceText.split('\n');
  const index = lines.findIndex(line => !line.trim().startsWith('//') && NARRATIVE_NAME_TEXT.test(line));
  return index < 0 ? null : `js/${name}:${index + 1}: names a narrative function outside js/92*-narrators files, `
    + 'where the audit does not read; render the section from a narrator';
}

function narrativeCallsOutsideNarrators(narratorFiles) {
  return fs.readdirSync(JS_DIR)
    .filter(name => name.endsWith('.ts') && !narratorFiles.includes(name))
    .sort()
    .map(name => narrativeCallOutsideNarrators(name, fs.readFileSync(path.join(JS_DIR, name), 'utf8')))
    .filter(Boolean);
}

// Prose no call renders is prose no check reads: two quartz sections sat unreached
// with a false sentence and an unfillable variable from the day the file was written.
// `rendered` holds "species\nsection" for every section a call was matched to.
export function unrenderedSectionComplaints(id, sectionNames, rendered) {
  return sectionNames
    .filter(section => !rendered.has(`${id}\n${section}`))
    .map(section => `narratives/${id}.md: section "${section}" is rendered by no narrator call`);
}

function auditNarratorSources(documents, errors) {
  const referenced = new Set();
  const rendered = new Set();
  let dynamicVariantCount = 0;
  let callCount = 0;
  let fallbackCount = 0;
  const files = fs.readdirSync(JS_DIR)
    .filter(name => /^92.*\.ts$/.test(name))
    .sort();

  for (const name of files) {
    const filename = path.join(JS_DIR, name);
    const sourceText = fs.readFileSync(filename, 'utf8');
    const sourceFile = ts.createSourceFile(filename, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const syntaxAudit = auditNarratorSyntaxSource(sourceFile);
    fallbackCount += syntaxAudit.inlineFallbacks.length;
    dynamicVariantCount += syntaxAudit.dynamicVariants.length;
    errors.push(...syntaxAudit.inlineFallbacks, ...syntaxAudit.dynamicVariants);

    errors.push(...indirectNarrativeUses(sourceFile));

    function visit(node) {
      const callName = narrativeCallName(node);
      if (callName) {
        callCount += 1;
        const species = stringLiteralValue(node.arguments[0]);
        const loc = sourceLocation(sourceFile, node);
        if (!species) {
          errors.push(`${loc}: ${callName} species must be a string literal`);
        } else if (!documents.has(species)) {
          errors.push(`${loc}: ${callName} references missing narratives/${species}.md`);
        } else {
          referenced.add(species);
          const section = narrativeSectionOfCall(node, callName);
          const sections = documents.get(species).sections;
          if (section && !sections.has(section)) {
            errors.push(`${loc}: narratives/${species}.md is missing section "${section}"`);
          } else if (section) {
            rendered.add(`${species}\n${section}`);
            const complaint = templateVariableComplaint(
              node, callName, `narratives/${species}.md "${section}"`, sections.get(section),
            );
            if (complaint) errors.push(`${loc}: ${complaint}`);
          }
        }
      }

      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  for (const [id, document] of documents) {
    if (!referenced.has(id)) {
      errors.push(`narratives/${id}.md is never referenced by a narrator`);
      continue;
    }
    errors.push(...unrenderedSectionComplaints(id, [...document.sections.keys()], rendered));
  }
  errors.push(...narrativeCallsOutsideNarrators(files));
  return { callCount, fallbackCount, dynamicVariantCount };
}

function renderManifest(ids) {
  const entries = ids.map(id => `  ${JSON.stringify(id)},`).join('\n');
  return `// AUTO-GENERATED by tools/narrative-workflow.mjs. DO NOT EDIT.\n`
    + `// Inputs: data/minerals.json + narratives/*.md\n\n`
    + `const _NARRATIVE_MANIFEST = Object.freeze([\n${entries}\n]);\n`;
}

function main() {
  const check = process.argv.includes('--check');
  const rootArg = process.argv.indexOf('--root');
  if (rootArg >= 0) readTreeAt(path.resolve(process.argv[rootArg + 1]));
  const errors = [];
  const mineralDoc = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const minerals = mineralDoc.minerals || {};
  const narrativeFiles = fs.readdirSync(NARRATIVE_DIR)
    .filter(name => name.endsWith('.md'))
    .sort();
  const documents = new Map();

  for (const filename of narrativeFiles) {
    const id = filename.slice(0, -3);
    if (!Object.prototype.hasOwnProperty.call(minerals, id)) {
      errors.push(`narratives/${filename}: species is absent from data/minerals.json`);
    }
    const doc = parseNarrative(
      id,
      `narratives/${filename}`,
      fs.readFileSync(path.join(NARRATIVE_DIR, filename), 'utf8'),
      errors,
    );
    documents.set(id, doc);
  }

  const manifest = Object.keys(minerals).filter(id => documents.has(id));
  for (const id of documents.keys()) {
    if (!manifest.includes(id)) errors.push(`narratives/${id}.md could not be placed in the mineral-order manifest`);
  }

  const sourceAudit = auditNarratorSources(documents, errors);
  const expected = renderManifest(manifest);
  const actual = fs.existsSync(GENERATED_PATH)
    ? normalizeNewlines(fs.readFileSync(GENERATED_PATH, 'utf8'))
    : '';

  if (check) {
    if (actual !== expected) {
      errors.push('js/04-narrative-manifest.generated.ts is stale; run npm run gen:narratives');
    }
  } else if (actual !== expected) {
    fs.writeFileSync(GENERATED_PATH, expected, 'utf8');
    console.log(`[narratives] wrote ${path.relative(ROOT, GENERATED_PATH)} (${manifest.length} species)`);
  }

  if (errors.length) {
    console.error(`[narratives] FAIL (${errors.length} issue${errors.length === 1 ? '' : 's'})`);
    for (const error of errors) console.error(`  - ${error}`);
    return 1;
  }

  console.log(
    `[narratives] PASS: ${manifest.length} files, ${sourceAudit.callCount} statically validated calls, `
      + `${sourceAudit.dynamicVariantCount} dynamic variants, 0 inline fallbacks`,
  );
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS_FILE)) {
  process.exitCode = main();
}
