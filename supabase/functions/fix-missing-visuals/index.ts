import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QuestionVisual {
  type: string;
  data: any;
  caption?: string;
}

const VIZ_REF_PATTERN =
  /\b(?:the (?:table|line plot|dot plot|bar chart|bar graph|histogram|tally chart|number line|data|plot|graph) (?:shows|below|above|displays|lists|represents)|use the (?:table|line plot|dot plot|bar chart|data|graph)|from the (?:table|line plot|dot plot|bar chart|data|graph)|according to the (?:table|data|graph)|based on the (?:table|data|graph|chart)|look at the (?:table|line plot|dot plot|bar chart|data|graph)|a (?:table|line plot|dot plot|bar chart|bar graph) (?:shows|displays|lists)|the data (?:shows|below|above|displays))\b/i;

const DOT_LINE_REF = /\b(?:line plot|dot plot|dotplot|lineplot)\b/i;
const BAR_CHART_REF = /\b(?:bar chart|bar graph|histogram|tally chart)\b/i;

function detectTablePattern(text: string): QuestionVisual | null {
  if (!text) return null;
  // Never produce a table for dot/line/bar chart questions
  if (DOT_LINE_REF.test(text) || BAR_CHART_REF.test(text)) return null;

  let match;
  const pairPattern = /\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)/g;
  const pairs: [string, string][] = [];
  while ((match = pairPattern.exec(text)) !== null) {
    pairs.push([match[1], match[2]]);
  }
  if (pairs.length >= 3) {
    return { type: "table", data: { headers: ["x", "y"], rows: pairs } };
  }

  const arrowPattern = /(\d+(?:\.\d+)?)\s*(?:→|->)\s*(\d+(?:\.\d+)?)/g;
  const arrowPairs: [string, string][] = [];
  while ((match = arrowPattern.exec(text)) !== null) {
    arrowPairs.push([match[1], match[2]]);
  }
  if (arrowPairs.length >= 3) {
    return { type: "table", data: { headers: ["x", "y"], rows: arrowPairs } };
  }

  const labelPattern = /([a-zA-Z]\w*)\s*:\s*([\d.,\s]+)/g;
  const labels: { label: string; values: string[] }[] = [];
  while ((match = labelPattern.exec(text)) !== null) {
    const vals = match[2].split(/[,\s]+/).filter((v) => v.trim() && /^\d/.test(v));
    if (vals.length >= 2) labels.push({ label: match[1], values: vals });
  }
  if (labels.length === 2 && labels[0].values.length === labels[1].values.length) {
    const rows = labels[0].values.map((v, i) => [v, labels[1].values[i]]);
    return { type: "table", data: { headers: [labels[0].label, labels[1].label], rows } };
  }

  return null;
}

function buildFallbackTable(questionText: string, explanation: string): QuestionVisual | null {
  const combined = `${questionText} ${explanation || ""}`;

  const addPattern = /(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?){2,})\s*=\s*(\d+(?:\.\d+)?)/;
  const addMatch = explanation.match(addPattern);
  if (addMatch) {
    const values = addMatch[1].split(/\s*\+\s*/).map((v) => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: "table", data: { headers: ["#", "Value"], rows } };
    }
  }

  const csvPattern = /(\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?){2,})/;
  const csvMatch = combined.match(csvPattern);
  if (csvMatch) {
    const values = csvMatch[1].split(/\s*,\s*/).map((v) => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: "table", data: { headers: ["#", "Value"], rows } };
    }
  }

  const prosePattern = /(?:were|are|is|scored|earned|received|recorded|measured|had|got)\s+([\d]+(?:(?:\s*,\s*|\s+and\s+)\d+){2,})/i;
  const proseMatch = combined.match(prosePattern);
  if (proseMatch) {
    const values = proseMatch[1].replace(/\s+and\s+/g, ", ").split(/\s*,\s*/).filter((v) => /^\d/.test(v));
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: "table", data: { headers: ["#", "Value"], rows } };
    }
  }

  const catValPat = /([A-Z][a-z]+(?:\s[A-Z]?[a-z]*)?)\s*[:\-–]\s*(\d+(?:\.\d+)?)/g;
  const catPairsArr: [string, string][] = [];
  let cvm;
  while ((cvm = catValPat.exec(combined)) !== null) {
    const cat = cvm[1].trim();
    if (!/^(?:Step|Pattern|Rule|Option|Table|Answer|Question|Total|Sum|The|This|That|Each)/i.test(cat)) {
      catPairsArr.push([cat, cvm[2]]);
    }
  }
  if (catPairsArr.length >= 2) {
    return { type: "table", data: { headers: ["Category", "Value"], rows: catPairsArr } };
  }

  const allNumbers = (explanation || "").match(/\b\d+(?:\.\d+)?\b/g);
  if (allNumbers && allNumbers.length >= 3 && allNumbers.length <= 20) {
    const rows = allNumbers.map((v, i) => [String(i + 1), v]);
    return { type: "table", data: { headers: ["#", "Value"], rows } };
  }

  return null;
}

