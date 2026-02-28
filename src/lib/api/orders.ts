import { supabase } from '../supabase';
import { Order, OrderItem } from '../types';

export async function placeOrder(
    userId: string,
    restaurantId: string,
    totalAmount: number,
    deliveryAddress: string | null,
    items: Omit<OrderItem, 'id' | 'order_id' | 'created_at'>[]
): Promise<{ order: Order | null; error: Error | null }> {
    try {
        // 1. Insert into orders table
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                restaurant_id: restaurantId,
                total_amount: totalAmount,
                delivery_address: deliveryAddress,
                status: 'pending'
            })
            .select()
            .single();

        if (orderError) throw orderError;
        if (!orderData) throw new Error('Falha ao criar pedido');

        // 2. Insert into order_items table
        const orderItemsToInsert = items.map(item => ({
            ...item,
            order_id: orderData.id
        }));

        const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsToInsert);

        if (itemsError) throw itemsError;

        return { order: orderData as Order, error: null };
    } catch (error: any) {
        console.error('Error placing order:', error);
        return { order: null, error };
    }
}
