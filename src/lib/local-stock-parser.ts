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
