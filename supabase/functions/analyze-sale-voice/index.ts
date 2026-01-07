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
    const { transcript, clients } = body;
    
    console.log("analyze-sale-voice: Transcript received, length:", transcript?.length || 0);
    console.log("analyze-sale-voice: Clients provided:", clients?.length || 0);
    
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

    // Build client list for the AI prompt
    const clientsList = clients && clients.length > 0 
      ? clients.map((c: { name: string; id: string }) => `- "${c.name}" (ID: ${c.id})`).join("\n")
      : "Aucun client enregistré";

    console.log("analyze-sale-voice: Calling AI gateway...");

    const systemPrompt = `Tu es un assistant spécialisé dans l'analyse de dictées vocales pour les ventes de boutiques africaines.

L'utilisateur va te donner une transcription vocale brute où il décrit une vente. Ton travail est d'extraire les informations de la vente.

LISTE DES CLIENTS CONNUS:
${clientsList}

RÈGLES IMPORTANTES:
1. Extrais les informations de vente: produit(s), quantité, prix unitaire, prix total, client, montant payé, montant restant
2. Détermine si c'est une vente CASH (paiement complet) ou CRÉDIT (paiement partiel ou pas de paiement)
3. Si un nom de client est mentionné, cherche la correspondance dans la liste des clients connus
4. Si le client n'existe pas dans la liste, indique "client_name" avec le nom mentionné
5. Calcule automatiquement le montant restant si paiement partiel
6. Les prix peuvent être en CFA, FCFA, francs - normalise tout en nombre entier
7. Adapte-toi au français africain et aux expressions locales

EXEMPLES:
- "J'ai vendu 5 chargeurs à 1500 à Kofi, il a payé cash" → type: "cash", amount: 7500, client: Kofi
- "Mamadou a pris 3 écrans à 5000, il a payé 10000, il reste 5000" → type: "credit", amount: 15000, paid: 10000, remaining: 5000
- "Vendu 10 sachets de riz à 500" → type: "cash", amount: 5000 (pas de client = vente anonyme cash)
- "Crédit de 25000 pour Fatou, elle a payé 5000" → type: "credit", amount: 25000, paid: 5000, remaining: 20000

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "sale": {
    "type": "cash" ou "credit",
    "amount": number (montant total de la vente),
    "paid": number (montant payé, = amount si cash),
    "remaining": number (montant restant, = 0 si cash),
    "client_id": "string ou null" (ID du client si trouvé dans la liste),
    "client_name": "string ou null" (nom du client si mentionné mais pas trouvé),
    "products": [
      {
        "name": "string",
        "quantity": number,
        "unit_price": number
      }
    ],
    "note": "string ou null" (note optionnelle sur la vente)
  },
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
      console.log("analyze-sale-voice: Parsed sale:", JSON.stringify(parsed.sale).substring(0, 100));
    } catch (parseError) {
      console.error("analyze-sale-voice: Failed to parse AI response:", content);
      parsed = { 
        sale: null, 
        suggestions: ["L'analyse n'a pas pu extraire la vente. Réessayez avec une dictée plus claire."] 
      };
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
