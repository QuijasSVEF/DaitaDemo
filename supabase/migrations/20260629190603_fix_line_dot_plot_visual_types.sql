
-- Convert stored visuals from type 'table' to 'dot_plot' for questions referencing line/dot plots
-- Two data formats exist:
-- Format 1: [["1","5"],["2","6"],...] - index + value pairs -> extract second column as values
-- Format 2: [["1","X"],["2","XX"],...] or [["10","••"],["15","•••"],...] - value + frequency markers -> repeat first column by length of second

DO $$
DECLARE
  template_rec RECORD;
  q_elem jsonb;
  new_questions jsonb;
  new_processed jsonb;
  i int;
  visual jsonb;
  rows_arr jsonb;
  values_arr jsonb;
  row_elem jsonb;
  val_text text;
  freq_text text;
  headers jsonb;
  label_text text;
  is_frequency_format boolean;
  freq_count int;
  j int;
  num_val numeric;
BEGIN
  FOR template_rec IN 
    SELECT DISTINCT qt.id, qt.questions, qt.processed_questions
    FROM quiz_templates qt,
         jsonb_array_elements(qt.processed_questions) as q
    WHERE ((q->>'questionText') ILIKE '%line plot%' OR (q->>'questionText') ILIKE '%dot plot%')
      AND q->'visual' IS NOT NULL
      AND q->'visual'->>'type' = 'table'
  LOOP
    -- Fix processed_questions
    new_processed := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(template_rec.processed_questions) - 1 LOOP
      q_elem := template_rec.processed_questions->i;
      
      IF ((q_elem->>'questionText') ILIKE '%line plot%' OR (q_elem->>'questionText') ILIKE '%dot plot%')
         AND q_elem->'visual' IS NOT NULL
         AND q_elem->'visual'->>'type' = 'table' THEN
        
        visual := q_elem->'visual';
        rows_arr := visual->'data'->'rows';
        headers := visual->'data'->'headers';
        values_arr := '[]'::jsonb;
        label_text := COALESCE(headers->>1, 'Value');
        
        IF rows_arr IS NOT NULL AND jsonb_array_length(rows_arr) > 0 THEN
          -- Detect format: check if second column is non-numeric (X's, dots, etc.)
          freq_text := rows_arr->0->>1;
          is_frequency_format := (freq_text IS NOT NULL AND NOT (freq_text ~ '^\d+\.?\d*$'));
          
          IF is_frequency_format THEN
            -- Format 2: first column is the data value, second column length = frequency
            label_text := COALESCE(headers->>0, 'Value');
            FOR row_elem IN SELECT value FROM jsonb_array_elements(rows_arr) LOOP
              val_text := row_elem->>0;
              freq_text := row_elem->>1;
              IF val_text ~ '^\d+\.?\d*$' AND freq_text IS NOT NULL THEN
                freq_count := char_length(freq_text);
                num_val := val_text::numeric;
                FOR j IN 1..freq_count LOOP
                  values_arr := values_arr || to_jsonb(num_val);
                END LOOP;
              END IF;
            END LOOP;
          ELSE
            -- Format 1: second column is the numeric value
            FOR row_elem IN SELECT value FROM jsonb_array_elements(rows_arr) LOOP
              val_text := row_elem->>1;
              IF val_text IS NOT NULL AND val_text ~ '^\d+\.?\d*$' THEN
                values_arr := values_arr || to_jsonb(val_text::numeric);
              END IF;
            END LOOP;
          END IF;
          
          -- Only convert if we got values
          IF jsonb_array_length(values_arr) >= 2 THEN
            q_elem := jsonb_set(q_elem, '{visual}', jsonb_build_object(
              'type', 'dot_plot',
              'data', jsonb_build_object('values', values_arr, 'label', label_text),
              'caption', COALESCE(visual->>'caption', 'Data Plot')
            ));
          END IF;
        END IF;
      END IF;
      
      new_processed := new_processed || jsonb_build_array(q_elem);
    END LOOP;
    
    -- Fix questions column
    new_questions := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(template_rec.questions) - 1 LOOP
      q_elem := template_rec.questions->i;
      
      IF ((q_elem->>'questionText') ILIKE '%line plot%' OR (q_elem->>'questionText') ILIKE '%dot plot%')
         AND q_elem->'visual' IS NOT NULL
         AND q_elem->'visual'->>'type' = 'table' THEN
        
        visual := q_elem->'visual';
        rows_arr := visual->'data'->'rows';
        headers := visual->'data'->'headers';
        values_arr := '[]'::jsonb;
        label_text := COALESCE(headers->>1, 'Value');
        
        IF rows_arr IS NOT NULL AND jsonb_array_length(rows_arr) > 0 THEN
          freq_text := rows_arr->0->>1;
          is_frequency_format := (freq_text IS NOT NULL AND NOT (freq_text ~ '^\d+\.?\d*$'));
          
          IF is_frequency_format THEN
            label_text := COALESCE(headers->>0, 'Value');
            FOR row_elem IN SELECT value FROM jsonb_array_elements(rows_arr) LOOP
              val_text := row_elem->>0;
              freq_text := row_elem->>1;
              IF val_text ~ '^\d+\.?\d*$' AND freq_text IS NOT NULL THEN
                freq_count := char_length(freq_text);
                num_val := val_text::numeric;
                FOR j IN 1..freq_count LOOP
                  values_arr := values_arr || to_jsonb(num_val);
                END LOOP;
              END IF;
            END LOOP;
          ELSE
            FOR row_elem IN SELECT value FROM jsonb_array_elements(rows_arr) LOOP
              val_text := row_elem->>1;
              IF val_text IS NOT NULL AND val_text ~ '^\d+\.?\d*$' THEN
                values_arr := values_arr || to_jsonb(val_text::numeric);
              END IF;
            END LOOP;
          END IF;
          
          IF jsonb_array_length(values_arr) >= 2 THEN
            q_elem := jsonb_set(q_elem, '{visual}', jsonb_build_object(
              'type', 'dot_plot',
              'data', jsonb_build_object('values', values_arr, 'label', label_text),
              'caption', COALESCE(visual->>'caption', 'Data Plot')
            ));
          END IF;
        END IF;
      END IF;
      
      new_questions := new_questions || jsonb_build_array(q_elem);
    END LOOP;
    
    -- Update the template
    UPDATE quiz_templates
    SET processed_questions = new_processed,
        questions = new_questions
    WHERE id = template_rec.id;
  END LOOP;
END $$;
