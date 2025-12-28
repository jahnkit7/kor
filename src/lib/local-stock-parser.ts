/**
 * Local parser for stock transcription - works offline as a fallback
 * when AI analysis is unavailable.
 * 
 * Matches patterns like:
 * - "500 sachets de sucre à 1200 CFA"
 * - "iPhone 12 Pro, quantité 12, prix 15000"
 * - "10 cartons de fanta à 6000 francs"
 * - "J'ai 50 savons Lux à 500 francs"
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

// Extract number from text (handles "50", "cinquante", etc.)
function extractNumber(text: string): number | null {
  // Direct number
  const numMatch = text.match(/(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    return parseFloat(numMatch[1].replace(",", "."));
  }
  
  // French word numbers (basic)
  const wordNumbers: Record<string, number> = {
    un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5,
    six: 6, sept: 7, huit: 8, neuf: 9, dix: 10,
    onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15,
    seize: 16, vingt: 20, trente: 30, quarante: 40, cinquante: 50,
    soixante: 60, cent: 100, mille: 1000
  };
  
  const normalized = normalizeText(text);
  for (const [word, num] of Object.entries(wordNumbers)) {
    if (normalized.includes(word)) {
      return num;
    }
  }
  
  return null;
}

// Extract price from a segment
function extractPrice(segment: string): number {
  // Patterns: "à 1200", "prix 15000", "1500 CFA", "1500 francs", "à 500 F"
  const pricePatterns = [
    /(?:a|à)\s*(\d+(?:[.,]\d+)?)\s*(?:cfa|fcfa|francs?|f\b)?/i,
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
  
  return 0;
}

// Extract quantity from a segment
function extractQuantity(segment: string): number {
  // Patterns: "500 sachets", "quantité 12", "j'ai 50", "10 cartons"
  const qtyPatterns = [
    /(?:j'ai|jai|il y a|on a)\s*(\d+)/i,
    /(?:quantite|qté|qty)\s*(?:de\s+)?(\d+)/i,
    /^(\d+)\s+(?:sachets?|cartons?|bouteilles?|paquets?|boites?|boîtes?|sacs?|pièces?|pieces?|unites?|unités?)/i,
    /(\d+)\s+(?:sachets?|cartons?|bouteilles?|paquets?|boites?|boîtes?|sacs?|pièces?|pieces?|unites?|unités?)/i,
    /^(\d+)\s+/i,
  ];
  
  for (const pattern of qtyPatterns) {
    const match = segment.match(pattern);
    if (match) {
      return Math.round(parseFloat(match[1]));
    }
  }
  
  return 1; // Default to 1
}

// Extract product name from a segment
function extractProductName(segment: string): string {
  // Remove quantity prefix
  let name = segment
    .replace(/^(?:j'ai|jai|il y a|on a)\s*\d+\s*/i, "")
    .replace(/^(?:quantite|qté|qty)\s*(?:de\s+)?\d+\s*/i, "")
    .replace(/^\d+\s+/i, "");
  
  // Remove price suffix
  name = name
    .replace(/\s*(?:a|à)\s*\d+(?:[.,]\d+)?\s*(?:cfa|fcfa|francs?|f\b)?.*$/i, "")
    .replace(/\s*(?:prix|cout)\s*(?:de\s+)?\d+.*$/i, "")
    .replace(/\s*\d+\s*(?:cfa|fcfa|francs?|f\b).*$/i, "")
    .replace(/\s*,\s*(?:quantite|prix).*$/i, "");
  
  // Remove common filler words
  name = name
    .replace(/^(?:de|des|du|le|la|les|un|une)\s+/i, "")
    .trim();
  
  // Capitalize first letter
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  
  return name || "Produit inconnu";
}

// Parse a single segment
function parseSegment(segment: string): ParsedStockItem | null {
  const trimmed = segment.trim();
  if (trimmed.length < 3) return null;
  
  const quantity = extractQuantity(trimmed);
  const price = extractPrice(trimmed);
  const name = extractProductName(trimmed);
  
  // Determine confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (quantity > 0 && price > 0 && name.length > 2) {
    confidence = "high";
  } else if ((quantity > 0 || price > 0) && name.length > 2) {
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
 * Parse a raw transcript locally without AI
 */
export function parseTranscriptLocally(transcript: string): LocalParseResult {
  const items: ParsedStockItem[] = [];
  const unparsedText: string[] = [];
  const suggestions: string[] = [];
  
  // Split by common separators: comma, "et", "puis", "ensuite", periods
  const segments = transcript
    .split(/[,;.]|\s+et\s+|\s+puis\s+|\s+ensuite\s+|\s+aussi\s+/gi)
    .map(s => s.trim())
    .filter(s => s.length > 2);
  
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
    suggestions.push("Aucun produit détecté. Essayez: '50 sachets de sucre à 1200 CFA'");
  } else {
    const lowConfidence = items.filter(i => i.confidence === "low");
    if (lowConfidence.length > 0) {
      suggestions.push("Certains produits manquent de détails (prix ou quantité). Vérifiez-les.");
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
  
  // Check for quantity indicators
  const hasQuantity = /\d+|(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)/i.test(normalized);
  
  // Check for product indicators
  const hasProduct = /(?:sachet|carton|bouteille|paquet|boite|sac|piece|unite|savon|riz|huile|fanta|coca|lait|sucre|sel|iphone|samsung)/i.test(normalized);
  
  return hasQuantity && normalized.length > 10;
}
