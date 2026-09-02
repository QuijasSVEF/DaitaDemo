import React from 'react';
import { QuestionVisual, TableData, MultiTableData, DotPlotData, BarChartData } from '../types/quiz';

export function formatMathContent(text: string): string {
  if (!text) return '';

  let processedText = text;

  // Convert exponents to superscript format (2^5 becomes 2⁵)
  processedText = processedText.replace(/(\w+|\d+)\^(\d+)/g, (match, base, exponent) => {
    const superscriptMap: { [key: string]: string } = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
    };
    const superscriptExponent = exponent.split('').map((digit: string) => superscriptMap[digit] || digit).join('');
    return `${base}${superscriptExponent}`;
  });

  // Replace LaTeX-style fractions with simple format
  processedText = processedText.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2");

  // Remove LaTeX inline math delimiters \( ... \) and \[ ... \]
  processedText = processedText.replace(/\\\(\s*/g, '');
  processedText = processedText.replace(/\s*\\\)/g, '');
  processedText = processedText.replace(/\\\[\s*/g, '');
  processedText = processedText.replace(/\s*\\\]/g, '');

  // Remove dollar-sign math delimiters $ ... $ and $$ ... $$
  processedText = processedText.replace(/\$\$(.*?)\$\$/g, '$1');
  processedText = processedText.replace(/\$(.*?)\$/g, '$1');

  // Handle \dfrac and \tfrac variants
  processedText = processedText.replace(/\\[dt]frac\{(\d+)\}\{(\d+)\}/g, "$1/$2");

  // Handle \frac with variables/expressions: \frac{a}{b} -> a/b
  processedText = processedText.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1/$2");

  // Remove remaining common LaTeX commands that sneak through
  processedText = processedText.replace(/\\text\{([^}]+)\}/g, '$1');
  processedText = processedText.replace(/\\(times|cdot)/g, '\u00D7');
  processedText = processedText.replace(/\\div/g, '\u00F7');
  processedText = processedText.replace(/\\pm/g, '\u00B1');
  processedText = processedText.replace(/\\leq/g, '\u2264');
  processedText = processedText.replace(/\\geq/g, '\u2265');
  processedText = processedText.replace(/\\neq/g, '\u2260');
  processedText = processedText.replace(/\\pi/g, '\u03C0');
  processedText = processedText.replace(/\\sqrt\{([^}]+)\}/g, '\u221A($1)');
  processedText = processedText.replace(/\\left/g, '');
  processedText = processedText.replace(/\\right/g, '');

  // Clean up extra spaces
  processedText = processedText.replace(/\s+/g, ' ').trim();

  return processedText;
}

/**
 * Detect table-like patterns in plain text and return structured visual data.
 * Handles patterns like:
 *   - "x: 1, 2, 3, 4 y: 5, 10, 15, 20"
 *   - "(1, 5), (2, 10), (3, 15)"
 *   - "x | 1 | 2 | 3 \n y | 5 | 10 | 15"
 *   - Arrow notation: "1 → 5, 2 → 10, 3 → 15"
 */
