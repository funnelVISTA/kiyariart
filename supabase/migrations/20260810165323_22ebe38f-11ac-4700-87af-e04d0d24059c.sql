insert into public.artworks_custom (title, image_url, price, sold, collection, display_order)
select 'Fierce', 'https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/firece2.jpg/:/rs=w:1200,cg:true,m', 1800, false, 'Our Essence', 100
where not exists (select 1 from public.artworks_custom where title = 'Fierce');

insert into public.artworks_custom (title, image_url, price, sold, collection, display_order)
select 'Madiba', 'https://img1.wsimg.com/isteam/ip/49f80de6-790e-47c4-a130-9393217b754f/Madiba.jpeg/:/rs=w:1200,cg:true,m', 2200, false, 'Our Essence', 101
where not exists (select 1 from public.artworks_custom where title = 'Madiba');