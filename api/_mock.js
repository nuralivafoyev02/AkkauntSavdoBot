export const mockPlatforms = [
  {
    slug: 'free-fire',
    title: 'Free Fire',
    subtitle: 'Battle royale akkauntlari',
    accent_color: '#ff5a1f',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/38/Free_Fire_New_Logo.svg/250px-Free_Fire_New_Logo.svg.png',
    sort_order: 10,
    count: 1
  },
  {
    slug: 'mobile-legends',
    title: 'Mobile Legends',
    subtitle: 'Skin, rank va kolleksiya',
    accent_color: '#b24cff',
    image_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a0/Mobile_Legends_Bang_Bang_2025_logo.png/250px-Mobile_Legends_Bang_Bang_2025_logo.png',
    sort_order: 20,
    count: 4
  },
  {
    slug: 'pubg-mobile',
    title: 'PUBG Mobile',
    subtitle: 'UC, skin va inventar',
    accent_color: '#d4a017',
    image_url: 'https://www.pubgmobile.com/common/images/icon_logo.jpg',
    sort_order: 30,
    count: 0
  },
  {
    slug: 'steam',
    title: 'Steam',
    subtitle: 'Game library va profil',
    accent_color: '#1b8a6b',
    image_url: 'https://cdn.simpleicons.org/steam/ffffff',
    sort_order: 40,
    count: 2
  },
  {
    slug: 'telegram',
    title: 'Telegram',
    subtitle: 'Kanal, bot va username',
    accent_color: '#4f5d75',
    image_url: 'https://cdn.simpleicons.org/telegram/ffffff',
    sort_order: 50,
    count: 1
  },
  {
    slug: 'instagram',
    title: 'Instagram',
    subtitle: 'Auditoriya va sahifalar',
    accent_color: '#c23b57',
    image_url: 'https://cdn.simpleicons.org/instagram/ffffff',
    sort_order: 60,
    count: 1
  }
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
    is_top: false,
    media: [],
    created_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'demo-steam-001',
    platform_slug: 'steam',
    title: 'Steam Library 42',
    description: "Kutubxonada premium o'yinlar bor. Profil xavfsiz topshiriladi.",
    price_uzs: 890000,
    status: 'available',
    is_top: false,
    media: [],
    created_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];
