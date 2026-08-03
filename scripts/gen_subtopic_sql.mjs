import fs from 'node:fs';
import path from 'node:path';

const csv = fs.readFileSync(path.resolve('src/data/em_taxonomy.csv'), 'utf8');

function parseCSV(text) {
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const rows = parseCSV(csv);
const header = rows[0];
const col = (r, name) => r[header.indexOf(name)] ?? '';

const sqlLit = (v) => {
  if (v === '' || v === undefined || v === null) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const jsonLit = (v) => {
  const s = (v === '' || v == null) ? '[]' : v;
  try { JSON.parse(s); } catch { return "'[]'::jsonb"; }
  return "'" + String(s).replace(/'/g, "''") + "'::jsonb";
};

const subtopics = rows.slice(1).filter(r => col(r, 'table_type') === 'subtopic');
console.error('subtopics found:', subtopics.length);

const stmts = [];
for (const r of subtopics) {
  const id = col(r, 'id');
  const parent = col(r, 'parent_id');
  const level = col(r, 'level_code');
  const order = col(r, 'order') || '0';
  const title = col(r, 'title');
  const description = col(r, 'description');
  const day_range = col(r, 'day_range');
  const post_assessment = col(r, 'post_assessment');
  const fal_focus = col(r, 'fal_focus');
  const dok = col(r, 'dok_level');
  const diff = col(r, 'default_difficulty') || 'medium';
  const aligned = col(r, 'aligned_standards');
  const bigIdeas = col(r, 'big_ideas');
  const vocab = col(r, 'academic_vocabulary');
  const misc = col(r, 'common_misconceptions');

  stmts.push(
    `INSERT INTO em_subtopics (id, module_id, level_code, order_index, title, description, day_range, post_assessment, fal_focus, dok_level, default_difficulty, aligned_standards, big_ideas, academic_vocabulary, common_misconceptions) VALUES (` +
    `${sqlLit(id)}, ${sqlLit(parent)}, ${sqlLit(level)}, ${Number(order) || 0}, ${sqlLit(title)}, ${sqlLit(description)}, ${sqlLit(day_range)}, ${sqlLit(post_assessment)}, ${sqlLit(fal_focus)}, ${dok ? Number(dok) : 'NULL'}, ${sqlLit(diff)}, ${jsonLit(aligned)}, ${jsonLit(bigIdeas)}, ${jsonLit(vocab)}, ${jsonLit(misc)}) ` +
    `ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, module_id = EXCLUDED.module_id, level_code = EXCLUDED.level_code, order_index = EXCLUDED.order_index, updated_at = now();`
  );
}

const out = stmts.join('\n');
fs.writeFileSync('em_subtopics_gen.sql', out);
console.error('wrote em_subtopics_gen.sql with', stmts.length, 'stmts,', out.length, 'chars');