export function detectTablePattern(text: string): QuestionVisual | null {
  if (!text) return null;

  // Never produce a table for questions that reference dot/line/bar plots
  if (/\b(?:line plot|dot plot|dotplot|lineplot|bar chart|bar graph|histogram|tally chart)\b/i.test(text)) {
    return null;
  }

  // Pattern 1: Ordered pairs like (1, 5), (2, 10), (3, 15)
  const orderedPairPattern = /\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)/g;
  const pairs: [string, string][] = [];
  let match;
  while ((match = orderedPairPattern.exec(text)) !== null) {
    pairs.push([match[1], match[2]]);
  }
  if (pairs.length >= 3) {
    return {
      type: 'table',
      data: { headers: ['x', 'y'], rows: pairs } as TableData
    };
  }

  // Pattern 2: Arrow notation like "1 → 5, 2 → 10, 3 → 15" or "1 -> 5, 2 -> 10"
  const arrowPattern = /(\d+(?:\.\d+)?)\s*(?:→|->)\s*(\d+(?:\.\d+)?)/g;
  const arrowPairs: [string, string][] = [];
  while ((match = arrowPattern.exec(text)) !== null) {
    arrowPairs.push([match[1], match[2]]);
  }
  if (arrowPairs.length >= 3) {
    return {
      type: 'table',
      data: { headers: ['x', 'y'], rows: arrowPairs } as TableData
    };
  }

  // Pattern 3: "x: 1, 2, 3, 4" followed by "y: 5, 10, 15, 20"
  const labeledPattern = /([a-zA-Z])\s*[:=]\s*([\d.,\s]+)/g;
  const labeled: { label: string; values: string[] }[] = [];
  while ((match = labeledPattern.exec(text)) !== null) {
    const values = match[2].split(/[,\s]+/).filter(v => v.trim() && /^\d/.test(v.trim()));
    if (values.length >= 2) {
      labeled.push({ label: match[1], values });
    }
  }
  if (labeled.length === 2 && labeled[0].values.length === labeled[1].values.length) {
    const rows = labeled[0].values.map((v, i) => [v, labeled[1].values[i]]);
    return {
      type: 'table',
      data: { headers: [labeled[0].label, labeled[1].label], rows } as TableData
    };
  }

  // Pattern 4: Pipe-delimited rows like "x | 1 | 2 | 3" and "y | 5 | 10 | 15"
  const lines = text.split(/[\n;]/);
  if (lines.length >= 2) {
    const pipeRows = lines
      .map(line => line.split('|').map(s => s.trim()).filter(Boolean))
      .filter(row => row.length >= 3);
    if (pipeRows.length >= 2 && pipeRows.every(r => r.length === pipeRows[0].length)) {
      const headers = [pipeRows[0][0], pipeRows[1][0]];
      const rows = pipeRows[0].slice(1).map((v, i) => [v, pipeRows[1]?.[i + 1] || '']);
      return {
        type: 'table',
        data: { headers, rows } as TableData
      };
    }
  }

  return null;
}

/**
 * Detect multi-table questions like "Which table shows a proportional relationship?"
 * Handles two patterns:
 * 1. Options are labels (Table A, B, C, D) - parse explanation for data
 * 2. Options contain inline data (x: 1, 2, 3 and y: 2, 5, 6) - parse options directly
 */
export function detectMultiTablePattern(questionText: string, explanation: string, options: string[]): QuestionVisual | null {
  if (!questionText || !options || options.length < 2) return null;

  const multiTableRef = /which table|what table|select the table|identify the table|shows a proportional|represents a proportional|shows.*direct variation|shows this direct/i;
  if (!multiTableRef.test(questionText)) return null;

  const tables: { label: string; headers: string[]; rows: string[][] }[] = [];

  // Pattern 1: Options contain inline data like "x: 2, 4, 6 and y: 5, 10, 15" or "x: 2, 4, 6; y: 9, 18, 27"
  const inlineDataPattern = /[a-z]\s*[:=]\s*[\d.,\s]+(?:and|;)\s*[a-z]\s*[:=]\s*[\d.,\s]+/i;
  const optionsWithData = options.filter(opt => inlineDataPattern.test(opt));

  if (optionsWithData.length >= 2) {
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const labeledMatch = opt.match(/([a-z])\s*[:=]\s*([\d.,\s]+?)(?:\s*(?:and|;)\s*)([a-z])\s*[:=]\s*([\d.,\s]+)/i);
      if (labeledMatch) {
        const xLabel = labeledMatch[1];
        const xVals = labeledMatch[2].split(/[,\s]+/).filter(v => v && /^\d/.test(v));
        const yLabel = labeledMatch[3];
        const yVals = labeledMatch[4].split(/[,\s]+/).filter(v => v && /^\d/.test(v));
        if (xVals.length >= 2 && xVals.length === yVals.length) {
          tables.push({
            label: `Table ${String.fromCharCode(65 + i)}`,
            headers: [xLabel, yLabel],
            rows: xVals.map((x, idx) => [x, yVals[idx]])
          });
        }
      }
    }
    if (tables.length >= 2) {
      return { type: 'multi_table', data: { tables } as MultiTableData };
    }
  }

  // Reset tables for pattern 2
  tables.length = 0;

  // Pattern 2: Options are table labels (Table A, Table B, etc.) - parse explanation
  const tableLabels = options.filter(opt => /^table\s+[a-z]/i.test(opt.trim()));
  if (tableLabels.length >= 2 && explanation) {
    for (const label of tableLabels) {
      const tableName = label.trim();
      const escapedLabel = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sectionPattern = new RegExp(`${escapedLabel}[:\\s]+([^-]*?)(?=\\s*-\\s*Table|$)`, 'i');
      const altPattern = new RegExp(`${escapedLabel}[:\\s]+(.*?)(?=Table [A-Z]|Therefore|$)`, 'i');

      const sectionMatch = explanation.match(sectionPattern) || explanation.match(altPattern);
      if (!sectionMatch) continue;

      const section = sectionMatch[1];

      const ratioPattern = /(\d+(?:\.\d+)?)\s*[/÷]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g;
      const xValues: string[] = [];
      const yValues: string[] = [];
      let ratioMatch;

      while ((ratioMatch = ratioPattern.exec(section)) !== null) {
        yValues.push(ratioMatch[1]);
        xValues.push(ratioMatch[2]);
      }

      if (xValues.length >= 2) {
        tables.push({
          label: tableName,
          headers: ['x', 'y'],
          rows: xValues.map((x, idx) => [x, yValues[idx]])
        });
      }
    }

    if (tables.length >= 2) {
      return { type: 'multi_table', data: { tables } as MultiTableData };
    }
  }

  return null;
}