function detectDataVisualizationPattern(
  questionText: string,
  explanation: string,
  _options: string[]
): QuestionVisual | null {
  if (!questionText) return null;
  const combined = `${questionText} ${explanation || ""}`;

  const isDotPlot = /\b(?:dot plot|dotplot)\b/i.test(questionText);
  const isLinePlot = /\b(?:line plot|lineplot)\b/i.test(questionText);
  const isBarChart = /\b(?:bar (?:chart|graph)|histogram)\b/i.test(questionText);
  const isTallyChart = /\b(?:tally (?:chart|table|mark))\b/i.test(questionText);

  if (!isDotPlot && !isLinePlot && !isBarChart && !isTallyChart) return null;

  let extractedValues: number[] = [];

  // Addition sum
  const addPattern = /(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?){2,})\s*=\s*(\d+(?:\.\d+)?)/;
  const addMatch = explanation.match(addPattern);
  if (addMatch) {
    extractedValues = addMatch[1].split(/\s*\+\s*/).map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
  }

  if (extractedValues.length < 3) {
    const listPattern = /(?:data|values?|numbers?|scores?|points?)[\s:]+(\d+(?:\s*,\s*\d+){2,})/i;
    const listMatch = combined.match(listPattern);
    if (listMatch) {
      extractedValues = listMatch[1].split(/\s*,\s*/).map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    }
  }

  if (extractedValues.length < 3) {
    const prosePattern = /(?:were|are|is|scored|earned|received|recorded|measured|had|got|shows?|displays?)\s+([\d]+(?:(?:\s*,\s*|\s+and\s+)\d+){2,})/i;
    const proseMatch = combined.match(prosePattern);
    if (proseMatch) {
      extractedValues = proseMatch[1].replace(/\s+and\s+/g, ", ").split(/\s*,\s*/).map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    }
  }

  if (extractedValues.length < 3) {
    const plainCsvPattern = /(\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?){2,})/;
    const plainMatch = explanation.match(plainCsvPattern);
    if (plainMatch) {
      const vals = plainMatch[1].split(/\s*,\s*/).map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
      if (vals.length >= 3) extractedValues = vals;
    }
  }

  // Frequency/count data
  const freqPattern = /(\d+)\s+(?:students?|people|items?|times?|children)\s+(?:\w+\s+)?(\d+(?:\.\d+)?)/gi;
  const freqPairs: { count: number; value: number }[] = [];
  let fMatch;
  while ((fMatch = freqPattern.exec(combined)) !== null) {
    freqPairs.push({ count: parseInt(fMatch[1]), value: parseFloat(fMatch[2]) });
  }

  // Category-value pairs
  const catValPattern = /([A-Z][a-z]+(?:\s[A-Z]?[a-z]*)?)\s*[:\-]\s*(\d+(?:\.\d+)?)/g;
  const catPairs: { category: string; value: number }[] = [];
  let cvMatch;
  while ((cvMatch = catValPattern.exec(combined)) !== null) {
    const cat = cvMatch[1].trim();
    if (!/^(?:Step|Pattern|Rule|Option|Table|Answer|Question)/i.test(cat)) {
      catPairs.push({ category: cat, value: parseFloat(cvMatch[2]) });
    }
  }

  if (isDotPlot || isLinePlot) {
    if (extractedValues.length >= 2) {
      return { type: "dot_plot", data: { values: extractedValues, label: "Value" } };
    }
    if (freqPairs.length >= 2) {
      const values: number[] = [];
      for (const { count, value } of freqPairs) {
        for (let i = 0; i < count; i++) values.push(value);
      }
      if (values.length >= 2) {
        return { type: "dot_plot", data: { values, label: "Value" } };
      }
    }
    return buildFallbackTable(questionText, explanation);
  }

  if (isBarChart || isTallyChart) {
    if (catPairs.length >= 2) {
      return {
        type: "bar_chart",
        data: { categories: catPairs.map((p) => p.category), values: catPairs.map((p) => p.value) },
      };
    }
    if (freqPairs.length >= 2) {
      return {
        type: "bar_chart",
        data: { categories: freqPairs.map((p) => String(p.value)), values: freqPairs.map((p) => p.count) },
      };
    }
    if (extractedValues.length >= 2) {
      return {
        type: "bar_chart",
        data: { categories: extractedValues.map((_, i) => `Item ${i + 1}`), values: extractedValues },
      };
    }
    return buildFallbackTable(questionText, explanation);
  }

  return buildFallbackTable(questionText, explanation);
}

