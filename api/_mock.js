export const mockPlatforms = [
  {
    slug: 'free-fire',
    title: 'Free Fire',
    subtitle: 'Battle royale akkauntlari',
    accent_color: '#ff5a1f',
    image_url: '/assets/free-fire.png',
    sort_order: 10,
    count: 1
  },
  {
    slug: 'mobile-legends',
    title: 'Mobile Legends',
    subtitle: 'Skin, rank va kolleksiya',
    accent_color: '#b24cff',
    image_url: '/assets/mobile-legends-5v5.png',
    sort_order: 20,
    count: 4
  },
  {
    slug: 'pubg-mobile',
    title: 'PUBG Mobile',
    subtitle: 'UC, skin va inventar',
    accent_color: '#d4a017',
    image_url: '/assets/pubg-mobile.png',
    sort_order: 30,
    count: 0
  },
  {
    slug: 'steam',
    title: 'Steam',
    subtitle: 'Game library va profil',
    accent_color: '#1b8a6b',
    image_url: '/assets/steam.png',
    sort_order: 40,
    count: 2
  },
  {
    slug: 'telegram',
    title: 'Telegram',
    subtitle: 'NFT va username savdosi',
    accent_color: '#2aabee',
    image_url: '/assets/telegram.png',
    sort_order: 50,
    count: 0
  },
];

const now = Date.now();

export const mockAccounts = [
  {
    id: 'demo-ml-516874602',
    platform_slug: 'mobile-legends',
    title: '516874602 (6253)',
    description: 'Akkaunt toza, muntonga ulangan. 32 ta eksklyuziv skin, rank va kolleksiya yaxshi holatda.',
    price_uzs: 5000000,
    status: 'available',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: true,
    media: [],
    created_at: new Date(now - 18 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-ml-megakol',
    platform_slug: 'mobile-legends',
    title: 'Megakol',
    description: "Rank stabil, login ma'lumotlari topshiriladi. Skinlar va emblema setlari bor.",
    price_uzs: 1500000,
    status: 'available',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: true,
    media: [],
    created_at: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-ml-miravoy',
    platform_slug: 'mobile-legends',
    title: 'Miravoy',
    description: "Kolleksiya kuchli, ko'p yillik profil. Xaridor tekshirishi uchun media qo'shiladi.",
    price_uzs: 5400000,
    status: 'available',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: true,
    media: [],
    created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-ff-001',
    platform_slug: 'free-fire',
    title: 'FF Veteran 2019',
    description: 'Eski sezon buyumlari bor, email almashadi. Narx yakuniy.',
    price_uzs: 2200000,
    status: 'available',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: false,
    media: [],
    created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-ml-sold-001',
    platform_slug: 'mobile-legends',
    title: 'ML Collector 2020',
    description: "Admin tomonidan sotildi deb belgilangan demo akkaunt.",
    price_uzs: 3100000,
    status: 'sold',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: false,
    media: [],
    created_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-steam-001',
    platform_slug: 'steam',
    title: 'Steam Library 42',
    description: "Kutubxonada premium o'yinlar bor. Profil xavfsiz topshiriladi.",
    price_uzs: 890000,
    status: 'available',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: false,
    media: [],
    created_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-tg-nft-001',
    platform_slug: 'telegram',
    title: 'https://t.me/nft/demo',
    description: '@@listing_type:nft@@\nTelegram NFT: https://t.me/nft/demo',
    listing_type: 'nft',
    price_uzs: 1200000,
    status: 'available',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: false,
    media: [],
    created_at: new Date(now - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-tg-username-001',
    platform_slug: 'telegram',
    title: '@demo_username',
    description: '@@listing_type:username@@\nTelegram username: @demo_username',
    listing_type: 'username',
    price_uzs: 2500000,
    status: 'available',
    seller_tg_id: 0,
    seller_username: 'local_dev',
    seller_name: 'Local Dev',
    is_top: false,
    media: [],
    created_at: new Date(now - 4 * 60 * 60 * 1000).toISOString()
  }
];
