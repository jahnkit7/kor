import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    
    if (!transcript) {
      throw new Error('No transcript provided');
    }

    console.log('Analyzing product request transcript:', transcript);

    const response = await fetch('https://ai.lovable.dev/api/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant qui analyse les demandes de produits vocales en français pour un réseau de marchands africains.

Extrais les informations suivantes de la transcription:
- product_name: le nom du produit recherché (obligatoire)
- quantity: la quantité demandée (nombre entier, optionnel)
- unit: l'unité (pièces, kg, cartons, sacs, lots, palettes - optionnel)
- max_price: le budget maximum en FCFA (nombre entier, optionnel)
- notes: détails supplémentaires ou précisions (optionnel)

Réponds UNIQUEMENT en JSON valide, sans markdown, avec cette structure:
{
  "product_name": "string",
  "quantity": number | null,
  "unit": "string" | null,
  "max_price": number | null,
  "notes": "string" | null
}

Exemples:
- "Je cherche 50 cartons d'huile à moins de 200000" → {"product_name": "Huile", "quantity": 50, "unit": "cartons", "max_price": 200000, "notes": null}
- "J'ai besoin de ciment, environ 10 sacs" → {"product_name": "Ciment", "quantity": 10, "unit": "sacs", "max_price": null, "notes": null}
- "Qui a du riz parfumé de bonne qualité ?" → {"product_name": "Riz parfumé", "quantity": null, "unit": null, "max_price": null, "notes": "De bonne qualité"}`
          },
          {
            role: 'user',
            content: transcript
          }
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('AI response:', content);

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response');
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-request-voice:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
