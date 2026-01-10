/**
 * Local parser for stock transcription - works offline as a fallback
 * when AI analysis is unavailable.
 * 
 * Matches patterns like:
 * - "500 sachets de sucre à 1200 CFA"
 * - "iPhone 12 Pro, quantité 12, prix 15000"
 * - "10 cartons de fanta à 6000 francs"
 * - "J'ai 50 savons Lux à 500 francs"
 * - "dix bidons d'huile à mille cinq cents" (French number words)
 * 
 * Separator rule:
 * - "suivant" / "stop" / "c'est tout" act as product separators
 */

export interface ParsedStockItem {
  name: string;
  quantity: number;
  unit_price: number;
  model: string | null;
  confidence: "high" | "medium" | "low";
}

export interface LocalParseResult {
  items: ParsedStockItem[];
  unparsedText: string[];
  suggestions: string[];
}

// Common African/West African products dictionary with aliases
export const PRODUCT_DICTIONARY: Array<{
  name: string;
  aliases: string[];
  category: string;
  default_unit?: string;
  typical_prices?: number[];
}> = [
  // Alimentation de base
  { name: "Riz", aliases: ["riz", "ris", "rice", "riz local", "riz importé", "riz parfumé"], category: "alimentation", default_unit: "sac", typical_prices: [15000, 18000, 25000] },
  { name: "Sucre", aliases: ["sucre", "sucr", "sugar"], category: "alimentation", default_unit: "sachet", typical_prices: [500, 1000, 1200] },
  { name: "Huile", aliases: ["huile", "huil", "oil", "huile de palme", "huile végétale", "huile d'arachide"], category: "alimentation", default_unit: "bidon", typical_prices: [1500, 2500, 5000] },
  { name: "Sel", aliases: ["sel", "salt"], category: "alimentation", default_unit: "sachet", typical_prices: [100, 200, 500] },
  { name: "Farine", aliases: ["farine", "farin", "flour"], category: "alimentation", default_unit: "sachet", typical_prices: [500, 1000, 2000] },
  { name: "Maïs", aliases: ["mais", "maïs", "mais", "corn"], category: "alimentation", default_unit: "sac", typical_prices: [10000, 15000, 20000] },
  { name: "Mil", aliases: ["mil", "millet"], category: "alimentation", default_unit: "sac", typical_prices: [8000, 12000] },
  { name: "Haricot", aliases: ["haricot", "haricots", "beans", "niébé"], category: "alimentation", default_unit: "sac", typical_prices: [15000, 25000] },
  { name: "Pâtes", aliases: ["pates", "pâtes", "pasta", "spaghetti", "macaroni", "coquillette"], category: "alimentation", default_unit: "paquet", typical_prices: [250, 500, 1000] },
  { name: "Tomate concentrée", aliases: ["tomate", "concentré de tomate", "tomato paste"], category: "alimentation", default_unit: "boite", typical_prices: [200, 500, 1000] },
  { name: "Cube Maggi", aliases: ["maggi", "cube", "cube maggi", "arôme"], category: "alimentation", default_unit: "paquet", typical_prices: [25, 50, 100] },
  
  // Boissons
  { name: "Fanta", aliases: ["fanta", "fenta"], category: "boisson", default_unit: "casier", typical_prices: [6000, 8000] },
  { name: "Coca-Cola", aliases: ["coca", "coca cola", "cocacola", "coke"], category: "boisson", default_unit: "casier", typical_prices: [6000, 8000] },
  { name: "Sprite", aliases: ["sprite", "sprit"], category: "boisson", default_unit: "casier", typical_prices: [6000, 8000] },
  { name: "Bière", aliases: ["biere", "bière", "beer", "flag", "castel", "33 export"], category: "boisson", default_unit: "casier", typical_prices: [8000, 10000, 12000] },
  { name: "Eau minérale", aliases: ["eau", "eau minerale", "eau minérale", "water", "tangui", "voltic"], category: "boisson", default_unit: "pack", typical_prices: [1500, 2500, 3000] },
  { name: "Jus", aliases: ["jus", "juice", "jus de fruit"], category: "boisson", default_unit: "pack", typical_prices: [1000, 2000, 3000] },
  
  // Hygiène et entretien
  { name: "Savon", aliases: ["savon", "savons", "soap", "savon lux", "savon palmolive", "savon dettol"], category: "hygiene", default_unit: "piece", typical_prices: [200, 500, 1000] },
  { name: "Lessive", aliases: ["lessive", "omo", "ariel", "tide", "détergent"], category: "hygiene", default_unit: "sachet", typical_prices: [100, 250, 500] },
  { name: "Dentifrice", aliases: ["dentifrice", "colgate", "close up", "pate dentifrice"], category: "hygiene", default_unit: "tube", typical_prices: [500, 1000, 1500] },
  { name: "Shampoing", aliases: ["shampoing", "shampooing", "shampoo"], category: "hygiene", default_unit: "bouteille", typical_prices: [500, 1000, 2000] },
  { name: "Papier hygiénique", aliases: ["papier", "papier toilette", "toilet paper", "pq"], category: "hygiene", default_unit: "rouleau", typical_prices: [100, 200, 500] },
  { name: "Couches", aliases: ["couches", "pampers", "couches bébé", "diapers"], category: "hygiene", default_unit: "paquet", typical_prices: [2000, 5000, 10000] },
  
  // Construction
  { name: "Ciment", aliases: ["ciment", "cement", "sac de ciment"], category: "construction", default_unit: "sac", typical_prices: [4500, 5000, 5500] },
  { name: "Fer à béton", aliases: ["fer", "fer à béton", "fer béton", "rebar"], category: "construction", default_unit: "barre", typical_prices: [2000, 3500, 5000] },
  { name: "Sable", aliases: ["sable", "sand"], category: "construction", default_unit: "camion", typical_prices: [25000, 35000, 50000] },
  { name: "Gravier", aliases: ["gravier", "gravel"], category: "construction", default_unit: "camion", typical_prices: [30000, 40000, 60000] },
  { name: "Tôle", aliases: ["tole", "tôle", "tole bac", "tôle bac"], category: "construction", default_unit: "piece", typical_prices: [5000, 8000, 12000] },
  
  // Électronique
  { name: "Chargeur", aliases: ["chargeur", "charger", "chargeur téléphone"], category: "electronique", default_unit: "piece", typical_prices: [1000, 2000, 5000] },
  { name: "Écouteurs", aliases: ["ecouteur", "écouteur", "ecouteurs", "écouteurs", "earphones", "casque"], category: "electronique", default_unit: "piece", typical_prices: [500, 1500, 5000] },
  { name: "Câble USB", aliases: ["cable", "câble", "usb", "cable usb"], category: "electronique", default_unit: "piece", typical_prices: [500, 1000, 2000] },
  { name: "Batterie", aliases: ["batterie", "battery", "pile", "piles"], category: "electronique", default_unit: "piece", typical_prices: [2000, 5000, 15000] },
  { name: "Écran", aliases: ["ecran", "écran", "screen"], category: "electronique", default_unit: "piece", typical_prices: [5000, 10000, 25000] },
  { name: "Téléphone", aliases: ["telephone", "téléphone", "phone", "portable"], category: "electronique", default_unit: "piece", typical_prices: [15000, 50000, 150000] },
  
  // Vêtements
  { name: "Pagne", aliases: ["pagne", "pagnes", "wax", "tissu"], category: "vetement", default_unit: "piece", typical_prices: [2000, 5000, 15000] },
  { name: "T-shirt", aliases: ["tshirt", "t-shirt", "t shirt", "tricot"], category: "vetement", default_unit: "piece", typical_prices: [1500, 3000, 5000] },
  { name: "Chaussures", aliases: ["chaussure", "chaussures", "shoes", "sandales"], category: "vetement", default_unit: "paire", typical_prices: [5000, 15000, 30000] },
];

