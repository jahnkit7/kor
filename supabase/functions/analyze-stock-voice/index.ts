import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    
    if (!transcript || typeof transcript !== "string") {
      return new Response(
        JSON.stringify({ error: "Transcript is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'analyse IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                        content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      parsed = { items: [], suggestions: ["L'analyse n'a pas pu extraire les produits. Réessayez avec une dictée plus claire."] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-stock-voice:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
