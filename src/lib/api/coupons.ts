import { supabase } from '../supabase';
import { Coupon } from '../types';
import { MOCK_COUPONS } from '../mock-data';

export async function getCouponsForRestaurant(restaurantId: string): Promise<Coupon[]> {
    if (supabase) {
        const { data, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'active')
            .gte('valid_until', new Date().toISOString());

        if (error) {
            console.error('Error fetching coupons:', error);
            return [];
        }
        return (data as Coupon[]) || [];
    }
    return MOCK_COUPONS.filter(c => c.restaurant_id === restaurantId);
}

export async function redeemCoupon(couponId: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.rpc('increment_coupon_redemption', {
        coupon_id: couponId,
    });

    if (error) {
        // Fallback: do it manually
        const { data: coupon } = await supabase
            .from('coupons')
            .select('current_redemptions, max_redemptions')
            .eq('id', couponId)
            .single();

        if (!coupon) return false;
        if (coupon.max_redemptions && coupon.current_redemptions >= coupon.max_redemptions) {
            return false; // Max reached
        }

        await supabase
            .from('coupons')
            .update({ current_redemptions: (coupon.current_redemptions || 0) + 1 })
            .eq('id', couponId);
    }

    return true;
}