// Normalize text for parsing
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, " ")
    .trim();
}

// French word numbers mapping (extended)
const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  un: 1, une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  "dix-sept": 17, "dixsept": 17,
  "dix-huit": 18, "dixhuit": 18,
  "dix-neuf": 19, "dixneuf": 19,
  vingt: 20,
  "vingt-et-un": 21, "vingt et un": 21,
  "vingt-deux": 22, "vingt deux": 22,
  "vingt-trois": 23, "vingt trois": 23,
  "vingt-quatre": 24, "vingt quatre": 24,
  "vingt-cinq": 25, "vingt cinq": 25,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  "soixante-dix": 70, "soixante dix": 70,
  "quatre-vingt": 80, "quatre vingt": 80, "quatrevingt": 80,
  "quatre-vingt-dix": 90, "quatre vingt dix": 90,
  cent: 100,
  "deux cents": 200, "deux cent": 200,
  "trois cents": 300, "trois cent": 300,
  "quatre cents": 400, "quatre cent": 400,
  "cinq cents": 500, "cinq cent": 500,
  mille: 1000,
  "deux mille": 2000,
  "trois mille": 3000,
  "quatre mille": 4000,
  "cinq mille": 5000,
  "six mille": 6000,
  "sept mille": 7000,
  "huit mille": 8000,
  "neuf mille": 9000,
  "dix mille": 10000,
  "quinze mille": 15000,
  "vingt mille": 20000,
  "cent mille": 100000,
};

