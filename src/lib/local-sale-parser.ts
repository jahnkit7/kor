/**
 * Local parser for sale transcription - works offline as a fallback
 * when AI analysis is unavailable.
 * 
 * Parses natural language like:
 * - "J'ai vendu 5 chargeurs à 1500 à Kofi"
 * - "Mamadou a pris 3 écrans à 5000, il a payé cash"
 * - "Crédit de 25000 pour Awa, elle a payé 5000"
 */

import { PRODUCT_DICTIONARY, findProductInDictionary } from "./local-stock-parser";

export interface ParsedLocalSale {
  type: "cash" | "credit";
  amount: number;
  paid: number;
  remaining: number;
  client_name: string | null;
  products: Array<{ name: string; quantity: number; unit_price: number }>;
  note: string | null;
  confidence: "high" | "medium" | "low";
}

export interface LocalSaleParseResult {
  sales: ParsedLocalSale[];
  unparsedText: string[];
  suggestions: string[];
}

export interface TranscriptionCorrection {
  original: string;
  corrected: string;
  type: "client_name" | "product_name" | "general";
}

// Common African names for client detection
const COMMON_NAMES = [
  // West African names
  "kofi", "ama", "kwame", "akua", "yaw", "abena", "kojo", "afi",
  "mamadou", "fatou", "amadou", "aissatou", "ibrahima", "mariama", "ousmane", "awa",
  "sekou", "kadiatou", "moussa", "binta", "saliou", "aminata", "boubacar", "rama",
  "adama", "fatoumata", "modou", "diarra", "cheikh", "ndeye", "ali", "rokhaya",
  // Central African
  "jean", "marie", "pierre", "paul", "emmanuel", "grace", "david", "esther",
  // Generic
  "monsieur", "madame", "client", "cliente", "patron", "patronne",
  // More common names
  "abdou", "samba", "khadija", "aicha", "fanta", "lamine", "djibril", "moustapha",
  "papa", "maman", "tonton", "tata", "frere", "soeur",
];

// Known product keywords that should never be client names
const PRODUCT_KEYWORDS = [
  "chargeur", "chargeurs", "ecran", "écran", "ecrans", "écrans",
  "batterie", "batteries", "cable", "câble", "cables", "câbles",
  "telephone", "téléphone", "telephones", "téléphones", "phone", "phones",
  "coque", "coques", "etui", "étui", "protection", "protections",
  "samsung", "iphone", "huawei", "xiaomi", "oppo", "tecno", "infinix", "itel",
  "airpod", "airpods", "ecouteur", "écouteur", "ecouteurs", "écouteurs",
  "montre", "montres", "watch", "smartwatch",
  "tablette", "tablettes", "ipad", "tab",
  "power", "bank", "powerbank",
  "accessoire", "accessoires", "piece", "pièce", "pieces", "pièces",
  "carte", "cartes", "memoire", "mémoire", "sd", "sim",
  "verre", "verres", "trempe", "trempé",
  "haut", "parleur", "speaker", "enceinte",
  "clavier", "souris", "mouse", "keyboard",
];

// Store for stock items (injected externally)
let knownStockItems: string[] = [];

// Store for learned corrections (injected externally)
let learnedCorrections: TranscriptionCorrection[] = [];

/**
 * Set the known stock items from the database
 */
export function setKnownStockItems(items: string[]) {
  knownStockItems = items.map(i => normalizeText(i));
}

/**
 * Set the learned corrections from the database
 */
export function setLearnedCorrections(corrections: TranscriptionCorrection[]) {
  learnedCorrections = corrections;
}

/**
 * Apply learned corrections to text before parsing
 */
