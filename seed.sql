-- Seed Data

-- RESTAURANTS
insert into public.restaurants (id, name, slug, description, address, city, state, lat, lng, location, phone, whatsapp, instagram, website, categories, tags, price_level, rating_avg, rating_count, photos, opening_hours, attributes, status, is_verified)
values
(
  'e6329704-5f50-4826-a052-1672322045b1',
  'La Brasa Steakhouse',
  'la-brasa-steakhouse',
  'Churrascaria premium com cortes nobres e ambiente sofisticado.',
  'Av. Itália, 123 - Jardim das Nações',
  'Taubaté',
  'SP',
  -23.025,
  -45.555,
  st_point(-45.555, -23.025)::geography,
  '(12) 3456-7890',
  '551234567890',
  '@labrasa',
  'https://labrasa.com.br',
  ARRAY['Churrascaria', 'Carnes'],
  ARRAY['Premium', 'Jantar', 'Vinhos'],
  4,
  4.8,
  342,
  '[{"id": "p1", "url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBOMJSRXnCCSGJiwSpB-0hfpkx7lIgta_8D0KXkH39SvSNtndLI2vSYFaPNbiEyij4hYWf4L-HOJl65xc_StdtKLZjUyNINl3QOA-udkgksy9JgjqAFz3529eWs-3g554k9O10SIsDIFUOzOJ6o946KOcaySX1rObLMsNYv_pqxnLFM57q2T8S4CcGmZnJHNXMvGG_q9Rkc6-mDbl_nLOARguPfDuKmw3IsNcb9O-pNPUmjlFFdyT8dQGCCBnuPhFeAXHCaB-ra6E-Q", "source": "google", "is_cover": true}]',
  '{"monday": {"open": "18:00", "close": "23:00"}, "tuesday": {"open": "18:00", "close": "23:00"}}',
  '{"pet_friendly": false, "outdoor_seating": true, "wheelchair_accessible": true, "reservation_available": true, "delivery": true, "wifi": true, "parking": true}',
  'active',
  true
),
(
  'f7430815-6f61-5937-b163-2783433156c2',
  'Sushi Koyo',
  'sushi-koyo',
  'Omakase premium e saquês importados.',
  'Rua das Artes, 45 - Centro',
  'Taubaté',
  'SP',
  -23.030,
  -45.560,
  st_point(-45.560, -23.030)::geography,
  null,
  null,
  '@sushikoyo',
  null,
  ARRAY['Japonesa', 'Sushi'],
  ARRAY['Omakase', 'Romântico'],
  3,
  4.7,
  856,
  '[{"id": "p2", "url": "https://lh3.googleusercontent.com/aida-public/AB6AXuBI4-CP7qLfZn42xSde2EzMU_hkE81_tG0I7WpBxhct3sjTXcAcn8tKIxDn66fgIpCPjzNjl8RsNgYtGzW6o6zyNJxBFJ2dociWopBAm6OApxM6PjMXewmWB8CMT5nrRT7CZO6Y8G01ZSekF_EVXykMy-SJhRvofEZQ0oeRjcZhpqQ-0rMpuAvL3UFDl03aK4ncLesCQr91RO_C5es9K8P7PlCyvbf1XH_DxOYUTpgrtSkC-MhIRq6d55OcVoIY5ygL05kWHcjPBToc", "source": "google", "is_cover": true}]',
  '{}',
  '{"pet_friendly": false, "outdoor_seating": false, "wheelchair_accessible": true, "reservation_available": true, "delivery": true, "wifi": true, "parking": false, "vegan_options": true}',
  'active',
  true
);

-- VIDEOS
insert into public.videos (id, restaurant_id, title, description, video_url, thumbnail_url, duration_seconds, views_count, likes_count, tags, status)
values
(
  gen_random_uuid(),
  'e6329704-5f50-4826-a052-1672322045b1',
  'O melhor ponto da carne!',
  'Veja como preparamos nosso bife ancho.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAkcvglrFaW43DLh8kOXRI8OjB04EQQk78sOsEEiUMtfryyjN5RhWYJwwujZFx3jSQCtBfRMX4zVLVk5c3zk6Dd3ktifyE9cWUUCD2JPrUM5aPVh_UPTQ7sYolvUaqVRIPu2Alv8jiUszdUoBWn-THeKkVowBX_DcgyQiUZQWeYAoeQQxWOyidUcF5pzlgl0zbdvaGHdZzMrib_NyVIPVMwNssJXLqaKqmCteFg4LMwDQ83spvXuA4vlL9ZMH5uoUDLRof7RoOBV7Cu',
  30,
  1200,
  150,
  ARRAY['carne', 'churrasco'],
  'active'
);

-- COUPONS
insert into public.coupons (id, restaurant_id, code, title, description, discount_type, discount_value, min_order_value, max_redemptions, current_redemptions, valid_from, valid_until, status)
values
(
  gen_random_uuid(),
  'e6329704-5f50-4826-a052-1672322045b1',
  'QUENTE20',
  '20% OFF no Ancho',
  'Na compra de 2 pratos principais',
  'percentage',
  20,
  150,
  100,
  12,
  now(),
  now() + interval '30 days',
  'active'
);