// Extended units list
const UNITS = [
  "sachet", "sachets",
  "carton", "cartons",
  "bouteille", "bouteilles",
  "paquet", "paquets",
  "boite", "boites", "boîte", "boîtes",
  "sac", "sacs",
  "piece", "pieces", "pièce", "pièces",
  "unite", "unites", "unité", "unités",
  "bidon", "bidons",
  "casier", "casiers",
  "caisse", "caisses",
  "pack", "packs",
  "lot", "lots",
  "douzaine", "douzaines",
  "kilo", "kilos", "kilogramme", "kilogrammes", "kg",
  "litre", "litres", "l",
  "gramme", "grammes", "g",
  "metre", "metres", "mètre", "mètres", "m",
  "rouleau", "rouleaux",
  "tube", "tubes",
  "pot", "pots",
  "barre", "barres",
  "palette", "palettes",
  "plateau", "plateaux",
  "paire", "paires",
  "camion", "camions",
];

// Separator keywords (product boundaries)
const SEPARATORS = [
  "suivant",
  "suivante", 
  "ensuite",
  "puis",
  "aussi",
  "et",
  "stop",
  "c'est tout",
  "termine",
  "terminé",
  "fini",
];

/**
 * Find product from dictionary
 */
export function findProductInDictionary(text: string): typeof PRODUCT_DICTIONARY[0] | null {
  const normalized = normalizeText(text);
  
  for (const product of PRODUCT_DICTIONARY) {
    for (const alias of product.aliases) {
      if (normalized.includes(normalizeText(alias))) {
        return product;
      }
    }
  }
  
  return null;
}

/**
 * Parse French number words to actual numbers
 * Handles compound numbers like "mille cinq cents" = 1500
 */
function parseWordNumber(text: string): number | null {
  const normalized = normalizeText(text);
  
  // Direct number match first
  const numMatch = normalized.match(/^(\d+(?:[.,]\d+)?)$/);
  if (numMatch) {
    return parseFloat(numMatch[1].replace(",", "."));
  }
  
  // Direct word match
  if (WORD_NUMBERS[normalized] !== undefined) {
    return WORD_NUMBERS[normalized];
  }
  
  // Compound number parsing: "mille cinq cents", "deux mille trois cents"
  let total = 0;
  let current = 0;
  const words = normalized.split(/[\s-]+/);
  
  for (const word of words) {
    if (WORD_NUMBERS[word] !== undefined) {
      const value = WORD_NUMBERS[word];
      
      if (value === 1000) {
        // "mille" multiplies what we have, or just adds 1000
        current = (current === 0 ? 1 : current) * 1000;
      } else if (value === 100) {
        // "cent" multiplies preceding number or just 100
        current = (current === 0 ? 1 : current) * 100;
      } else if (value >= 1000) {
        // Direct large numbers
        total += current;
        current = value;
      } else {
        current += value;
      }
    }
  }
  
  total += current;
  return total > 0 ? total : null;
}

