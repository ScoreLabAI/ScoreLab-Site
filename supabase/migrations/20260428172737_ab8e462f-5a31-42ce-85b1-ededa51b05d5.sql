
-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- touch_updated_at: pin search_path
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Seed 5 placeholder questions
INSERT INTO public.questions
  (section, skill_category, skill_subcategory, difficulty, module_type, question_text,
   answer_a, answer_b, answer_c, answer_d, correct_answer, explanation, is_diagnostic)
VALUES
  ('math','Linear Equations','Solving Linear Equations',1,'standard',
   'If 3x + 7 = 22, what is the value of x?',
   '3','5','7','15','B',
   'Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5.', true),
  ('math','Geometry','Triangles',2,'standard',
   'A right triangle has legs of length 6 and 8. What is the length of the hypotenuse?',
   '10','12','14','100','A',
   'By the Pythagorean theorem, hypotenuse = sqrt(6^2 + 8^2) = sqrt(100) = 10.', true),
  ('math','Advanced Math','Quadratic Functions',3,'hard_module',
   'What are the solutions to x^2 - 5x + 6 = 0?',
   'x = 1, x = 6','x = -2, x = -3','x = 2, x = 3','x = -1, x = -6','C',
   'Factor: (x - 2)(x - 3) = 0, so x = 2 or x = 3.', true),
  ('reading_writing','Main Idea and Purpose','Identifying Main Idea',1,'standard',
   'The passage primarily serves to:',
   'Argue against a scientific theory',
   'Describe a historical event in detail',
   'Introduce a concept and provide an example',
   'Compare two competing viewpoints','C',
   'The passage opens with a concept and supports it with an example, matching choice C.', true),
  ('reading_writing','Grammar and Usage','Subject-Verb Agreement',2,'standard',
   'The team of researchers ___ presenting their findings tomorrow.',
   'are','is','were','be','B',
   '"Team" is a singular collective noun, so the singular verb "is" is correct.', true);
