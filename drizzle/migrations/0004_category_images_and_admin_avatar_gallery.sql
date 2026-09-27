ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;
CREATE POLICY "admins list avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins list thumbnails" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));