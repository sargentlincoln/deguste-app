# Análise de Funcionalidades: Restaurant Guru vs. Deguste

O **Restaurant Guru** é um dos maiores guias gastronômicos do mundo. O grande diferencial dele não é apenas ter uma base de dados própria, mas ser um **agregador** de dados de várias outras plataformas (Google, Yelp, Facebook, Zomato, Foursquare, Michelin, etc.).

Aqui está um levantamento completo das funcionalidades e os dados necessários para você implementar melhorias no seu app (Deguste):

## 1. Principais Funcionalidades do Restaurant Guru

### 1.1. Avaliação Agregada (A "Nota Guru")
Em vez de depender apenas das avaliações dos próprios usuários do app, o Restaurant Guru coleta notas de vários sites e calcula uma média ponderada.
* **Por que é bom:** O usuário confia mais na nota, pois ela reflete centenas/milhares de opiniões registradas na internet, não só no App.
* **O que o Deguste precisa:** Um sistema (scraper ou consumo de API, como Google Places API) que busque a nota do restaurante no Google e afins, para complementar a nota interna do Deguste.

### 1.2. Busca Avançada e Específica por Prato (Dish Search)
O usuário pode pesquisar "Melhor Sushi", "Lasanha" ou até "Cerveja gelada". O app varre os **cardápios** e as **avaliações** para encontrar menções a esses pratos.
* **Por que é bom:** Entrega exatamente o que o usuário quer comer, no lugar de apenas mostrar a categoria "Italiano".
* **O que o Deguste precisa:**
  1. Cadastro detalhado de itens do cardápio (Nome do Prato, Descrição, Preço).
  2. Implementar no Search (Supabase) a busca textual (Full Text Search) na tabela de cardápio (`menu_items`).

### 1.3. Cardápios Completos com Fotos e Preços (Menus)
Permite que o usuário veja fotos reais do cardápio (frequentemente fotos tiradas por clientes) ou versões em texto com os preços atualizados.
* **O que o Deguste precisa:** Uma funcionalidade para o dono do restaurante (ou usuários logados) fazer o upload de PDFs do cardápio ou o cadastro estruturado de Categorias -> Pratos -> Preços. Vejo que você já tem scripts como `seed-menu.js`, o caminho é expandir isso para o App visualmente.

### 1.4. Filtros Combinados Profundos
* Distância (Perto de mim usando geolocalização exata).
* Preço ($, $$, $$$, $$$$).
* Aberto Agora (Checando horário de funcionamento do dia na hora H).
* Categorias hiper-nichadas (ex: "Adequado para crianças", "Música ao vivo", "Cão amigável").
* **O que o Deguste precisa:** Tabela de "Comodidades" (Amenities) relacional (`restaurant_amenities`), permitindo que o usuário marque checkboxes na tela de "Search.tsx".

### 1.5. Prêmios e Selos ("Badges")
O Restaurant Guru cria rankings automáticos e dá selos virtuais para os restaurantes: "Top 10 Pizzarias da Cidade", "Melhor Atendimento 2024". Eles fornecem adesivos reais (PDFs para imprimir) que as lojas colam na vitrine.
* **Por que é bom:** Gera marketing orgânico massivo. Os restaurantes ficam orgulhosos e fazem propaganda do seu app de graça na porta do estabelecimento.
* **O que o Deguste precisa:** Um job/script no backend que rode 1x por mês, verifique os melhores ranqueados em certas categorias e crie um "Selo" no banco de dados, exibindo um ícone especial no perfil deles no App.

---

## 2. Estrutura de Banco de Dados Sugerida (Coleta de Dados)

Para implementar esses recursos no **Deguste**, sua estrutura no Supabase precisa suportar (ou adaptar para) as seguintes tabelas e campos de dados que o Restaurant Guru rastreia:

### Tabela: `restaurants` (Campos obrigatórios de rastreio)
* `aggregated_rating` (Float) - A nota combinada de diversas fontes.
* `price_level` (Int) - Indicador de preço de 1 a 4.
* `website_url` (Text) - Link oficial ou Linktree.
* `instagram_url` (Text) - Essencial para o público atual.
* `is_claimed` (Boolean) - Indicador se o dono real já reivindicou o perfil para editar cardápios e responder avaliações.

### Tabela: `external_ratings` (Sugestão de Nova Tabela)
Armazena a nota de plataformas terceiras para não misturar com as notas geradas dentro do Deguste.
* `id`
* `restaurant_id`
* `source` (String - ex: 'Google', 'TripAdvisor')
* `rating` (Float - ex: 4.8)
* `review_count` (Int - ex: 1200)

### Tabela: `menu_items` (Cardápios Digitais)
Crucial para a busca por pratos específicos.
* `id`
* `restaurant_id`
* `name` (String - ex: "Hambúrguer Artesanal Clássico")
* `description` (Text - ex: "Pão brioche, blend 180g, queijo prato...")
* `price` (Decimal - ex: 35.90)
* `image_url` (Text - Foto individual do prato)
* `category` (String - ex: "Lanches", "Bebidas")

### Tabela: `restaurant_amenities` (Para os Filtros Profundos)
Para enriquecer a tela de Busca e o card do restaurante.
* `restaurant_id`
* `amenity_id` (Relaciona com tabela fixa `amenities` que possui ID, Nome e Ícone: Wi-Fi, Estacionamento, Ar-Condicionado, Pet Friendly, Delivery, Acessibilidade).

### Tabela: `badges` (Sistema de Prêmios)
* `id`
* `restaurant_id`
* `title` (String - ex: "Destaque de Pizza 2026")
* `month_year` (Date)
* `icon_url` (Text)

---

## 3. Próximos Passos Recomendados para o Deguste

Se você quiser focar em **3 melhorias imediatas** inspiradas no Restaurant Guru para implementar no Deguste, eu recomendo na seguinte ordem de impacto UX:

1. **Cardápio Visual (`menu_items`) e Busca por Pratos**: O que as pessoas mais procuram em apps de comida é "O que tem para comer e quanto custa?". O Deguste deve permitir ver fotos e preços dos pratos no perfil do restaurante.
2. **Filtros Avançados de Comodidade na Busca (`Search.tsx`)**: Permitir que o usuário clique em botões como "Pet Friendly", "Estacionamento" ou filtre a faixa de preço `$$$`.
3. **Rankings e Selos ("Descobrir")**: Criar na tela Home listas curadas como "As 10 Melhores Cervejarias da Cidade". Isso retém o usuário e gamifica a entrada de restaurantes no app.

> Todos os dados de pratos, horários, categorias customizadas e avaliações externas são o motor de apps como o Restaurant Guru. Você pode preencher esses dados no Supabase e expor na interface React/Vite do Deguste!