/**
 * Extract number from text (handles digits and French words)
 */
function extractNumber(text: string): number | null {
  // Direct number
  const numMatch = text.match(/(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1].replace(",", "."));
  }
  
  // Try word number parsing
  return parseWordNumber(text);
}

/**
 * Extract price from a segment
 * Handles: "à 1200", "prix 15000", "1500 CFA", "à mille cinq cents francs"
 */
function extractPrice(segment: string): number {
  const normalized = normalizeText(segment);
  
  // Pattern 1: "à [number] CFA/francs"
  const pricePatterns = [
    /(?:a|à)\s+(\d+(?:[.,]\d+)?)\s*(?:cfa|fcfa|francs?|f\b)?/i,
    /(?:prix|cout|coute)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:cfa|fcfa|francs?|f\b)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:l'unite|l'unité|piece|pièce|par)/i,
  ];
  
  for (const pattern of pricePatterns) {
    const match = segment.match(pattern);
    if (match) {
      return Math.round(parseFloat(match[1].replace(",", ".")));
    }
  }
  
  // Pattern 2: Word numbers after "à" - "à mille cinq cents"
  const wordPriceMatch = normalized.match(/(?:a|à)\s+(.+?)(?:\s*(?:cfa|fcfa|francs?|f\b|$))/i);
  if (wordPriceMatch) {
    const wordPrice = parseWordNumber(wordPriceMatch[1]);
    if (wordPrice && wordPrice > 0) {
      return wordPrice;
    }
  }
  
  return 0;
}

/**
 * Extract quantity from a segment
 * Handles: "500 sachets", "dix bidons", "quantité 12"
 */