function inferTableFromContext(questionText: string, explanation: string): QuestionVisual | null {
  const tableRef =
    /\b(?:the (?:table|line plot|dot plot|bar chart|bar graph|histogram|tally chart|data) (?:shows|below|above|displays)|use the|from the|according to the|based on the|look at the|a (?:table|line plot|dot plot|bar chart|bar graph) (?:shows|displays|lists)|the data (?:shows|below|above|displays))\b/i;
  if (!tableRef.test(questionText)) return null;

  // For dot/line/bar chart references, delegate only -- never fall through to table patterns
  if (DOT_LINE_REF.test(questionText) || BAR_CHART_REF.test(questionText)) {
    return detectDataVisualizationPattern(questionText, explanation, []);
  }

  const combined = `${questionText} ${explanation}`;
  let match;

  // Ordered pairs
  const pairPattern = /\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)/g;
  const pairs: [string, string][] = [];
  while ((match = pairPattern.exec(combined)) !== null) {
    pairs.push([match[1], match[2]]);
  }
  if (pairs.length >= 2) {
    const xLabel = questionText.match(/(?:number of |between\s+)(\w+)/i)?.[1] || "x";
    const yLabel = questionText.match(/(?:and (?:the )?(?:total )?(?:amount of )?)([\w\s]+?)(?:\.|,|\?|$)/i)?.[1]?.trim() || "y";
    return { type: "table", data: { headers: [xLabel, yLabel], rows: pairs } };
  }

  // Division pairs
  const divPattern = /(\d+(?:\.\d+)?)\s*[÷/]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/g;
  const divPairs: [string, string][] = [];
  const seenK = new Set<string>();
  while ((match = divPattern.exec(explanation)) !== null) {
    seenK.add(match[3]);
    divPairs.push([match[2], match[1]]);
  }
  if (divPairs.length >= 2 && seenK.size === 1) {
    return { type: "table", data: { headers: ["x", "y"], rows: divPairs } };
  }

  // Labeled sequences
  const labeledSeqPattern = /(\w[\w\s]*?)\s*(?:\([^)]*\))?\s*:\s*([\d.,\s]+)/g;
  const sequences: { label: string; values: string[] }[] = [];
  while ((match = labeledSeqPattern.exec(questionText)) !== null) {
    const values = match[2].split(/[,\s]+/).filter((v) => v.trim() && /^\d/.test(v.trim()));
    if (values.length >= 2) sequences.push({ label: match[1].trim(), values });
  }
  if (sequences.length >= 2 && sequences[0].values.length === sequences[1].values.length) {
    const rows = sequences[0].values.map((v, i) => [v, sequences[1].values[i]]);
    return { type: "table", data: { headers: [sequences[0].label, sequences[1].label], rows } };
  }

  // Addition-based data
  const additionPattern = /(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?){2,})\s*=\s*(\d+(?:\.\d+)?)/;
  const addMatch = explanation.match(additionPattern);
  if (addMatch) {
    const values = addMatch[1].split(/\s*\+\s*/).map((v) => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: "table", data: { headers: ["#", "Value"], rows } };
    }
  }

  // CSV values
  const csvPattern = /(?:values?|data|numbers?|scores?|results?)\s*(?:are|is|were|:)\s*([\d]+(?:\s*,\s*\d+){2,})/i;
  const csvMatch = (explanation || "").match(csvPattern) || questionText.match(csvPattern);
  if (csvMatch) {
    const values = csvMatch[1].split(/\s*,\s*/).map((v) => v.trim()).filter(Boolean);
    if (values.length >= 3) {
      const rows = values.map((v, i) => [String(i + 1), v]);
      return { type: "table", data: { headers: ["#", "Value"], rows } };
    }
  }

  // Prose-form value lists
  const proseListPattern = /(?:were|are|is|scored|earned|received|recorded|measured|had|got)\s+([\d]+(?:(?:\s*,\s*|\s+and\s+)\d+){2,})/i;
  const proseMatch = combined.match(proseListPattern);
  if (proseMatch) {
    const rawVals = proseMatch[1].replace(/\s+and\s+/g, ", ").split(/\s*,\s*/).filter((v) => /^\d+/.test(v));
    if (rawVals.length >= 3) {
      const rows = rawVals.map((v, i) => [String(i + 1), v]);
      return { type: "table", data: { headers: ["#", "Value"], rows } };
    }
  }

  // Category-value pairs
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
    const rows = catPairs.map((p) => [p.category, p.value]);
    return { type: "table", data: { headers: ["Category", "Value"], rows } };
  }

  return null;
}