function applyCorrections(text: string): string {
  let correctedText = text;
  
  for (const correction of learnedCorrections) {
    // Case-insensitive replacement
    const regex = new RegExp(escapeRegex(correction.original), "gi");
    correctedText = correctedText.replace(regex, correction.corrected);
  }
  
  return correctedText;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Normalize text for parsing
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a word is a known product (from stock or dictionary)
 */
function isKnownProduct(word: string): boolean {
  const normalized = normalizeText(word);
  
  // Check against product keywords
  if (PRODUCT_KEYWORDS.some(kw => normalized.includes(kw) || kw.includes(normalized))) {
    return true;
  }
  
  // Check against known stock items
  if (knownStockItems.some(item => item.includes(normalized) || normalized.includes(item))) {
    return true;
  }
  
  // Check against product dictionary
  if (findProductInDictionary(word)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a word is a known client name (from corrections or common names)
 */
function isKnownClientName(word: string): boolean {
  const normalized = normalizeText(word);
  
  // Check learned corrections for client names
  const clientCorrections = learnedCorrections.filter(c => c.type === "client_name");
  for (const correction of clientCorrections) {
    const correctedNorm = normalizeText(correction.corrected);
    if (correctedNorm === normalized || correctedNorm.includes(normalized)) {
      return true;
    }
  }
  
  // Check common names
  if (COMMON_NAMES.includes(normalized)) {
    return true;
  }
  
  return false;
}

// Extract client name from text
function extractClientName(text: string): string | null {
  const normalized = normalizeText(text);
  
  // Pattern: "à [name]", "pour [name]", "[name] a pris/acheté"
  const patterns = [
    /(?:a|à|pour|chez)\s+([a-zéèêëàâäùûüïîôö]+)/i,
    /([a-zéèêëàâäùûüïîôö]+)\s+(?:a pris|a achete|a acheté|veut|prend)/i,
    /(?:vente|vendu)\s+(?:a|à)\s+([a-zéèêëàâäùûüïîôö]+)/i,
    /client\s*:?\s*([a-zéèêëàâäùûüïîôö]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].toLowerCase();
      const normalizedName = normalizeText(name);
      
      // IMPORTANT: Skip if this is a product name, not a client
      if (isKnownProduct(name)) {
        continue;
      }
      
      // Check if it's a known client name or a common name
      if (isKnownClientName(name) || COMMON_NAMES.includes(normalizedName)) {
        // Capitalize first letter
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
      
      // Check if it starts with uppercase in original (likely a name)
      const originalWord = text.match(new RegExp(`\\b(${match[1]})\\b`, 'i'));
      if (originalWord && originalWord[1][0] === originalWord[1][0].toUpperCase()) {
        // Only if not a product
        if (!isKnownProduct(match[1])) {
          return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        }
      }
    }
  }
  
  // Look for any known name in the text that's not a product
  for (const name of COMMON_NAMES) {
    if (normalized.includes(name) && !isKnownProduct(name)) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  
  // Check learned client name corrections
  for (const correction of learnedCorrections.filter(c => c.type === "client_name")) {
    const correctedNorm = normalizeText(correction.corrected);
    if (normalized.includes(correctedNorm)) {
      return correction.corrected.charAt(0).toUpperCase() + correction.corrected.slice(1).toLowerCase();
    }
  }
  
  return null;
}

// Determine if sale is cash or credit
function determineSaleType(text: string): "cash" | "credit" {
  const normalized = normalizeText(text);
  
  // Credit indicators
  const creditIndicators = [
    "credit", "crédit", "a credit", "à crédit",
    "reste", "doit", "devra", "pas tout payé", "pas paye tout",
    "n'a pas payé", "n'a pas paye", "pas payé", "pas paye",
    "partiel", "acompte", "avance"
  ];
  
  for (const indicator of creditIndicators) {
    if (normalized.includes(indicator)) {
      return "credit";
    }
  }
  
  // Check if there's a difference between amount and paid
  const amountMatch = normalized.match(/(\d+)\s*(?:francs?|fcfa|cfa|f\b)/);
  const paidMatch = normalized.match(/(?:paye|payé)\s*(\d+)/);
  
  if (amountMatch && paidMatch) {
    const amount = parseInt(amountMatch[1]);
    const paid = parseInt(paidMatch[1]);
    if (paid < amount) {
      return "credit";
    }
  }
  
  // Cash indicators
  const cashIndicators = [
    "cash", "comptant", "au comptant", "paye tout", "payé tout",
    "regle", "réglé", "solde", "soldé"
  ];
  
  for (const indicator of cashIndicators) {
    if (normalized.includes(indicator)) {
      return "cash";
    }
  }
  
  // Default to cash for most sales
  return "cash";
}

// Extract total amount
function extractAmount(text: string): number {
  const normalized = normalizeText(text);
  
  // Pattern: "[amount] francs/CFA"
  const patterns = [
    /(\d+(?:\s?\d+)*)\s*(?:francs?|fcfa|cfa|f\b)/gi,
    /(?:total|montant|vente)\s*(?:de\s+)?(\d+)/gi,
    /(\d+(?:\s?\d+)*)/g
  ];
  
  let amounts: number[] = [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numStr = match[1].replace(/\s/g, "");
      const num = parseInt(numStr);
      if (num >= 100 && num <= 10000000) { // Reasonable sale amount range
        amounts.push(num);
      }
    }
  }
  
  // Return the largest amount (usually the total)
  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

// Extract paid amount
function extractPaidAmount(text: string, totalAmount: number): number {
  const normalized = normalizeText(text);
  
  // Pattern: "payé [amount]", "a donné [amount]"
  const patterns = [
    /(?:paye|payé|donne|donné|verse|versé)\s*(\d+)/i,
    /(\d+)\s*(?:paye|payé|donne|donné)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const paid = parseInt(match[1]);
      if (paid <= totalAmount) {
        return paid;
      }
    }
  }
  
  // If no explicit paid amount and sale type is cash, paid = total
  const saleType = determineSaleType(text);
  if (saleType === "cash") {
    return totalAmount;
  }
  
  return 0;
}

// Extract products from text
function extractProducts(text: string): Array<{ name: string; quantity: number; unit_price: number }> {
  const products: Array<{ name: string; quantity: number; unit_price: number }> = [];
  const normalized = normalizeText(text);
  
  // Pattern: "[qty] [product] à [price]"
  const productPatterns = [
    /(\d+)\s+([a-zéèêëàâäùûüïîôö\s]+?)\s*(?:a|à)\s*(\d+)/gi,
    /(\d+)\s+([a-zéèêëàâäùûüïîôö]+)/gi,
  ];
  
  // Try to match products
  for (const pattern of productPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const quantity = parseInt(match[1]);
      let productName = match[2].trim();
      let unitPrice = match[3] ? parseInt(match[3]) : 0;
      
      // Clean product name
      productName = productName.replace(/\s+/g, " ").trim();
      
      // Skip if product name is too short or is a number
      if (productName.length < 2 || /^\d+$/.test(productName)) continue;
      
      // Skip common non-product words
      const skipWords = ["a", "à", "de", "du", "la", "le", "les", "un", "une", "des", "et"];
      if (skipWords.includes(productName.toLowerCase())) continue;
      
      // IMPORTANT: Skip if this is a client name, not a product
      if (isKnownClientName(productName) && !isKnownProduct(productName)) {
        continue;
      }
      
      // Check dictionary for better name
      const dictProduct = findProductInDictionary(productName);
      if (dictProduct) {
        productName = dictProduct.name;
        // Use typical price if none found
        if (unitPrice === 0 && dictProduct.typical_prices) {
          unitPrice = dictProduct.typical_prices[0];
        }
      } else {
        // Check if it matches a known stock item (use original casing)
        const stockMatch = knownStockItems.find(item => 
          item.includes(normalizeText(productName)) || normalizeText(productName).includes(item)
        );
        if (!stockMatch) {
          // Capitalize first letter
          productName = productName.charAt(0).toUpperCase() + productName.slice(1);
        }
      }
      
      // Only add if we haven't already added a similar product
      const existing = products.find(p => 
        normalizeText(p.name) === normalizeText(productName)
      );
      
      if (!existing && quantity > 0 && quantity <= 10000) {
        products.push({
          name: productName,
          quantity,
          unit_price: unitPrice,
        });
      }
    }
  }
  
  return products;
}

// Parse a single sale segment
function parseSaleSegment(segment: string): ParsedLocalSale | null {
  const trimmed = segment.trim();
  if (trimmed.length < 5) return null;
  
  // Apply learned corrections before parsing
  const correctedSegment = applyCorrections(trimmed);
  
  const amount = extractAmount(correctedSegment);
  if (amount === 0) return null;
  
  const saleType = determineSaleType(correctedSegment);
  const paid = extractPaidAmount(correctedSegment, amount);
  const remaining = saleType === "credit" ? Math.max(0, amount - paid) : 0;
  const clientName = extractClientName(correctedSegment);
  const products = extractProducts(correctedSegment);
  
  // Determine confidence
  let confidence: "high" | "medium" | "low" = "low";
  if (amount > 0 && (products.length > 0 || clientName)) {
    confidence = "medium";
  }
  if (amount > 0 && products.length > 0 && products.every(p => p.unit_price > 0)) {
    confidence = "high";
  }
  
  return {
    type: saleType,
    amount,
    paid: saleType === "cash" ? amount : paid,
    remaining,
    client_name: clientName,
    products,
    note: null,
    confidence,
  };
}

// Split transcript by sale separators
function splitBySeparators(transcript: string): string[] {
  const separators = [
    "suivant", "suivante", "ensuite", "puis", "aussi",
    "et après", "après ça", "deuxieme vente", "deuxième vente",
    "autre vente", "nouvelle vente",
  ];
  
  let text = transcript;
  
  // Replace separators with delimiter
  for (const sep of separators) {
    text = text.replace(new RegExp(`\\b${sep}\\b`, "gi"), "|||SPLIT|||");
  }
  
  // Also split by periods and semicolons
  text = text.replace(/[;.]/g, "|||SPLIT|||");
  
  return text
    .split("|||SPLIT|||")
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

/**
 * Parse a raw sale transcript locally without AI
 */
export function parseSalesLocally(transcript: string): LocalSaleParseResult {
  const sales: ParsedLocalSale[] = [];
  const unparsedText: string[] = [];
  const suggestions: string[] = [];
  
  // Apply corrections to entire transcript first
  const correctedTranscript = applyCorrections(transcript);
  
  const segments = splitBySeparators(correctedTranscript);
  
  for (const segment of segments) {
    const parsed = parseSaleSegment(segment);
    if (parsed) {
      sales.push(parsed);
    } else if (segment.length > 10) {
      unparsedText.push(segment);
    }
  }
  
  // Generate suggestions
  if (sales.length === 0) {
    suggestions.push("Aucune vente détectée. Essayez: 'J'ai vendu 5 chargeurs à 1500 à Kofi'");
  } else {
    const lowConfidence = sales.filter(s => s.confidence === "low");
    const noProducts = sales.filter(s => s.products.length === 0);
    
    if (lowConfidence.length > 0) {
      suggestions.push("Certaines ventes manquent de détails. Vérifiez les montants et produits.");
    }
    if (noProducts.length > 0) {
      suggestions.push(`${noProducts.length} vente(s) sans produits détaillés.`);
    }
  }
  
  return { sales, unparsedText, suggestions };
}

/**
 * Check if local parsing can work for sales
 */
export function canParseSalesLocally(transcript: string): boolean {
  const normalized = normalizeText(transcript);
  
  // Must have amount indicators
  const hasAmount = /\d+/.test(normalized);
  
  // Should have sale-related words
  const saleWords = ["vendu", "vente", "pris", "acheté", "achete", "payé", "paye", "cash", "credit", "crédit"];
  const hasSaleWord = saleWords.some(word => normalized.includes(word));
  
  return hasAmount && (hasSaleWord || normalized.length > 20);
}