export function inferTableFromContext(questionText: string, explanation: string): QuestionVisual | null {
  const tableRef = /\b(?:the (?:table|line plot|dot plot|bar chart|bar graph|histogram|tally chart|data) (?:shows|below|above|displays)|use the (?:table|line plot|dot plot|bar chart|bar graph|data|histogram)|from the (?:table|line plot|dot plot|bar chart|data)|according to the (?:table|line plot|dot plot|bar chart|data)|based on the (?:table|line plot|dot plot|bar chart|data)|look at the (?:table|line plot|dot plot|bar chart|data)|refer to the (?:table|line plot|dot plot|bar chart|data)|a (?:table|line plot|dot plot|bar chart|bar graph) (?:shows|displays|lists)|the data (?:shows|below|above|displays))\b/i;
  if (!tableRef.test(questionText)) return null;

  // Detect the referenced visualization type BEFORE extracting data
  const isDotPlotRef = /\b(?:line plot|dot plot|dotplot|lineplot)\b/i.test(questionText);
  const isBarChartRef = /\b(?:bar chart|bar graph|histogram|tally chart)\b/i.test(questionText);

  // If it's a dot plot or line plot reference, delegate to detectDataVisualizationPattern
  // Do NOT fall through to table patterns - these should never render as tables
  if (isDotPlotRef || isBarChartRef) {
    return detectDataVisualizationPattern(questionText, explanation);
  }

  const combined = `${questionText} ${explanation}`;
  let match;

  // Pattern 1: Ordered pairs like (10, 1.0) and (35, 2.0)
  const pairPattern = /\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)/g;
  const pairs: [string, string][] = [];
  while ((match = pairPattern.exec(combined)) !== null) {
    pairs.push([match[1], match[2]]);
  }
  if (pairs.length >= 2) {
    const xLabel = questionText.match(/(?:number of |between\s+)(\w+)/i)?.[1] || 'x';
    const yLabel = questionText.match(/(?:and (?:the )?(?:total )?(?:amount of )?)([\w\s]+?)(?:\.|,|\?|$)/i)?.[1]?.trim() || 'y';
    return {
      type: 'table',
      data: { headers: [xLabel, yLabel], rows: pairs } as TableData
    };
  }

  // Pattern 2: Division pairs like "4.8 ÷ 2 = 2.4, 9.6 ÷ 4 = 2.4"
  const divPattern = /(\d+(?:\.\d+)?)\s*[÷/]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g;
  const divPairs: [string, string][] = [];
  const seenK = new Set<string>();
  while ((match = divPattern.exec(explanation)) !== null) {
    seenK.add(match[3]);
    divPairs.push([match[2], match[1]]);
  }
  if (divPairs.length >= 2 && seenK.size === 1) {
    const xLabel = questionText.match(/number of (\w+)/i)?.[1] || 'x';
    const yLabel = questionText.match(/(?:total |the )([\w\s]+?)(?:\.|,|\?|$)/i)?.[1]?.trim() || 'y';
    return {
      type: 'table',
      data: { headers: [xLabel, yLabel], rows: divPairs } as TableData
    };
  }

  // Pattern 3: Labeled sequences like "Time (hours): 1, 3, 5, 7"
  const labeledSeqPattern = /(\w[\w\s]*?)\s*(?:\([^)]*\))?\s*:\s*([\d.,\s]+)/g;
  const sequences: { label: string; values: string[] }[] = [];
  while ((match = labeledSeqPattern.exec(questionText)) !== null) {
    const values = match[2].split(/[,\s]+/).filter(v => v.trim() && /^\d/.test(v.trim()));
    if (values.length >= 2) {
      sequences.push({ label: match[1].trim(), values });
    }
  }
  if (sequences.length >= 2 && sequences[0].values.length === sequences[1].values.length) {
    const rows = sequences[0].values.map((v, i) => [v, sequences[1].values[i]]);
    return {
      type: 'table',
      data: { headers: [sequences[0].label, sequences[1].label], rows } as TableData
    };
  }

  // Pattern 4: Repeating headers with inline data
  // e.g. "Notebooks, Folders 8, 14 Notebooks, Folders 12, 21 Notebooks, Folders 16, 28"
  const inlineResult = inferInlineTableFromText(questionText);
  if (inlineResult) return inlineResult;

  // Pattern 5: Alternating "Word Number" pairs - "Cups 2, Flour 5, Cups 4, Flour 10"
  const pairRegex = /([A-Z][a-z]+)\s+(\d+(?:\.\d+)?)/g;
  const found: { word: string; value: string }[] = [];
  while ((match = pairRegex.exec(questionText)) !== null) {
    found.push({ word: match[1], value: match[2] });
  }
  if (found.length >= 4) {
    const groups: Record<string, string[]> = {};
    for (const { word, value } of found) {
      if (!groups[word]) groups[word] = [];
      groups[word].push(value);
    }
    const headers = Object.keys(groups);
    if (headers.length === 2) {
      const col1 = groups[headers[0]];
      const col2 = groups[headers[1]];
      if (col1.length === col2.length && col1.length >= 2) {
        const rows = col1.map((v, i) => [v, col2[i]]);
        return { type: 'table', data: { headers, rows } as TableData };
      }
    }
  }

  // Pattern 6: Numbers from explanation when question mentions a table
  // Extract all numbers from the explanation and try to organize them
  const explNumbers = explanation.match(/\d+(?:\.\d+)?/g);
  if (explNumbers && explNumbers.length >= 4 && explNumbers.length % 2 === 0) {
    const headerMatch = questionText.match(/(?:number of |of\s+)?(\w+)\s+and\s+(\w+)/i);
    if (headerMatch) {
      const headers = [
        headerMatch[1].charAt(0).toUpperCase() + headerMatch[1].slice(1),
        headerMatch[2].charAt(0).toUpperCase() + headerMatch[2].slice(1)
      ];
      const rows: string[][] = [];
      for (let i = 0; i < explNumbers.length; i += 2) {
        rows.push([explNumbers[i], explNumbers[i + 1]]);
      }
      if (rows.length >= 2 && rows.length <= 10) {
        return { type: 'table', data: { headers, rows } as TableData };
      }
    }
  }

  // Pattern 7: Addition-based data (e.g., "6 + 9 + 7 + 10 + 8 = 40" in explanation)
  const additionPattern = /(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?){2,})\s*=\s*(\d+(?:\.\d+)?)/;
  const addMatch = explanation.match(additionPattern);
  if (addMatch) {
    const values = addMatch[1].split(/\s*\+\s*/).map(v => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      // Try to extract subject labels from question text
      const subjectMatch = questionText.match(/(?:number of |how many )?(\w+)\s+(?:\d+\s+)?(?:students?|people|children|players?|friends?|members?)/i);
      const countMatch = questionText.match(/(\d+)\s+(?:students?|people|children|players?|friends?|members?)/);
      const subjectLabel = subjectMatch?.[1] || 'Value';
      const entityLabel = questionText.match(/(?:students?|people|children|players?|friends?|members?)/i)?.[0] || 'Item';

      // If the count of values matches "N students" reference, create a table
      if (countMatch && parseInt(countMatch[1]) === values.length) {
        const rows = values.map((v, i) => [String(i + 1), v]);
        return {
          type: 'table',
          data: { headers: [entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1), subjectLabel.charAt(0).toUpperCase() + subjectLabel.slice(1)], rows } as TableData,
          caption: `Data from the question`
        };
      }
      // Generic fallback - just show data values
      const rows = values.map((v, i) => [String(i + 1), v]);
      return {
        type: 'table',
        data: { headers: ['#', 'Value'], rows } as TableData
      };
    }
  }

  // Pattern 8: Comma-separated values in explanation after a colon or "are"
  // e.g., "The values are: 3, 5, 7, 2, 8, 4" or "Data: 12, 15, 18, 21"
  const csvPattern = /(?:values?|data|numbers?|scores?|results?)\s*(?:are|is|were|:)\s*([\d]+(?:\s*,\s*\d+){2,})/i;
  const csvMatch = (explanation || '').match(csvPattern) || questionText.match(csvPattern);
  if (csvMatch) {
    const values = csvMatch[1].split(/\s*,\s*/).map(v => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return {
        type: 'table',
        data: { headers: ['#', 'Value'], rows } as TableData
      };
    }
  }

  // Pattern 9: Prose-form value lists in question or explanation
  // e.g., "temperatures were 74, 68, 71, 66, and 72 degrees"
  // e.g., "scored 85, 92, 78, 90, and 88 points"
  const proseListPattern = /(?:were|are|is|scored|earned|received|recorded|measured|had|got)\s+([\d]+(?:(?:\s*,\s*|\s+and\s+)\d+){2,})/i;
  const proseMatch = combined.match(proseListPattern);
  if (proseMatch) {
    const rawVals = proseMatch[1].replace(/\s+and\s+/g, ', ').split(/\s*,\s*/).map(v => v.trim()).filter(v => /^\d+/.test(v));
    if (rawVals.length >= 3) {
      const label = questionText.match(/(?:the |each )?([\w]+(?:\s[\w]+)?)\s+(?:were|are|is|scored|earned)/i)?.[1] || 'Value';
      const rows = rawVals.map((v, i) => [String(i + 1), v]);
      return {
        type: 'table',
        data: { headers: ['#', label.charAt(0).toUpperCase() + label.slice(1)], rows } as TableData
      };
    }
  }

  // Pattern 10: Category-value pairs in explanation like "Monday: 74, Tuesday: 68, Wednesday: 71"
  const catValPattern = /([A-Z][a-z]+(?:\s[A-Z]?[a-z]*)?)\s*[:\-–]\s*(\d+(?:\.\d+)?)/g;
  const catPairs: { category: string; value: string }[] = [];
  let catMatch;
  while ((catMatch = catValPattern.exec(combined)) !== null) {
    const cat = catMatch[1].trim();
    if (!/^(?:Step|Pattern|Rule|Option|Table|Answer|Question|Total|Sum|The|This|That|Each)/i.test(cat)) {
      catPairs.push({ category: cat, value: catMatch[2] });
    }
  }
  if (catPairs.length >= 3) {
    const rows = catPairs.map(p => [p.category, p.value]);
    const valLabel = questionText.match(/(?:number of |the )(\w+)/i)?.[1] || 'Value';
    return {
      type: 'table',
      data: { headers: ['Category', valLabel.charAt(0).toUpperCase() + valLabel.slice(1)], rows } as TableData
    };
  }

  return null;
}

