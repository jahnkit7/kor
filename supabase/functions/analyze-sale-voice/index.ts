import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("analyze-sale-voice: Request received", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("analyze-sale-voice: Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentification requise. Veuillez vous reconnecter." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      console.error("analyze-sale-voice: Empty token");
      return new Response(
        JSON.stringify({ error: "Token d'authentification manquant." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("analyze-sale-voice: Missing Supabase config");
      return new Response(
        JSON.stringify({ error: "Configuration serveur incomplète (Supabase)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.error("analyze-sale-voice: Auth error:", authError.message, authError.status);
      
      if (authError.message?.includes("expired") || authError.message?.includes("invalid")) {
        return new Response(
          JSON.stringify({ error: "Token expiré ou invalide. Veuillez vous reconnecter." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erreur d'authentification: ${authError.message}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!user) {
      console.error("analyze-sale-voice: No user found for token");
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé. Veuillez vous reconnecter." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("analyze-sale-voice: User authenticated:", user.id);

    const body = await req.json();
    const { transcript, clients, stockItems } = body;
    
    console.log("analyze-sale-voice: Transcript received, length:", transcript?.length || 0);
    console.log("analyze-sale-voice: Clients provided:", clients?.length || 0);
    console.log("analyze-sale-voice: Stock items provided:", stockItems?.length || 0);
    
    if (!transcript || typeof transcript !== "string") {
      console.error("analyze-sale-voice: Invalid transcript");
      return new Response(
        JSON.stringify({ error: "Transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("analyze-sale-voice: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante (LOVABLE_API_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build client list for the AI prompt with more details for disambiguation
    const clientsList = clients && clients.length > 0 
      ? clients.map((c: { name: string; id: string; phone?: string }) => 
          `- "${c.name}" (ID: ${c.id}${c.phone ? `, Tél: ${c.phone}` : ""})`
        ).join("\n")
      : "Aucun client enregistré";

    // Build stock list for AI matching
    const stockList = stockItems && stockItems.length > 0
      ? stockItems.map((s: { id: string; name: string; quantity: number; unit_price: number; model?: string }) => 
          `- "${s.name}"${s.model ? ` (${s.model})` : ""} | ID: ${s.id} | Qté: ${s.quantity} | Prix: ${s.unit_price} FCFA`
        ).join("\n")
      : "Aucun produit en stock";

    console.log("analyze-sale-voice: Calling AI gateway...");

    const systemPrompt = `Tu es un assistant spécialisé dans l'analyse de dictées vocales pour les ventes de boutiques africaines.

L'utilisateur va te donner une transcription vocale brute où il décrit UNE OU PLUSIEURS ventes. Ton travail est d'extraire TOUTES les ventes mentionnées.

LISTE DES CLIENTS CONNUS:
${clientsList}

LISTE DES PRODUITS EN STOCK:
${stockList}

RÈGLES IMPORTANTES:
1. Extrais TOUTES les ventes mentionnées dans la dictée (il peut y en avoir plusieurs)
2. Pour chaque vente, extrais: produit(s), quantité, prix unitaire, prix total, client, montant payé, montant restant
3. Détermine si c'est une vente CASH (paiement complet) ou CRÉDIT (paiement partiel ou pas de paiement)
4. Pour CHAQUE client mentionné, détermine son statut:
   - "found": le nom correspond exactement à UN client dans la liste (utilise son ID)
   - "ambiguous": le nom correspond à PLUSIEURS clients dans la liste (liste les candidats)
   - "not_found": le nom ne correspond à aucun client dans la liste
5. Pour CHAQUE produit mentionné, essaie de le matcher avec un produit en stock:
   - Si le nom du produit correspond (même approximativement) à un produit en stock, retourne son stock_item_id
   - Si le produit n'est pas trouvé dans le stock, laisse stock_item_id à null
   - Utilise le prix du stock si le prix n'est pas mentionné dans la dictée
6. Calcule automatiquement le montant restant si paiement partiel
7. Les prix peuvent être en CFA, FCFA, francs - normalise tout en nombre entier
8. Adapte-toi au français africain et aux expressions locales
9. "rendu" peut signifier "vendu" (erreur de transcription courante)

EXEMPLES:
- "J'ai vendu 5 chargeurs à 1500 à Kofi, il a payé cash" → 1 vente cash de 7500 pour Kofi, matcher "chargeurs" avec le stock
- "Mamadou a pris 3 écrans à 5000, il a payé 10000, et Fatou a pris 2 batteries à 2000" → 2 ventes séparées
- "Jacob m'a pris des produits" (et il y a 3 Jacob dans la liste) → status: "ambiguous" avec les 3 candidats
- "Awa a pris 3 sachets à 500" (et Awa n'est pas dans la liste) → status: "not_found"

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "sales": [
    {
      "type": "cash" ou "credit",
      "amount": number,
      "paid": number,
      "remaining": number,
      "client_match": {
        "status": "found" | "not_found" | "ambiguous",
        "client_id": "string ou null",
        "client_name": "string",
        "candidates": [
          {"id": "string", "name": "string", "phone": "string ou null"}
        ]
      },
      "products": [{"name": "string", "quantity": number, "unit_price": number, "stock_item_id": "string ou null"}],
      "note": "string ou null"
    }
  ],
  "suggestions": ["string"]
}

Si une seule vente est détectée, retourne quand même un tableau avec un seul élément.
Si aucune vente n'est détectée, retourne un tableau vide avec une suggestion explicative.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transcription vocale: "${transcript}"` },
        ],
        temperature: 0.3,
      }),
    });

    console.log("analyze-sale-voice: AI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("analyze-sale-voice: AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Erreur d'authentification API" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erreur IA (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("analyze-sale-voice: AI content received, length:", content?.length || 0);

    if (!content) {
      console.error("analyze-sale-voice: No content in AI response");
      return new Response(
        JSON.stringify({ error: "Pas de réponse de l'IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
      console.log("analyze-sale-voice: Parsed sales count:", parsed.sales?.length || 0);
    } catch (parseError) {
      console.error("analyze-sale-voice: Failed to parse AI response:", content);
      parsed = { 
        sales: [], 
        suggestions: ["L'analyse n'a pas pu extraire la vente. Réessayez avec une dictée plus claire."] 
      };
    }

    // Ensure sales is always an array
    if (!Array.isArray(parsed.sales)) {
      // Handle legacy single sale format for backward compatibility
      if (parsed.sale) {
        const legacySale = parsed.sale;
        parsed.sales = [{
          ...legacySale,
          client_match: {
            status: legacySale.client_id ? "found" : (legacySale.client_name ? "not_found" : "found"),
            client_id: legacySale.client_id,
            client_name: legacySale.client_name || null,
            candidates: []
          }
        }];
        delete parsed.sale;
      } else {
        parsed.sales = [];
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("analyze-sale-voice: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
