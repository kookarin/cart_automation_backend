import { selectBlinkitProducts } from './ai-product-selector-blinkit';
import { searchBlinkit } from './blinkitHelper';
import { blinkitOrder } from './blinkit_master';
import { insertBlinkitPicklistItem, getCookieForHouse } from './services/db';

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

async function processCartItem(item: CartItem, house_identifier: number) {
    console.log(`Processing item: ${item.ingredient}`);
    const cookieData = await getCookieForHouse(house_identifier.toString(),'Blinkit');
    const cookie = cookieData[0].cookie;

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
    const searchResult = await searchBlinkit(item.ingredient,cookie);
    console.log(searchResult);

    const products = searchResult?.[item.ingredient];
    console.log(products);
    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new Error(`No products found for ${item.ingredient}`);
    }

    console.log(`Getting AI recommendations for ${item.ingredient}...`);
    const recommendation = await selectBlinkitProducts(
        products,
        item.ingredient,
        quantityValue,
        unit,
        item.preference === 'budget' ? 'budget' : 'value'
    );

    // Insert recommended items into picklist
    console.log(recommendation);
    for (const rec of recommendation) {
        const product = products.find(p => p.product_id === rec.product_id);
        if (product) {
            await insertBlinkitPicklistItem({
                ingredient_name: item.ingredient,
                ingredient_packSize: product.unit,
                required_qty: rec.count,
                house_id: house_identifier,
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

export async function processBlinkitCart(house_identifier: number, cart: CartItem[]): Promise<CartProcessResult> {
    try {
        console.log('Processing Blinkit cart for house:', house_identifier);
        console.log('Cart items:', cart);

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            throw new Error('Valid cart data is required');
        }

        const results = [];
        let allSuccessful = true;

        for (const item of cart) {
            try {
                const result = await processCartItem(item, house_identifier);
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
            await blinkitOrder(house_identifier.toString());
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
