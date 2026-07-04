export const CITIES = ["Kathmandu", "Lalitpur", "Bhaktapur"] as const;
export type City = (typeof CITIES)[number];

export const ROOM_TYPES = [
  "Single Room",
  "1BHK",
  "2BHK",
  "Flat",
  "Hostel",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const AMENITIES = [
  { key: "waterSupply", label: "Water Supply" },
  { key: "parking", label: "Parking" },
  { key: "attachedBathroom", label: "Attached Bathroom" },
  { key: "wifiReady", label: "Wi-Fi Ready" },
  { key: "kitchen", label: "Kitchen" },
  { key: "balcony", label: "Balcony" },
] as const;

export const AMENITY_KEYS = AMENITIES.map((a) => a.key) as readonly string[];

export const ROLES = ["SEEKER", "OWNER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const AREAS: Record<City, string[]> = {
  Kathmandu: [
    "Baneshwor",
    "Koteshwor",
    "Kalanki",
    "Chabahil",
    "Baluwatar",
    "Maharajgunj",
    "Kirtipur",
    "Balaju",
    "Gongabu",
    "Samakhusi",
    "Naxal",
    "Thamel",
  ],
  Lalitpur: [
    "Kupondole",
    "Jhamsikhel",
    "Pulchowk",
    "Satdobato",
    "Lagankhel",
    "Imadol",
    "Ekantakuna",
    "Sanepa",
    "Bhaisepati",
  ],
  Bhaktapur: [
    "Suryabinayak",
    "Kamalbinayak",
    "Sallaghari",
    "Dudhpati",
    "Katunje",
    "Sipadol",
    "Thimi",
    "Gatthaghar",
  ],
};

export const AREA_COORDS: Record<
  string,
  { city: City; lat: number; lng: number }
> = {
  Baneshwor: { city: "Kathmandu", lat: 27.6939, lng: 85.342 },
  Koteshwor: { city: "Kathmandu", lat: 27.6776, lng: 85.3497 },
  Kalanki: { city: "Kathmandu", lat: 27.6934, lng: 85.281 },
  Chabahil: { city: "Kathmandu", lat: 27.7172, lng: 85.348 },
  Baluwatar: { city: "Kathmandu", lat: 27.728, lng: 85.33 },
  Maharajgunj: { city: "Kathmandu", lat: 27.736, lng: 85.332 },
  Kirtipur: { city: "Kathmandu", lat: 27.679, lng: 85.277 },
  Balaju: { city: "Kathmandu", lat: 27.729, lng: 85.301 },
  Gongabu: { city: "Kathmandu", lat: 27.735, lng: 85.316 },
  Samakhusi: { city: "Kathmandu", lat: 27.738, lng: 85.323 },
  Naxal: { city: "Kathmandu", lat: 27.713, lng: 85.327 },
  Thamel: { city: "Kathmandu", lat: 27.715, lng: 85.311 },
  Kupondole: { city: "Lalitpur", lat: 27.687, lng: 85.317 },
  Jhamsikhel: { city: "Lalitpur", lat: 27.677, lng: 85.309 },
  Pulchowk: { city: "Lalitpur", lat: 27.679, lng: 85.317 },
  Satdobato: { city: "Lalitpur", lat: 27.658, lng: 85.326 },
  Lagankhel: { city: "Lalitpur", lat: 27.667, lng: 85.323 },
  Imadol: { city: "Lalitpur", lat: 27.661, lng: 85.341 },
  Ekantakuna: { city: "Lalitpur", lat: 27.664, lng: 85.31 },
  Sanepa: { city: "Lalitpur", lat: 27.682, lng: 85.306 },
  Bhaisepati: { city: "Lalitpur", lat: 27.645, lng: 85.301 },
  Suryabinayak: { city: "Bhaktapur", lat: 27.666, lng: 85.434 },
  Kamalbinayak: { city: "Bhaktapur", lat: 27.679, lng: 85.436 },
  Sallaghari: { city: "Bhaktapur", lat: 27.672, lng: 85.447 },
  Dudhpati: { city: "Bhaktapur", lat: 27.672, lng: 85.427 },
  Katunje: { city: "Bhaktapur", lat: 27.656, lng: 85.429 },
  Sipadol: { city: "Bhaktapur", lat: 27.654, lng: 85.456 },
  Thimi: { city: "Bhaktapur", lat: 27.681, lng: 85.386 },
  Gatthaghar: { city: "Bhaktapur", lat: 27.674, lng: 85.376 },
};

export const VALLEY_CENTER = { lat: 27.705, lng: 85.33, zoom: 12 } as const;
