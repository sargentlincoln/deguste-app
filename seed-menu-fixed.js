import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Dynamic categories with their items to create a realistic menu
const menuData = {
    'Restaurante': [
        { name: 'Prato Feito Tradicional', desc: 'Arroz, feijão, bife suculento, ovo frito e fritas.', price: 25.90, category: 'Pratos Principais' },
        { name: 'Parmegiana de Carne', desc: 'Acompanha arroz branco e batata frita.', price: 42.00, category: 'Pratos Principais' },
        { name: 'Salada da Casa', desc: 'Mix de folhas, tomate cereja, cenoura e molho especial.', price: 18.50, category: 'Entradas' },
        { name: 'Pudim de Leite', desc: 'Pudim caseiro com calda de caramelo.', price: 12.00, category: 'Sobremesas' },
        { name: 'Refrigerante Lata', desc: 'Coca-cola ou Guaraná.', price: 6.00, category: 'Bebidas' }
    ],
    'Hamburgueria': [
        { name: 'Smash Burger Classic', desc: 'Pão brioche, duas carnes smash 90g, queijo cheddar e molho especial.', price: 32.00, category: 'Lanches' },
        { name: 'Bacon Lover', desc: 'Hambúrguer artesanal 180g, muito bacon, queijo prato e cebola caramelizada.', price: 38.00, category: 'Lanches' },
        { name: 'Batata Frita com Cheddar', desc: 'Porção individual com cheddar cremoso e farofa de bacon.', price: 22.00, category: 'Entradas' },
        { name: 'Milkshake de Ovomaltine', desc: 'Super cremoso, 400ml.', price: 18.00, category: 'Sobremesas' },
        { name: 'Refrigerante 2L', desc: 'Garrafa pet', price: 14.00, category: 'Bebidas' }
    ],
    'Pizzaria': [
        { name: 'Pizza Calabresa', desc: 'Massa fina, molho, calabresa fatiada, cebola e azeitonas.', price: 55.00, category: 'Pizzas' },
        { name: 'Pizza Margherita', desc: 'Muçarela, manjericão fresco e rodela de tomate.', price: 60.00, category: 'Pizzas' },
        { name: 'Pizza Quatro Queijos', desc: 'Muçarela, provolone, gorgonzola e parmesão.', price: 68.00, category: 'Pizzas' },
        { name: 'Coca-Cola 2L', desc: 'Gelada', price: 15.00, category: 'Bebidas' },
        { name: 'Cerveja Long Neck', desc: 'Heineken ou Stella.', price: 10.00, category: 'Bebidas' }
    ],
    'Cafeteria': [
        { name: 'Cappuccino Italiano', desc: 'Expresso, leite vaporizado e espuma.', price: 14.00, category: 'Bebidas' },
        { name: 'Croissant Manteiga', desc: 'Massa folhada e macia.', price: 12.00, category: 'Lanches' },
        { name: 'Pão de Queijo Recheado', desc: 'Pão de queijo grande com requeijão.', price: 8.00, category: 'Lanches' },
        { name: 'Bolo de Cenoura', desc: 'Fatia com muita cobertura de chocolate.', price: 10.00, category: 'Sobremesas' },
        { name: 'Expresso Duplo', desc: 'O dobro de sabor.', price: 9.00, category: 'Bebidas' }
    ], // We fallback to others
    'Padaria': [
        { name: 'Pão na Chapa', desc: 'Pão francês na chapa com manteiga.', price: 5.00, category: 'Lanches' },
        { name: 'Misto Quente', desc: 'Pão de forma, presunto e muito queijo.', price: 12.00, category: 'Lanches' },
        { name: 'Suco de Laranja', desc: 'Natural, 300ml.', price: 8.00, category: 'Bebidas' },
        { name: 'Sonho de Creme', desc: 'Massa fofinha e recheio caprichado.', price: 7.00, category: 'Sobremesas' },
        { name: 'Café Pingado', desc: 'Café com leite no copo americano.', price: 4.50, category: 'Bebidas' }
    ],
    'Bar': [
        { name: 'Porção de Fritas com Queijo', desc: 'Batatas crocantes com muito queijo.', price: 35.00, category: 'Entradas' },
        { name: 'Isca de Peixe', desc: 'Acompanha molho tártaro.', price: 48.00, category: 'Entradas' },
        { name: 'Chopp Pilsen', desc: 'Caneco congelado 300ml.', price: 9.00, category: 'Bebidas' },
        { name: 'Caipirinha de Limão', desc: 'Cachaça artesanal e limão tahiti.', price: 18.00, category: 'Drinks' },
        { name: 'Cerveja 600ml', desc: 'Original ou Skol.', price: 14.00, category: 'Bebidas' }
    ]
};

