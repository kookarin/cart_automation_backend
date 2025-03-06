import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Function to get all rows
export async function getAllCookies() {


    const { data, error } = await supabase
        .from('phone_house_mapping')
        .select('*');

    if (error) {
        throw new Error(`Failed to fetch all cookies: ${error.message}`);
    }

    return data;
}

export async function getCookieForHouseOld(houseId: string) {
    // First get all cookies to see what's available
    console.log('Getting all cookies first...');
    const allCookies = await getAllCookies();
    // console.log('Total cookies in database:', allCookies?.length || 0);

    // console.log('Querying for house ID:', houseId);
    const { data: checkData, error: checkError } = await supabase
        .from('phone_house_mapping')
        .select('*')
        .eq('bigbasket_identifier', houseId);

    // console.log('All matching rows:', checkData);

    if (checkError) {
        console.error('Error checking data:', checkError);
        throw new Error(`Failed to check data: ${checkError.message}`);
    }

    if (!checkData || checkData.length === 0) {
        throw new Error(`No cookie found for house: ${houseId}`);
    }

    // Get the most recent cookie
    const latestCookie = checkData.reduce((latest, current) => {
        if (!latest || new Date(current.created_at) > new Date(latest.created_at)) {
            return current;
        }
        return latest;
    });

    return latestCookie.cookies;
}

export async function getCookieForHouse(houseId: string, platform: string) {
    const { data, error } = await supabase
        .from('phone_house_mapping')
        .select('*')
        .eq('house_id', houseId)
        .eq('platform', platform)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching cookie:', error);
        throw new Error(`Failed to fetch cookie: ${error.message}`);
    }

    if (!data || data.length === 0) {
        throw new Error(`No active cookie found for house: ${houseId} on ${platform} platform`);
    }

    if (platform === 'Licious') {
        return [{
            cookie: data[0].cookies,
            build_id: data[0].build_id
        }];
    }
    if (platform === 'Zepto') {
        return [{
            cookie: data[0].cookies,
            store_id: data[0].store_id,
            store_ids: data[0].store_ids
        }];
    }
    else {
        return [{
            cookie: data[0].cookies
        }];
    }
}

interface PicklistItem {
    ingredient_name: string;
    ingredient_url: string;
    ingredient_packSize: string;
    required_qty: number;
    house_id: number;
    platform: string;
    product_id: string;
}

export async function insertZeptoPicklistItem(
    item: PicklistItem
): Promise<void> {
    const { data, error } = await supabase
        .from('grocery_picklist_p2')
        .insert([{
            ingredient_name: item.ingredient_name,
            ingredient_url: `https://www.zeptonow.com/pn/${item.ingredient_name.toLowerCase().replace(/\s+/g, '-')}/pvid/${item.product_id}`,
            ingredient_packSize: item.ingredient_packSize,
            required_qty: item.required_qty,
            house_id: item.house_id,
            is_ordered: false,
            platform: 'Zepto',
            multipack: 'no'
        }]);

    if (error) {
        console.error('Error inserting picklist item:', error);
        throw new Error(`Failed to insert picklist item: ${error.message}`);
    }
}

export async function insertBlinkitPicklistItem(
    item: {
        ingredient_name: string;
        ingredient_packSize: string;
        required_qty: number;
        house_id: number;
        product_id: string;
    }
): Promise<void> {
    const { error } = await supabase
        .from('grocery_picklist_p2')
        .insert([{
            ingredient_name: item.ingredient_name,
            ingredient_url: `https://blinkit.com/prn/${item.ingredient_name.toLowerCase().replace(/\s+/g, '-')}/prid/${item.product_id}`,
            ingredient_packSize: item.ingredient_packSize,
            required_qty: item.required_qty,
            house_id: item.house_id,
            is_ordered: false,
            platform: 'Blinkit',
            multipack: 'no'
        }]);

    if (error) {
        console.error('Error inserting picklist item:', error);
        throw new Error(`Failed to insert picklist item: ${error.message}`);
    }
}