function inferInlineTableFromText(text: string): QuestionVisual | null {
  // Extract all numbers from the text
  const numbers = text.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 4) return null;

  // Find non-numeric words that repeat (potential headers)
  const words = text.match(/[A-Z][a-z]+/g) || [];
  const wordFreq: Record<string, number> = {};
  for (const w of words) {
    const key = w.toLowerCase();
    wordFreq[key] = (wordFreq[key] || 0) + 1;
  }

  // Headers are words that repeat at least 2 times (but not common English words)
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'which', 'what', 'how', 'use', 'each', 'that', 'this', 'from', 'with']);
  const repeatingWords = Object.entries(wordFreq)
    .filter(([word, count]) => count >= 2 && !stopWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  if (repeatingWords.length >= 2 && numbers.length >= 4 && numbers.length % 2 === 0) {
    const headers = repeatingWords.slice(0, 2).map(h => h.charAt(0).toUpperCase() + h.slice(1));
    const rows: string[][] = [];
    for (let i = 0; i < numbers.length; i += 2) {
      rows.push([numbers[i], numbers[i + 1]]);
    }
    if (rows.length >= 2) {
      return { type: 'table', data: { headers, rows } as TableData };
    }
  }

  // Fallback: try to split numbers into equal columns using context
  if (numbers.length >= 4 && numbers.length % 2 === 0) {
    const headerMatch = text.match(/(?:number of |of\s+)?(\w+)\s+and\s+(\w+)/i);
    if (headerMatch) {
      const headers = [
        headerMatch[1].charAt(0).toUpperCase() + headerMatch[1].slice(1),
        headerMatch[2].charAt(0).toUpperCase() + headerMatch[2].slice(1)
      ];
      const rows: string[][] = [];
      for (let i = 0; i < numbers.length; i += 2) {
        rows.push([numbers[i], numbers[i + 1]]);
      }
      if (rows.length >= 2) {
        return { type: 'table', data: { headers, rows } as TableData };
      }
    }
  }

  return null;
}

