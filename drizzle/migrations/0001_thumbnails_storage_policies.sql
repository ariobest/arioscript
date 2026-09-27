CREATE POLICY "thumbnails readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');

CREATE POLICY "admins upload thumbnails" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update thumbnails" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete thumbnails" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));