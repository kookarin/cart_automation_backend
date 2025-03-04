import { searchSwiggyInstamart } from './swiggy_instamart';
import { selectOptimalProducts } from './ai-product-selector-swiggy';
import { addToSwiggyCart } from './swiggy_instamart';

interface CartItem {
    ingredient: string;
    'required quantity': string;
    preference?: string;
}

interface CartProcessResult {
    overall_status: string;
    results: any[];
}

export async function processSwiggyCart(cart: CartItem[]): Promise<CartProcessResult> {
    try {
        console.log('Processing Swiggy cart items:', cart);

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            throw new Error('Valid cart data is required');
        }

        const results = [];
        let allSuccessful = true;

        // Process each cart item sequentially
        for (const item of cart) {
            try {
                const result = await processSwiggyCartItem(item);
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
            overall_status: allSuccessful ? 'success' : 'partial_failure',
            results
        };
    } catch (error) {
        console.error('Cart processing error:', error);
        throw error;
    }
}

async function processSwiggyCartItem(item: CartItem) {
    console.log(`Processing item: ${item.ingredient}`);
    console.log(`Item: ${JSON.stringify(item)}`);
    
    // Extract quantity value and unit
    const quantityMatch = item['required quantity']?.match(/(\d+)\s*([a-zA-Z]+)/);
    if (!quantityMatch) {
        throw new Error(`Invalid quantity format for ${item.ingredient}`);
    }
    
    const quantityValue = parseInt(quantityMatch[1]);
    const unit = quantityMatch[2];
    console.log(`Parsed quantity: ${quantityValue} ${unit}`);

    // Search for products
    console.log(`Searching for ${item.ingredient}...`);
    const { products } = await searchSwiggyInstamart(item.ingredient);
    console.log(`Found ${products.length} products for ${item.ingredient}`);

    if (products.length === 0) {
        throw new Error(`No products found for ${item.ingredient}`);
    }

    // Get AI recommendation
    console.log(`Getting recommendation for ${item.ingredient}...`);
    const recommendations = await selectOptimalProducts(
        products,
        {
            quantity: quantityValue,
            unit: unit,
            pricePreference: 'value',
            preferences: item.preference ? [item.preference] : []
        },
        item.ingredient
    );
    console.log(`Recommendation received for ${item.ingredient}:`, recommendations);

    // Add products to cart
    const cartResults = await addProductsToSwiggyCart(recommendations);
    
    return {
        ingredient: item.ingredient,
        status: cartResults.some(r => r.status === 'failed') ? 'partial_success' : 'success',
        recommendations,
        cart_results: cartResults
    };
}

async function addProductsToSwiggyCart(recommendations: any[]) {
    console.log(`Adding products to Swiggy cart...`);
    
    const cartResults = [];
    for (const rec of recommendations) {
        try {
            const result = await addToSwiggyCart(
                rec.itemId,
                rec.productId,
                rec.count,
                rec.spin,
                rec.storeId
            );
            
            cartResults.push({
                itemId: rec.itemId,
                count: rec.count,
                status: 'success',
                result: result
            });
        } catch (error) {
            console.error(`Error adding product to cart:`, error);
            cartResults.push({
                itemId: rec.itemId,
                count: rec.count,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    
    return cartResults;
}