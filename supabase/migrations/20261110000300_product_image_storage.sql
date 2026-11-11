-- Kraft & Petal: Storage bucket for product photos.
--
-- The bucket is public, so anyone can load a picture by its URL (the shop
-- window needs that). Only operators may upload, replace or delete files.
-- Limits match IMAGE_UPLOAD in src/lib/config.ts: 300 KB, JPEG, PNG or WebP.
--
-- Storage files are not part of a database dump. See "Backups" in the README.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  307200,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Operators need to see the files to replace or delete them. Everyone else
-- reads pictures through the public URL, which does not use these policies,
-- so visitors cannot list the bucket.
create policy "Product image files: operators list"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_operator()));

create policy "Product image files: operators upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_operator()));

create policy "Product image files: operators replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_operator()))
  with check (bucket_id = 'product-images' and (select public.is_operator()));

create policy "Product image files: operators delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_operator()));
