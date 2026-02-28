import { supabase } from "./supabase";
import { SearchFilters, ChatMessage, Restaurant } from "./types";
import { fetchPlacesByQuery } from "./api/places";
import { cachePlaces } from "./api/placesCache";

// Cascade of models to try — each has independent free-tier quota
const FALLBACK_MODELS = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
];

async function callGeminiDirect(prompt: string, temperature = 0.7): Promise<string | null> {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return null;

    for (const model of FALLBACK_MODELS) {
        try {
            console.log(`Trying direct Gemini model: ${model}...`);
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature }
                    })
                }
            );
            if (response.status === 429) {
                console.warn(`Model ${model} rate-limited (429), trying next...`);
                continue;
            }
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && !text.includes('RESOURCE_EXHAUSTED') && !text.includes('Quota exceeded')) {
                console.log(`Success with model: ${model}`);
                return text;
            }
            console.warn(`Model ${model} returned no valid text, trying next...`);
        } catch (err) {
            console.warn(`Model ${model} fetch failed:`, err);
        }
    }
    return null;
}


export async function interpretSearchQuery(query: string): Promise<SearchFilters | null> {
    if (!query.trim()) return null;

    try {
        const prompt = `You are a search assistant for a restaurant discovery app called DEGUSTE in Brazil.
Interpret the user's natural language query and extract ALL relevant search filters with precision.

AVAILABLE CATEGORIES: "Bar", "Brasileira", "Cafeteria", "Fast Food", "Hamburgueria", "Japonesa", "Lanchonete", "Padaria", "Pizzaria", "Restaurante", "Sorveteria", "Churrascaria", "Contemporânea", "Vegana", "Café", "Doceria"
AVAILABLE ATTRIBUTES: "pet_friendly", "kids_area", "live_music", "wifi", "parking", "vegan_options", "vegetarian_options", "outdoor_seating", "delivery", "reservation_available", "wheelchair_accessible"

CATEGORY MAPPING (interpret user intent):
- "sushi", "asiática", "japa", "temaki", "sashimi", "ramen" → "Japonesa"
- "pizza", "massa", "lasanha", "macarrão" → "Pizzaria"
- "hambúrguer", "burger", "lanche", "smash" → "Hamburgueria"
- "café", "cafeteria", "brunch", "cappuccino" → "Cafeteria"
- "churrasco", "churrascaria", "picanha", "costela" → "Churrascaria"
- "carne", "brasileira", "feijoada", "comida caseira" → "Brasileira"
- "sorvete", "açaí", "gelato", "frozen" → "Sorveteria"
- "pão", "padaria", "pão de queijo" → "Padaria"
- "bar", "happy hour", "cerveja", "drink", "chopp", "petisco" → "Bar"
- "fast food", "mcdonalds", "mcdonald", "burguer king" → "Fast Food"
- "doce", "bolo", "torta", "confeitaria" → "Doceria"
- "vegano", "vegana", "plant-based" → "Vegana" + attribute vegan_options
- "vegetariano", "sem carne" → attribute vegetarian_options
- "saudável", "fit", "light" → attributes vegan_options + vegetarian_options

PRICE INTENT MAPPING:
- "barato", "econômico", "em conta", "bom e barato", "custo-benefício", "preço bom", "acessível" → price_level: 1
- "moderado", "preço médio", "justo" → price_level: 2
- "fino", "sofisticado", "requintado", "chique", "gourmet" → price_level: 3
- "caro", "luxo", "premium", "ostentação" → price_level: 4

DISTANCE INTENT MAPPING:
- "perto", "perto de mim", "próximo", "aqui perto", "pertinho" → max_distance_km: 5
- "na região", "pela região", "redondeza" → max_distance_km: 15
- "longe", "vale a pena ir" → max_distance_km: 50

TIMING INTENT MAPPING:
- "aberto", "aberto agora", "funcionando", "que esteja aberto" → open_now: true

SORTING INTENT MAPPING:
- "melhor", "melhor avaliado", "top", "mais bem avaliado" → sort_by: "rating"
- "mais perto", "mais próximo" → sort_by: "distance"
- "mais barato", "menor preço" → sort_by: "price"
- "mais famoso", "mais popular", "mais conhecido" → sort_by: "popularity"

SPECIAL FILTERS:
- "pérola", "escondido", "secreto", "achado", "jóia" → is_perola: true (hidden gems with high ratings)
- "promoção", "desconto", "oferta", "cupom" → has_promotions: true

VIBE/TAGS (for ambiance):
- "romântico", "a dois", "date", "encontro" → vibes: ["romântico"]
- "família", "crianças", "kids" → vibes: ["familiar"] + attribute kids_area
- "animado", "agitado", "balada" → vibes: ["animado"]
- "tranquilo", "calmo", "silencioso", "sossegado" → vibes: ["tranquilo"]
- "bonito", "instagramável", "vista", "visual" → vibes: ["instagramável"]
- "ao ar livre", "área externa", "terraço", "varanda" → attribute outdoor_seating

BRAZILIAN STATES (abbreviations):
- "SP", "São Paulo" → state: "SP"  
- "RJ", "Rio de Janeiro" → state: "RJ"
- "MG", "Minas Gerais" → state: "MG"

Return a JSON object with this structure (ALL fields optional, include ONLY fields that apply):
{
  "query": string,           // Specific restaurant name or dish keyword. Do NOT put generic category words here.
  "city": string,            // City if mentioned
  "state": string,           // State abbreviation if mentioned (SP, RJ, MG)
  "categories": string[],    // Matched categories from the list above
  "attributes": object,      // Attribute key-value pairs set to true
  "price_level": number,     // 1=cheap, 2=moderate, 3=expensive, 4=luxury
  "open_now": boolean,       // true if user wants open places
  "max_distance_km": number, // Distance filter in km
  "sort_by": string,         // "rating", "distance", "price", "popularity"
  "is_perola": boolean,      // Hidden gem filter
  "has_promotions": boolean, // Promotions filter
  "vibes": string[]          // Ambiance tags
}

RULES:
1. Extract ALL possible filters from the query. Be thorough.
2. If a query mentions a specific restaurant name (e.g., "Autentico", "Outback"), put it in "query".
3. If a query is purely categorical (e.g., "sushi barato"), do NOT fill "query" — use categories + price_level.
4. Multiple filters can coexist: "sushi barato perto de mim aberto agora" → categories + price_level + max_distance_km + open_now.

User query: "${query}"

Respond ONLY with valid JSON. No markdown, no explanation.`;

        let resultText = '';

        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { prompt },
        });

        const isQuotaError = error || (data?.text?.includes('RESOURCE_EXHAUSTED') || data?.text?.includes('Quota exceeded'));

        if (isQuotaError) {
            console.warn("Gemini proxy quota exceeded, attempting direct model cascade...");
            resultText = await callGeminiDirect(prompt, 0.1) || '';
        } else if (data?.text) {
            resultText = data.text;
        }

        if (resultText) {
            const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            const filters = JSON.parse(cleanedText) as SearchFilters;
            console.log("🧠 AI interpreted filters:", filters);
            return filters;
        }
    } catch (error) {
        console.error("Gemini AI search failed:", error);
    }

    return null;
}

