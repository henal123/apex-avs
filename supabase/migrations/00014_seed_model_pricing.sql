-- Seed model pricing data
INSERT INTO public.model_pricing (model_name, service, cost_per_1k_input_tokens, cost_per_1k_output_tokens, cost_per_image) VALUES
  ('gemini-2.5-pro', 'gemini', 0.00125, 0.005, 0),
  ('gemini-2.0-flash', 'gemini', 0.0001, 0.0004, 0),
  ('claude-sonnet', 'claude', 0.003, 0.015, 0),
  ('nano-banana-pro', 'image_gen', 0, 0, 0.03),
  ('flux-pro', 'image_gen', 0, 0, 0.30)
ON CONFLICT (model_name) DO NOTHING;
