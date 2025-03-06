import { searchForItemL, getProductIncrementalL } from './liciousHelper';
import { selectOptimalProducts } from './ai-product-selector';
import { getCookieForHouse } from './services/db';
// Add type assertion if TypeScript complains about JSON import
// import houseCookies from './config/house-cookies.json' assert { type: 'json' };

interface CartItem {
    ingredient: string;
    'required quantity': string;
    preference?: string;
}

interface CartProcessResult {
    house_identifier: string;
    overall_status: string;
    results: any[];
}

interface HouseCookie {
    cookie: string;
    description: string;
}

interface HouseCookies {
    [key: string]: {
        cookie: string;
        description: string;
    };
}

// If you need type safety, you can type assert the import:
const houseCookies = require('./config/house-cookies.json') as HouseCookies;

export async function processCartL(house_identifier: string, cart: CartItem[]): Promise<CartProcessResult> {
    try {
        // Get cookie from Supabase
        const cookieData = await getCookieForHouse(house_identifier,'Licious');
        const data = cookieData[0] as { cookie: any; buildId: any};
        const cookie = data.cookie;
        const buildId = data.buildId;
        

        console.log('Processing cart for house:', house_identifier);
        console.log('Cart items:', cart);

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            throw new Error('Valid cart data is required');
        }

        // Results array to track processing of each item
        const results = [];
        let allSuccessful = true;

        // Process each cart item sequentially
        for (const item of cart) {
            try {
                const result = await processCartItemL(item, cookie, buildId);
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

async function processCartItemL(item: CartItem, cookie: string, buildId: string) {
    console.log(`Processing item: ${item.ingredient}`);
    console.log(`Item: ${JSON.stringify(item)}`);

    // Extract quantity value and unit
    let quantityValue: number;
    let unit: string;

    // First try to match decimal or integer number with unit
    const quantityMatch = item['required quantity']?.match(/(\d*\.?\d+)\s*([a-zA-Z]+)/);

    if (quantityMatch) {
        quantityValue = parseFloat(quantityMatch[1]);
        unit = quantityMatch[2];
    } else {
        // If no unit found, try to get just the decimal or integer number and assume 'piece'
        const numberMatch = item['required quantity']?.match(/(\d*\.?\d+)/);
        if (!numberMatch) {
            throw new Error(`Invalid quantity format for ${item.ingredient}`);
        }
        quantityValue = parseFloat(numberMatch[1]);
        unit = 'piece';
    }

    console.log(`Parsed quantity: ${quantityValue} ${unit}`);

    // Pass cookie to searchForItem
    console.log(`Searching for ${item.ingredient}...`);
    const { products } = await searchForItemL(item.ingredient, cookie, buildId);
    console.log(`Found ${products.length} products for ${item.ingredient}`);

    if (products.length === 0) {
        throw new Error(`No products found for ${item.ingredient}`);
    }
    if (unit == '') {
        unit = 'piece';
    }
    // Get AI recommendation
    console.log(`Getting recommendation for ${item.ingredient}...`);
    const recommendation = await selectOptimalProducts(
        products,
        {
            quantity: quantityValue,
            unit: unit,
            pricePreference: 'budget',
            preferences: item.preference ? [item.preference] : []
        },
        item.ingredient
    );
    console.log(`Recommendation received for ${item.ingredient}:`, recommendation);

    // Pass cookie to addProductsToCart
    const cartResults = await addProductsToCart(recommendation, item.ingredient, cookie);

    return {
        ingredient: item.ingredient,
        status: cartResults.some(r => r.status === 'failed') ? 'partial_success' : 'success',
        recommendation,
        cart_results: cartResults
    };
}

async function addProductsToCart(recommendation: any[], ingredient: string, cookie: string) {
    console.log(`Adding ${ingredient} to cart...`);

    const cartResults = [];
    for (const rec of recommendation) {
        try {
            const prodId = rec.product_id;
            const count = rec.count;

            console.log(`Adding product ID ${prodId} with quantity ${count} to cart...`);

            // For Licious, we can directly update the cart with the final quantity
            let attempts = 0;
            let success = false;
            let lastError;

            // Try up to 3 times (initial try + 2 retries)
            while (attempts < 3 && !success) {
                try {
                    const result = await getProductIncrementalL(prodId, ingredient, cookie);
                    success = true;
                    cartResults.push({
                        product_id: prodId,
                        count: count,
                        status: 'added',
                        result: result
                    });
                } catch (error) {
                    lastError = error;
                    attempts++;
                    if (attempts < 3) {
                        console.log(`Retry ${attempts} for product ${prodId}`);
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
                    } else {
                        cartResults.push({
                            product_id: prodId,
                            count: count,
                            status: 'failed',
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error adding product to cart:`, error);
            cartResults.push({
                product_id: rec.product_id,
                count: rec.count,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    return cartResults;
}