export async function chatWithAssistant(messages: ChatMessage[]): Promise<{ text: string; suggestedRestaurants?: Restaurant[] }> {
    try {
        // Fetch abbreviated restaurant data to give context to Gemini (local Supabase data)
        const { data: restaurants } = await supabase.from('restaurants').select('id, name, city, categories, attributes, description');

        const dbContext = restaurants
            ? restaurants.map(r => `[Origem: Supabase DB, ID: ${r.id}] ${r.name} - Categorias: ${r.categories.join(', ')} - Cidade: ${r.city} - Atributos: ${JSON.stringify(r.attributes)} - Descrição curta: ${r.description}`).join('\n')
            : "Nenhum restaurante encontrado no banco interno.";

        // --- NEW GOOGLE PLACES INTEGRATION ---
        const userLastMessage = messages[messages.length - 1]?.content || "";
        let mapsContext = "Nenhum local encontrado no Google Maps para esta busca recente.";
        let mappedPlaces: Restaurant[] = [];

        if (userLastMessage && userLastMessage.length > 2) {
            mappedPlaces = await fetchPlacesByQuery(userLastMessage);
            if (mappedPlaces.length > 0) {
                cachePlaces(mappedPlaces);
                mapsContext = mappedPlaces.map(r =>
                    `[Origem: Google Maps, ID: ${r.id}] ${r.name} - Endereço: ${r.address} - Categoria (Google): ${r.categories.join(', ')} - Preço (1 a 4): ${r.price_level} - Avaliação: ${r.rating_avg} estrelas`
                ).join('\n');
            }
        }
        // --- END GOOGLE PLACES INTEGRATION ---

        const conversationHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

        const prompt = `Você é o Concierge Oficial do DEGUSTE, um amigo local bem-humorado, nativo da região, especialista em gastronomia e super descolado, recomendando os melhores lugares num raio de 50km.
Você não é um chatbot corporativo ou robótico; aja como um humano de verdade batendo papo via WhatsApp!

Temos duas fontes de dados disponíveis:
[FONTE 1: Banco de Dados Interno (Supabase)]
${dbContext}

[FONTE 2: Busca Dinâmica pelo Google Maps (Locais próximos)]
${mapsContext}

INSTRUÇÕES RIGOROSAS:
1. SEJA EXTREMAMENTE BREVE, ENVOLVENTE E HUMANO.
2. Evite formalidades, textos muito longos, respostas em tópicos excessivos ou descrições enciclopédicas.
3. Se o usuário quiser saber onde comer, escolha o local perfeito baseado no contexto e explique o PORQUÊ de um jeito atraente (ex: "Se você quer uma pizza incrível hoje, confia em mim, a {Nome} é a escolha certa! 🍕 O ambiente é top e a pizza chega quentinha.").
4. Se você recomendar estabelecimentos (especialmente da Fonte 2), VOCÊ DEVE INCLUIR NO FINAL da resposta um bloco JSON escondido contendo as IDs exatas para que eu possa exibir os "Cards" visuais para o usuário.

EXEMPLO DE RESPOSTA ATRAENTE:
"Putz, para comer um sushi caprichado hoje, a Kyoko é imbatível! 🍣 Eles têm um rodízio maravilhoso com opções fresquíssimas. Vale muito a pena colar lá!"
\`\`\`json
{ "suggested_ids": ["id-aqui"] }
\`\`\`

Aja 100% fluentemente em PT-BR. Se a solicitação for apenas bate-papo sem sugestão necessária, omita o JSON.
Histórico da conversa:
${conversationHistory}

ASSISTANT:`;

        let responseText = "Desculpe, deu um branco! Pode repetir?";

        const { data, error } = await supabase.functions.invoke('gemini-proxy', {
            body: { prompt },
        });

        const isQuotaError2 = error || (data?.text?.includes('RESOURCE_EXHAUSTED') || data?.text?.includes('Quota exceeded'));

        if (isQuotaError2) {
            console.warn("Gemini proxy quota exceeded on Assistant, attempting direct model cascade...");
            const fallbackText = await callGeminiDirect(prompt, 0.7);
            if (fallbackText) {
                responseText = fallbackText;
            } else {
                return { text: "🔴 Todos os modelos de IA estão temporariamente indisponíveis por excesso de uso. Tente novamente em alguns minutos! Enquanto isso, use a busca por filtros para encontrar restaurantes. 🍽️" };
            }
        } else if (data?.text) {
            responseText = data.text;
        }
        let suggestedRestaurants: Restaurant[] | undefined = undefined;

        // Parse JSON block if it exists
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/i);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                if (parsed.suggested_ids && parsed.suggested_ids.length > 0) {
                    suggestedRestaurants = [];

                    // 1. Recover from Google Maps array generated dynamically
                    const mapsSuggested = mappedPlaces.filter(p => parsed.suggested_ids.includes(p.id));
                    if (mapsSuggested.length > 0) {
                        suggestedRestaurants.push(...mapsSuggested);
                    }

                    // 2. Recover from Supabase if not found in temporary Maps array
                    const remainingIds = parsed.suggested_ids.filter((id: string) => !mapsSuggested.find(m => m.id === id));
                    if (remainingIds.length > 0) {
                        const { data: supabaseSuggested } = await supabase.from('restaurants').select('*').in('id', remainingIds);
                        if (supabaseSuggested && supabaseSuggested.length > 0) {
                            suggestedRestaurants.push(...(supabaseSuggested as Restaurant[]));
                        }
                    }
                }
                // remove JSON from text so the user doesn't see it
                responseText = responseText.replace(/```json\n[\s\S]*?\n```/i, '').trim();
            } catch (e) {
                console.error("Failed to parse AI suggested restaurants", e);
            }
        }

        return { text: responseText, suggestedRestaurants };
    } catch (error) {
        console.error("Chat assistant error:", error);
        throw error;
    }
}