/**
 * Last-resort fallback: extract any numbers from question+explanation and present as a table.
 * Used when specialized inference (dot_plot, bar_chart, etc.) fails but we still want to show data.
 */
function buildFallbackTable(questionText: string, explanation: string): QuestionVisual | null {
  const combined = `${questionText} ${explanation || ''}`;

  // Try addition pattern first
  const addPattern = /(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?){2,})\s*=\s*(\d+(?:\.\d+)?)/;
  const addMatch = explanation.match(addPattern);
  if (addMatch) {
    const values = addMatch[1].split(/\s*\+\s*/).map(v => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: 'table', data: { headers: ['#', 'Value'], rows } as TableData };
    }
  }

  // Try comma-separated values
  const csvPattern = /(\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?){2,})/;
  const csvMatch = combined.match(csvPattern);
  if (csvMatch) {
    const values = csvMatch[1].split(/\s*,\s*/).map(v => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: 'table', data: { headers: ['#', 'Value'], rows } as TableData };
    }
  }

  // Try prose-form values
  const prosePattern = /(?:were|are|is|scored|earned|received|recorded|measured|had|got)\s+([\d]+(?:(?:\s*,\s*|\s+and\s+)\d+){2,})/i;
  const proseMatch = combined.match(prosePattern);
  if (proseMatch) {
    const values = proseMatch[1].replace(/\s+and\s+/g, ', ').split(/\s*,\s*/).map(v => v.trim()).filter(v => /^\d/.test(v));
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: 'table', data: { headers: ['#', 'Value'], rows } as TableData };
    }
  }

  // Try category-value pairs
  const catValPattern = /([A-Z][a-z]+(?:\s[A-Z]?[a-z]*)?)\s*[:\-–]\s*(\d+(?:\.\d+)?)/g;
  const catPairs: [string, string][] = [];
  let cvMatch;
  while ((cvMatch = catValPattern.exec(combined)) !== null) {
    const cat = cvMatch[1].trim();
    if (!/^(?:Step|Pattern|Rule|Option|Table|Answer|Question|Total|Sum|The|This|That|Each)/i.test(cat)) {
      catPairs.push([cat, cvMatch[2]]);
    }
  }
  if (catPairs.length >= 2) {
    return { type: 'table', data: { headers: ['Category', 'Value'], rows: catPairs } as TableData };
  }

  // Last try: extract all standalone numbers from explanation (at least 3)
  const allNumbers = (explanation || '').match(/\b\d+(?:\.\d+)?\b/g);
  if (allNumbers && allNumbers.length >= 3 && allNumbers.length <= 20) {
    const rows = allNumbers.map((v, i) => [String(i + 1), v]);
    return { type: 'table', data: { headers: ['#', 'Value'], rows } as TableData };
  }

  return null;
}