function inferVisualForQuestion(
  questionText: string,
  explanation: string,
  options: string[] = []
): QuestionVisual | null {
  // For dot/line/bar chart questions, use detectDataVisualizationPattern (which now falls back to table)
  if (DOT_LINE_REF.test(questionText) || BAR_CHART_REF.test(questionText)) {
    return detectDataVisualizationPattern(questionText, explanation, options);
  }
  return (
    detectTablePattern(questionText) ||
    inferTableFromContext(questionText, explanation) ||
    detectDataVisualizationPattern(questionText, explanation, options) ||
    buildFallbackTable(questionText, explanation)
  );
}

// --- Edge function handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { data: templates, error: fetchError } = await supabase
      .from("quiz_templates")
      .select("id, questions, processed_questions, created_at")
      .gte("created_at", twoWeeksAgo.toISOString())
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    let fixedCount = 0;
    let totalFixed = 0;

    for (const template of templates || []) {
      const questionsArray =
        template.processed_questions?.length > 0
          ? template.processed_questions
          : template.questions;

      if (!questionsArray || !Array.isArray(questionsArray)) continue;

      let modified = false;
      const updatedQuestions = questionsArray.map((q: any) => {
        const questionText = q.questionText || q.question_text || "";
        const explanation = q.explanation || "";
        const options = Array.isArray(q.options) ? q.options : [];

        // Fix incorrectly-typed visuals (table used for dot/line/bar questions)
        if (q.visual && q.visual.type === "table") {
          if (DOT_LINE_REF.test(questionText) || BAR_CHART_REF.test(questionText)) {
            const correct = detectDataVisualizationPattern(questionText, explanation, options);
            if (correct) {
              modified = true;
              totalFixed++;
              return { ...q, visual: correct };
            }
          }
        }

        // Convert unavailable visuals to tables
        if (q.visual && q.visual.type === "unavailable") {
          const inferred = inferVisualForQuestion(questionText, explanation, options);
          if (inferred) {
            modified = true;
            totalFixed++;
            return { ...q, visual: inferred };
          }
          // Remove the unavailable marker entirely if we still can't infer
          modified = true;
          const { visual: _, ...rest } = q;
          return rest;
        }

        if (q.visual) return q;
        if (!VIZ_REF_PATTERN.test(questionText)) return q;

        const inferred = inferVisualForQuestion(questionText, explanation, options);
        if (inferred) {
          modified = true;
          totalFixed++;
          return { ...q, visual: inferred };
        }
        return q;
      });

      if (modified) {
        const updateField =
          template.processed_questions?.length > 0
            ? "processed_questions"
            : "questions";

        const { error: updateError } = await supabase
          .from("quiz_templates")
          .update({ [updateField]: updatedQuestions })
          .eq("id", template.id);

        if (!updateError) fixedCount++;
      }
    }

    // Also fix quiz_attempts
    const { data: attempts, error: attError } = await supabase
      .from("quiz_attempts")
      .select("id, answers")
      .gte("completed_at", twoWeeksAgo.toISOString())
      .order("completed_at", { ascending: false })
      .limit(500);

    if (attError) throw attError;

    let attemptsFixed = 0;

    for (const attempt of attempts || []) {
      if (!attempt.answers || !Array.isArray(attempt.answers)) continue;

      let modified = false;
      const updatedAnswers = attempt.answers.map((a: any) => {
        const questionText = a.questionText || a.question_text || "";
        const explanation = a.explanation || "";
        const options = Array.isArray(a.options) ? a.options : [];

        // Fix incorrectly-typed visuals
        if (a.visual && a.visual.type === "table") {
          if (DOT_LINE_REF.test(questionText) || BAR_CHART_REF.test(questionText)) {
            const correct = detectDataVisualizationPattern(questionText, explanation, options);
            if (correct) {
              modified = true;
              return { ...a, visual: correct };
            }
          }
        }

        // Convert unavailable visuals to tables
        if (a.visual && a.visual.type === "unavailable") {
          const inferred = inferVisualForQuestion(questionText, explanation, options);
          if (inferred) {
            modified = true;
            return { ...a, visual: inferred };
          }
          modified = true;
          const { visual: _, ...rest } = a;
          return rest;
        }

        if (a.visual) return a;
        if (!VIZ_REF_PATTERN.test(questionText)) return a;

        const inferred = inferVisualForQuestion(questionText, explanation, options);
        if (inferred) {
          modified = true;
          return { ...a, visual: inferred };
        }
        return a;
      });

      if (modified) {
        const { error: updateError } = await supabase
          .from("quiz_attempts")
          .update({ answers: updatedAnswers })
          .eq("id", attempt.id);

        if (!updateError) attemptsFixed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        templates_processed: (templates || []).length,
        templates_fixed: fixedCount,
        questions_fixed: totalFixed,
        attempts_processed: (attempts || []).length,
        attempts_fixed: attemptsFixed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
