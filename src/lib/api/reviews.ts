import { supabase } from '../supabase';
import { Review } from '../types';

export async function getReviews(restaurantId: string): Promise<Review[]> {
    if (supabase) {
        const { data, error } = await supabase
            .from('reviews')
            .select('*, user:users(name, avatar_url)')
            .eq('restaurant_id', restaurantId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching reviews:', error);
            return generateDistributedMockReviews(restaurantId);
        }

        // We want exactly 5 reviews: 3 good, 1 medium, 1 bad.
        // We mix real ones matching the criteria with mock ones if missing.
        const realReviews = (data as any[]) || [];

        return ensureReviewDistribution(realReviews, restaurantId);
    }
    return generateDistributedMockReviews(restaurantId);
}

function ensureReviewDistribution(real: any[], rId: string) {
    const good = real.filter(r => r.rating >= 4);
    const med = real.filter(r => r.rating === 3);
    const bad = real.filter(r => r.rating <= 2);

    const result = [];

    // Add up to 3 good
    for (let i = 0; i < 3; i++) {
        if (good[i]) result.push(good[i]);
        else result.push(getMockReview(rId, 5, `Excepcional!`, `Ótima comida e serviço excelente. Recomendo muito.`, 'https://i.pravatar.cc/150?img=' + (i + 10)));
    }

    // Add 1 med
    if (med[0]) result.push(med[0]);
    else result.push(getMockReview(rId, 3, `Razoável`, `A comida estava ok, mas o atendimento deixou a desejar um pouco.`, 'https://i.pravatar.cc/150?img=20'));

    // Add 1 bad
    if (bad[0]) result.push(bad[0]);
    else result.push(getMockReview(rId, 1, `Decepção`, `Demorou muito para chegar e veio frio. Não volto mais.`, 'https://i.pravatar.cc/150?img=30'));

    return result;
}

function generateDistributedMockReviews(rId: string) {
    return ensureReviewDistribution([], rId);
}

function getMockReview(restaurantId: string, rating: number, authorName: string, comment: string, avatar: string) {
    return {
        id: `mock-rev-${rating}-${Math.random()}`,
        restaurant_id: restaurantId,
        user_id: `mock-user-${rating}`,
        rating: rating,
        comment: comment,
        user: { name: authorName, avatar_url: avatar, level: 'Crítico' },
        created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    };
}

export async function addReview(
    userId: string,
    restaurantId: string,
    rating: number,
    comment: string,
    menuItemId?: string,
    photoUrl?: string
): Promise<Review | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('reviews')
        .insert({
            user_id: userId,
            restaurant_id: restaurantId,
            rating,
            comment,
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding review:', error);
        throw error;
    }

    // Update restaurant rating_avg and rating_count
    const { data: stats } = await supabase
        .from('reviews')
        .select('rating')
        .eq('restaurant_id', restaurantId);

    if (stats && stats.length > 0) {
        const avg = stats.reduce((sum, r) => sum + r.rating, 0) / stats.length;
        await supabase
            .from('restaurants')
            .update({
                rating_avg: Math.round(avg * 10) / 10,
                rating_count: stats.length,
            })
            .eq('id', restaurantId);
    }
    return data as Review;
}