/**
 * Broad detection for any data visualization reference in question text.
 * This is a final fallback that catches questions mentioning line plots, dot plots,
 * bar charts, histograms, etc. and tries to extract data from the explanation.
 * Returns the best-fit visual type based on the reference.
 */
export function detectDataVisualizationPattern(questionText: string, explanation: string, options?: string[]): QuestionVisual | null {
  if (!questionText) return null;

  const combined = `${questionText} ${explanation || ''}`;

  // Detect what type of visualization is referenced
  const isDotPlot = /\b(?:dot plot|dotplot)\b/i.test(questionText);
  const isBarChart = /\b(?:bar (?:chart|graph)|histogram)\b/i.test(questionText);
  const isLinePlot = /\b(?:line plot|lineplot)\b/i.test(questionText);
  const isNumberLine = /\b(?:number line)\b/i.test(questionText);
  const isTallyChart = /\b(?:tally (?:chart|table|mark))\b/i.test(questionText);
  const isTable = /\b(?:the table|a table|data table)\b/i.test(questionText);

  if (!isDotPlot && !isBarChart && !isLinePlot && !isNumberLine && !isTallyChart && !isTable) {
    return null;
  }

  // Try to extract values from explanation
  // Pattern A: Addition sum like "6 + 9 + 7 + 10 + 8 = 40"
  const addPattern = /(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?){2,})\s*=\s*(\d+(?:\.\d+)?)/;
  const addMatch = explanation.match(addPattern);
  let extractedValues: number[] = [];

  if (addMatch) {
    extractedValues = addMatch[1].split(/\s*\+\s*/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  }

  // Pattern B: Listed values "2, 3, 5, 3, 4, 2, 5, 3" in explanation or question
  if (extractedValues.length < 3) {
    const listedPattern = /(?:data|values?|numbers?|scores?|points?)[\s:]+(\d+(?:\s*,\s*\d+){2,})/i;
    const listMatch = combined.match(listedPattern);
    if (listMatch) {
      extractedValues = listMatch[1].split(/\s*,\s*/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    }
  }

  // Pattern B2: Prose-form values like "were 74, 68, 71, 66, and 72" or "scored 85, 92, 78, 90, and 88"
  if (extractedValues.length < 3) {
    const prosePattern = /(?:were|are|is|scored|earned|received|recorded|measured|had|got|shows?|displays?)\s+([\d]+(?:(?:\s*,\s*|\s+and\s+)\d+){2,})/i;
    const proseMatch = combined.match(prosePattern);
    if (proseMatch) {
      extractedValues = proseMatch[1].replace(/\s+and\s+/g, ', ').split(/\s*,\s*/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    }
  }

  // Pattern B3: Plain comma-separated numbers anywhere in explanation (at least 3 values)
  if (extractedValues.length < 3) {
    const plainCsvPattern = /(\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?){2,})/;
    const plainMatch = explanation.match(plainCsvPattern);
    if (plainMatch) {
      const vals = plainMatch[1].split(/\s*,\s*/).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
      if (vals.length >= 3) extractedValues = vals;
    }
  }

  // Pattern C: Frequency/count data - "3 students scored 80, 5 students scored 90"
  const freqPattern = /(\d+)\s+(?:students?|people|items?|times?|children)\s+(?:\w+\s+)?(\d+(?:\.\d+)?)/gi;
  const freqPairs: { count: number; value: number }[] = [];
  let fMatch;
  while ((fMatch = freqPattern.exec(combined)) !== null) {
    freqPairs.push({ count: parseInt(fMatch[1]), value: parseFloat(fMatch[2]) });
  }

  // Pattern D: Category-value pairs for bar charts - "Math: 5, Science: 3, Reading: 7"
  const catValPattern = /([A-Z][a-z]+(?:\s[A-Z]?[a-z]*)?)\s*[:\-]\s*(\d+(?:\.\d+)?)/g;
  const catPairs: { category: string; value: number }[] = [];
  let cvMatch;
  while ((cvMatch = catValPattern.exec(combined)) !== null) {
    const cat = cvMatch[1].trim();
    if (!/^(?:Step|Pattern|Rule|Option|Table|Answer|Question)/i.test(cat)) {
      catPairs.push({ category: cat, value: parseFloat(cvMatch[2]) });
    }
  }

  // Decide which visual type to create
  if (isDotPlot || isLinePlot) {
    if (extractedValues.length >= 3) {
      return {
        type: 'dot_plot',
        data: { values: extractedValues } as DotPlotData,
        caption: isDotPlot ? 'Dot Plot' : 'Line Plot (shown as dot plot)'
      };
    }
    if (freqPairs.length >= 2) {
      const values: number[] = [];
      for (const { count, value } of freqPairs) {
        for (let i = 0; i < count; i++) values.push(value);
      }
      if (values.length >= 3) {
        return {
          type: 'dot_plot',
          data: { values } as DotPlotData,
          caption: isDotPlot ? 'Dot Plot' : 'Line Plot'
        };
      }
    }
    // For dot/line plots with only 2 values, still show as dot_plot
    if (extractedValues.length >= 2) {
      return {
        type: 'dot_plot',
        data: { values: extractedValues } as DotPlotData,
        caption: isDotPlot ? 'Dot Plot' : 'Line Plot'
      };
    }
    // Fallback: create a table from any numbers in the text
    return buildFallbackTable(questionText, explanation);
  }

  if (isBarChart || isTallyChart) {
    if (catPairs.length >= 2) {
      return {
        type: 'bar_chart',
        data: {
          categories: catPairs.map(p => p.category),
          values: catPairs.map(p => p.value)
        } as BarChartData
      };
    }
    if (freqPairs.length >= 2) {
      return {
        type: 'bar_chart',
        data: {
          categories: freqPairs.map(p => String(p.value)),
          values: freqPairs.map(p => p.count),
          yLabel: 'Frequency'
        } as BarChartData
      };
    }
    if (extractedValues.length >= 2) {
      return {
        type: 'bar_chart',
        data: {
          categories: extractedValues.map((_, i) => `Item ${i + 1}`),
          values: extractedValues
        } as BarChartData
      };
    }
    // Fallback: create a table from any numbers in the text
    return buildFallbackTable(questionText, explanation);
  }

  if (isNumberLine) {
    if (extractedValues.length >= 2) {
      return {
        type: 'number_line',
        data: {
          min: Math.min(...extractedValues) - 1,
          max: Math.max(...extractedValues) + 1,
          points: extractedValues.map((v) => ({ value: v, label: String(v) }))
        }
      };
    }
    // Try to extract labeled points like "point A is at -2" or "at -4 and point Q is at 3"
    const pointPattern = /(?:point\s+)?([A-Z])\s+(?:is\s+)?(?:at|located at)\s+(-?\d+\.?\d*)/gi;
    const labeledPoints: { value: number; label: string }[] = [];
    let pMatch;
    while ((pMatch = pointPattern.exec(combined)) !== null) {
      labeledPoints.push({ value: parseFloat(pMatch[2]), label: pMatch[1] });
    }
    if (labeledPoints.length >= 2) {
      const vals = labeledPoints.map(p => p.value);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      return {
        type: 'number_line',
        data: {
          min: Math.min(minV - 2, minV >= 0 ? 0 : minV - 2),
          max: Math.max(maxV + 2, maxV <= 0 ? 0 : maxV + 2),
          points: labeledPoints
        },
        caption: /vertical/i.test(questionText) ? 'Vertical number line' : 'Number line'
      };
    }
    // Fallback: use numeric options as points on the number line
    if (options && options.length >= 2) {
      const numericOpts = options
        .map(o => o.trim())
        .filter(o => /^-?\d+\.?\d*$/.test(o))
        .map(o => parseFloat(o));
      if (numericOpts.length >= 2) {
        const minV = Math.min(...numericOpts);
        const maxV = Math.max(...numericOpts);
        return {
          type: 'number_line',
          data: {
            min: Math.min(minV - 1, minV >= 0 ? 0 : minV - 1),
            max: Math.max(maxV + 1, maxV <= 0 ? 0 : maxV + 1),
            points: numericOpts.map(v => ({ value: v, label: String(v) }))
          },
          caption: /vertical/i.test(questionText) ? 'Vertical number line' : 'Number line'
        };
      }
    }
  }

  // For generic table references, try addition-based extraction
  if (isTable && extractedValues.length >= 3) {
    const rows = extractedValues.map((v, i) => [String(i + 1), String(v)]);
    return { type: 'table', data: { headers: ['#', 'Value'], rows } as TableData };
  }

  // Final fallback: create a table from any numbers found
  return buildFallbackTable(questionText, explanation);
}

export function renderMathContent(text: string): React.ReactNode {
  if (!text) return '';

  let processedText = formatMathContent(text);

  // Split by fractions and render with proper formatting
  const parts = processedText.split(/(\d+\/\d+)/g);

  return parts.map((part, index) => {
    if (/^\d+\/\d+$/.test(part)) {
      const [numerator, denominator] = part.split('/');
      return (
        <span key={index} className="inline-flex flex-col items-center mx-0.5">
          <span className="border-b border-current text-sm">{numerator}</span>
          <span className="text-sm">{denominator}</span>
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
