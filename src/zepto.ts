import { searchProduct, transformProducts } from './zeptoHelper';
import { selectZeptoProducts } from './ai-product-selector-zepto';
import { insertZeptoPicklistItem } from './services/db';
import { zeptoOrder } from './zepto_master';
import { getCookieForHouse } from './services/db';

interface CartItem {
    ingredient: string;
    'required quantity': string;
    preference?: string;
}

interface CartProcessResult {
    house_identifier: number;
    overall_status: string;
    results: any[];
}

export async function processZeptoCart(house_identifier: number, cart: CartItem[]): Promise<CartProcessResult> {
    try {
        // Get cookie and store IDs from database
        const cookieData = await getCookieForHouse(house_identifier.toString(),'Zepto');
        const data = cookieData[0] as { cookie: any; store_id: any; store_ids: any };
        const cookie = data.cookie;
        const store_id = data.store_id;
        const store_ids = data.store_ids;

        console.log('Processing Zepto cart for house:', house_identifier);
        console.log('Cart items:', cart);

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            throw new Error('Valid cart data is required');
        }

        const results = [];
        let allSuccessful = true;

        for (const item of cart) {
            try {
                // Pass store IDs along with cookie
                const result = await processCartItem(item, house_identifier, cookie, store_id, store_ids);
                results.push(result);
            } catch (error) {
                console.error(`Error processing ${item.ingredient}:`, error);
                results.push({
                    ingredient: item.ingredient,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                allSuccessful = false;
            }
        }

        if (allSuccessful) {
            await zeptoOrder(house_identifier.toString());
        }

        return {
            house_identifier,
            overall_status: allSuccessful ? 'success' : 'partial_failure',
            results
        };
    } catch (error) {
        console.error('Cart processing error:', error);
        throw error;
    }
}

async function processCartItem(item: CartItem, house_identifier: number, cookie: string, store_id: string, store_ids: string) {
    console.log(`Processing item: ${item.ingredient}`);

    // Extract quantity value and unit
    const quantityMatch = item['required quantity']?.match(/(\d*\.?\d+)\s*([a-zA-Z]+)/);
    let quantityValue: number;
    let unit: string;

    if (quantityMatch) {
        quantityValue = parseFloat(quantityMatch[1]);
        unit = quantityMatch[2];
    } else {
        const numberMatch = item['required quantity']?.match(/(\d*\.?\d+)/);
        if (!numberMatch) {
            throw new Error(`Invalid quantity format for ${item.ingredient}`);
        }
        quantityValue = parseFloat(numberMatch[1]);
        unit = 'piece';
    }

    console.log(`Searching for ${item.ingredient}...`);
    const products = await searchProduct(item.ingredient, cookie, store_id, store_ids);
    const transformedProducts = transformProducts(products, item.ingredient)[item.ingredient];


    if (!transformedProducts || transformedProducts.length === 0) {
        throw new Error(`No products found for ${item.ingredient}`);
    }


    const recommendation = await selectZeptoProducts(
        transformedProducts,
        item.ingredient,
        quantityValue,
        unit,
        item.preference === 'budget' ? 'budget' : 'value'
    );

    // Insert recommended items into picklist
    for (const rec of recommendation) {
        const product = transformedProducts.find(p => p.product_id === rec.product_id);
        if (product) {
            await insertZeptoPicklistItem({
                ingredient_name: item.ingredient,
                ingredient_url: '', // Will be generated in the insert function
                ingredient_packSize: product.unit,
                required_qty: rec.count,
                house_id: house_identifier, // Add house_identifier as parameter to processCartItem
                platform: 'Zepto',
                product_id: rec.product_id
            });
        }
    }

    return {
        ingredient: item.ingredient,
        status: 'success',
        recommendation
    };
} 