function extractQuantity(segment: string): number {
  const normalized = normalizeText(segment);
  
  // Pattern: "j'ai/on a [number]"
  const prefixMatch = normalized.match(/(?:j'ai|jai|il y a|on a)\s+(\d+)/i);
  if (prefixMatch) {
    return Math.round(parseFloat(prefixMatch[1]));
  }
  
  // Pattern: "quantité [number]"
  const qtyMatch = normalized.match(/(?:quantite|qté|qty)\s*(?:de\s+)?(\d+)/i);
  if (qtyMatch) {
    return Math.round(parseFloat(qtyMatch[1]));
  }
  
  // Pattern: "[number] [unit]"
  const unitsPattern = UNITS.join("|");
  const numUnitPattern = new RegExp(`^(\\d+)\\s+(?:${unitsPattern})`, "i");
  const numUnitMatch = segment.match(numUnitPattern);
  if (numUnitMatch) {
    return Math.round(parseFloat(numUnitMatch[1]));
  }
  
  // Pattern: Word number at start followed by unit
  const wordQtyPattern = new RegExp(`^([a-zéèêëàâäùûü\\s-]+?)\\s+(?:${unitsPattern})`, "i");
  const wordMatch = normalized.match(wordQtyPattern);
  if (wordMatch) {
    const qty = parseWordNumber(wordMatch[1]);
    if (qty && qty > 0 && qty <= 10000) {
      return qty;
    }
  }
  
  // Fallback: first number in segment
  const firstNum = segment.match(/^(\d+)\s+/);
  if (firstNum) {
    return Math.round(parseFloat(firstNum[1]));
  }
  
  return 1; // Default to 1
}

/**
 * Extract product name from a segment
 */
function extractProductName(segment: string): string {
  let name = segment;
  
  // Remove quantity prefix (number or word number)
  name = name
    .replace(/^(?:j'ai|jai|il y a|on a)\s*\d+\s*/i, "")
    .replace(/^(?:quantite|qté|qty)\s*(?:de\s+)?\d+\s*/i, "")
    .replace(/^\d+\s+/i, "");
  
  // Remove word number prefix (e.g., "dix ", "vingt ")
  const wordNumPrefixPattern = /^(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|mille)\s+/i;
  name = name.replace(wordNumPrefixPattern, "");
  
  // Remove price suffix
  name = name
    .replace(/\s*(?:a|à)\s+[\d\w\s]+?(?:cfa|fcfa|francs?|f\b)?.*$/i, "")
    .replace(/\s*(?:prix|cout)\s*(?:de\s+)?[\d\w\s]+.*$/i, "")
    .replace(/\s*\d+\s*(?:cfa|fcfa|francs?|f\b).*$/i, "")
    .replace(/\s*,\s*(?:quantite|prix).*$/i, "");
  
  // Remove common filler words at start
  name = name
    .replace(/^(?:de|des|du|le|la|les|un|une)\s+/i, "")
    .trim();
  
  // Capitalize first letter
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  return name || "Produit inconnu";
}

/**
 * Parse a single segment into a stock item
 */
function parseSegment(segment: string): ParsedStockItem | null {
  const trimmed = segment.trim();
  if (trimmed.length < 3) return null;
  
  const quantity = extractQuantity(trimmed);
  const price = extractPrice(trimmed);
  const name = extractProductName(trimmed);
  
  // Determine confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (quantity > 0 && price > 0 && name.length > 2 && name !== "Produit inconnu") {
    confidence = "high";
  } else if ((quantity > 0 || price > 0) && name.length > 2 && name !== "Produit inconnu") {
    confidence = "medium";
  }
  
  // Skip if name is too generic
  if (name === "Produit inconnu" && quantity === 1 && price === 0) {
    return null;
  }
  
  return {
    name,
    quantity,
    unit_price: price,
    model: null,
    confidence,
  };
}

/**
 * Split transcript by separator keywords ("suivant", "stop", etc.)
 */
function splitBySeparators(transcript: string): string[] {
  let text = transcript;
  
  // Replace separators with a unique delimiter
  const separatorPattern = new RegExp(
    `\\b(${SEPARATORS.join("|")})\\b`,
    "gi"
  );
  text = text.replace(separatorPattern, "|||SPLIT|||");
  
  // Also split by punctuation
  text = text.replace(/[,;.]/g, "|||SPLIT|||");
  
  // Split and clean
  return text
    .split("|||SPLIT|||")
    .map(s => s.trim())
    .filter(s => s.length > 2);
}

/**
 * Parse a raw transcript locally without AI
 */
export function parseTranscriptLocally(transcript: string): LocalParseResult {
  const items: ParsedStockItem[] = [];
  const unparsedText: string[] = [];
  const suggestions: string[] = [];
  
  // Split by separator keywords and punctuation
  const segments = splitBySeparators(transcript);
  
  for (const segment of segments) {
    const parsed = parseSegment(segment);
    if (parsed) {
      items.push(parsed);
    } else if (segment.length > 5) {
      unparsedText.push(segment);
    }
  }
  
  // Generate suggestions
  if (items.length === 0) {
    suggestions.push("Aucun produit détecté. Essayez: 'dix sachets de sucre à mille deux cents francs'");
  } else {
    const lowConfidence = items.filter(i => i.confidence === "low");
    const noPrice = items.filter(i => i.unit_price === 0);
    
    if (lowConfidence.length > 0) {
      suggestions.push("Certains produits manquent de détails (prix ou quantité). Vérifiez-les.");
    }
    if (noPrice.length > 0) {
      suggestions.push(`${noPrice.length} produit(s) sans prix. Ajoutez 'à [prix] francs'.`);
    }
    if (unparsedText.length > 0) {
      suggestions.push(`${unparsedText.length} segment(s) non reconnu(s). Vérifiez la transcription.`);
    }
  }
  
  return { items, unparsedText, suggestions };
}

/**
 * Check if local parsing is likely to produce good results
 */
export function canParseLocally(transcript: string): boolean {
  const normalized = normalizeText(transcript);
  
  // Check for quantity indicators (digits or word numbers)
  const hasQuantity = /\d+|(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|trente|cinquante|cent|mille)/i.test(normalized);
  
  // Check for product/unit indicators
  const unitsPattern = UNITS.slice(0, 20).join("|");
  const hasUnit = new RegExp(unitsPattern, "i").test(normalized);
  
  return (hasQuantity || hasUnit) && normalized.length > 10;
}
