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
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Using anon key:', process.env.SUPABASE_ANON_KEY?.substring(0, 10) + '...');

    const { data, error } = await supabase
        .from('phone_house_mapping')
        .select('*');
    
    console.log('All rows in database:', data);
    console.log('Any error:', error);
    
    if (error) {
        throw new Error(`Failed to fetch all cookies: ${error.message}`);
    }
    
    return data;
}

export async function getCookieForHouse(houseId: string) {
    // First get all cookies to see what's available
    console.log('Getting all cookies first...');
    const allCookies = await getAllCookies();
    console.log('Total cookies in database:', allCookies?.length || 0);
    
    console.log('Querying for house ID:', houseId);
    const { data: checkData, error: checkError } = await supabase
        .from('bb_automation_cookies')
        .select('*')
        .eq('bigbasket_identifier', houseId);
    
    console.log('All matching rows:', checkData);
    
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
