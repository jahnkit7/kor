import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("analyze-stock-voice: Request received", req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("analyze-stock-voice: Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentification requise. Veuillez vous reconnecter." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      console.error("analyze-stock-voice: Empty token");
      return new Response(
        JSON.stringify({ error: "Token d'authentification manquant." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("analyze-stock-voice: Missing Supabase config");
      return new Response(
        JSON.stringify({ error: "Configuration serveur incomplète (Supabase)." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Use getClaims instead of getUser for better compatibility with signing-keys
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);

    if (authError || !claimsData?.claims) {
      console.error("analyze-stock-voice: Auth error:", authError?.message || "No claims");
      return new Response(
        JSON.stringify({ error: "Token expiré ou invalide. Veuillez vous reconnecter." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    if (!userId) {
      console.error("analyze-stock-voice: No user ID in claims");
      return new Response(
        JSON.stringify({ error: "Utilisateur non trouvé. Veuillez vous reconnecter." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("analyze-stock-voice: User authenticated:", userId);

    const body = await req.json();
    const { transcript } = body;
    
    console.log("analyze-stock-voice: Transcript received, length:", transcript?.length || 0);
    
    if (!transcript || typeof transcript !== "string") {
      console.error("analyze-stock-voice: Invalid transcript");
      return new Response(
        JSON.stringify({ error: "Transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("analyze-stock-voice: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuration serveur manquante (LOVABLE_API_KEY)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("analyze-stock-voice: Calling AI gateway...");

    const systemPrompt = `Tu es un assistant spécialisé dans l'analyse de dictées vocales pour la gestion de stock de boutiques africaines.

L'utilisateur va te donner une transcription vocale brute où il décrit son stock. Ton travail est d'extraire les produits mentionnés avec leurs informations.

RÈGLES IMPORTANTES:
1. Extrais chaque produit mentionné avec: nom, quantité, prix unitaire (si mentionné), modèle/variante (si mentionné)
2. Si la quantité n'est pas claire, mets 1 par défaut
3. Si le prix n'est pas mentionné, mets 0
4. Adapte-toi au français africain et aux expressions locales
5. "Carton de", "caisse de", "pack de" = extraire la quantité totale
6. Les prix peuvent être en CFA, FCFA, francs - normalise tout en nombre entier

EXEMPLES:
- "J'ai 50 savons Lux à 500 francs" → nom: "Savon Lux", quantité: 50, prix: 500
- "3 cartons de Fanta, le carton à 6000" → nom: "Fanta (carton)", quantité: 3, prix: 6000
- "Riz 25kg, j'en ai 10 sacs" → nom: "Riz 25kg", quantité: 10, prix: 0
- "Haricots 10 sachets de 1 kg à 1500" → nom: "Haricots 1kg", quantité: 10, prix: 1500

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "items": [
    {
      "name": "string",
      "quantity": number,
      "unit_price": number,
      "model": "string ou null"
    }
  ],
  "suggestions": ["string"] // suggestions si quelque chose n'était pas clair
}`;

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

    console.log("analyze-stock-voice: AI response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("analyze-stock-voice: AI gateway error:", response.status, errorText);
      
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
    
    console.log("analyze-stock-voice: AI content received, length:", content?.length || 0);

    if (!content) {
      console.error("analyze-stock-voice: No content in AI response");
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
      console.log("analyze-stock-voice: Parsed items count:", parsed.items?.length || 0);
    } catch (parseError) {
      console.error("analyze-stock-voice: Failed to parse AI response:", content);
      parsed = { 
        items: [], 
        suggestions: ["L'analyse n'a pas pu extraire les produits. Réessayez avec une dictée plus claire."] 
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("analyze-stock-voice: Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