async function seed() {
    console.log("Fetching restaurants...");
    const { data: restaurants, error } = await supabase.from('restaurants').select('id, name, categories');

    if (error) {
        console.error("Error fetching restaurants:", error);
        return;
    }

    console.log(`Found ${restaurants.length} restaurants. Creating dynamic menus...`);

    // First delete all existing items
    const { error: deleteError } = await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
        console.warn("Could not delete old menu items (might be empty already):", deleteError.message);
    } else {
        console.log("Old menu items cleared.");
    }

    let itemsToInsert = [];

    for (const r of restaurants) {
        let selectedCategory = 'Restaurante'; // Default
        const cats = r.categories || [];

        // Determine best match
        if (cats.includes('Hamburgueria')) selectedCategory = 'Hamburgueria';
        else if (cats.includes('Pizzaria')) selectedCategory = 'Pizzaria';
        else if (cats.includes('Cafeteria')) selectedCategory = 'Cafeteria';
        else if (cats.includes('Padaria')) selectedCategory = 'Padaria';
        else if (cats.includes('Bar')) selectedCategory = 'Bar';
        else if (cats.includes('Lanchonete')) selectedCategory = 'Hamburgueria';
        else if (cats.includes('Sorveteria')) selectedCategory = 'Cafeteria'; // fallback

        const menuToUse = menuData[selectedCategory] || menuData['Restaurante'];

        for (const item of menuToUse) {
            let img = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'; // fallback

            // Small local logic just to inject a non-broken default if ui fails (ui will override via photoUtils if matched, but this looks better in DB)
            const cat = item.category.toLowerCase();
            const name = item.name.toLowerCase();

            if (cat.includes('bebida') || cat.includes('drink')) {
                img = name.includes('refrigerante') || name.includes('coca')
                    ? 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80'
                    : name.includes('cerveja') || name.includes('chopp')
                        ? 'https://images.unsplash.com/photo-1538481199005-9715c6d68ea7?w=400&q=80'
                        : name.includes('suco')
                            ? 'https://images.unsplash.com/photo-1622597467836-f38240662d51?w=400&q=80'
                            : 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80';
            } else if (cat.includes('lanche')) {
                img = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80';
            } else if (cat.includes('pizza')) {
                img = 'https://images.unsplash.com/photo-1513104890d38-7c0f4fff45f1?w=400&q=80';
            } else if (cat.includes('sobremesa')) {
                img = 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80';
            } else {
                img = 'https://images.unsplash.com/photo-1544025162-8a1152575293?w=400&q=80';
            }

            itemsToInsert.push({
                restaurant_id: r.id,
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                image_url: img
            });
        }
    }

    // Insert in batches of 1000 to prevent Supabase payload limits
    const batchSize = 1000;
    for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        const batch = itemsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase.from('menu_items').insert(batch);
        if (insertError) {
            console.error("Error inserting menu matching batch:", insertError);
        }
    }

    console.log(`Menu Items Replacement completed! Re-created ${itemsToInsert.length} contextual menu items.`);
}

seed();
