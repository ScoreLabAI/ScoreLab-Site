-- Visual (graph/table/geometry) support for generated questions.
-- Required before importing batches from the Question-Bank-Generator pipeline,
-- whose schema (sat-question-generator/references/questions-schema.md) includes
-- these four fields.
ALTER TABLE public.questions
  ADD COLUMN has_visual BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN visual_type TEXT CHECK (visual_type IN ('graph', 'table', 'geometry')),
  ADD COLUMN visual_data JSONB,
  ADD COLUMN visual_svg TEXT;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_visual_fields_consistent CHECK (
    (has_visual = false AND visual_type IS NULL AND visual_data IS NULL)
    OR (has_visual = true AND visual_type IS NOT NULL AND visual_data IS NOT NULL)
  );
