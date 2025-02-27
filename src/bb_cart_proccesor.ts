import { searchForItem, getProductIncremental } from './bigbasket';
import { selectOptimalProducts } from './ai-product-selector';

interface CartItem {
    ingredient: string;
    required_quantity: string;
    preference?: string;
}

interface CartProcessResult {
    house_identifier: string;
    overall_status: string;
    results: any[];
}

export async function processCart(house_identifier: string, cart: CartItem[]): Promise<CartProcessResult> {
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
            const result = await processCartItem(item);
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
}

async function processCartItem(item: CartItem) {
    console.log(`Processing item: ${item.ingredient}`);
    
    // Extract quantity value and unit
    const quantityMatch = item.required_quantity?.match(/(\d+)\s*([a-zA-Z]+)/);
    if (!quantityMatch) {
        throw new Error(`Invalid quantity format for ${item.ingredient}`);
    }
    
    const quantityValue = parseInt(quantityMatch[1]);
    const unit = quantityMatch[2];
    console.log(`Parsed quantity: ${quantityValue} ${unit}`);

    // Search for products
    console.log(`Searching for ${item.ingredient}...`);
    const { products } = await searchForItem(item.ingredient);
    console.log(`Found ${products.length} products for ${item.ingredient}`);

    if (products.length === 0) {
        throw new Error(`No products found for ${item.ingredient}`);
    }

    // Get AI recommendation
    console.log(`Getting recommendation for ${item.ingredient}...`);
    const recommendation = await selectOptimalProducts(
        products,
        {
            quantity: quantityValue,
            pricePreference: 'value',
            preferences: item.preference ? [item.preference] : []
        },
        item.ingredient
    );
    console.log(`Recommendation received for ${item.ingredient}:`, recommendation);

    // Add to cart
    const cartResults = await addProductsToCart(recommendation, item.ingredient);
    
    return {
        ingredient: item.ingredient,
        status: cartResults.some(r => r.status === 'failed') ? 'partial_success' : 'success',
        recommendation,
        cart_results: cartResults
    };
}

async function addProductsToCart(recommendation: any[], ingredient: string) {
    console.log(`Adding ${ingredient} to cart...`);
    
    // Process each recommended product
    const cartResults = [];
    for (const rec of recommendation) {
        try {
            // Call product-incremental API for each product
            const prodId = parseInt(rec.product_id);
            const count = rec.count;
            
            console.log(`Adding product ID ${prodId} with quantity ${count} to cart...`);
            
            // Call getProductIncremental 'count' times
            const attemptResults = [];
            for (let i = 0; i < count; i++) {
                try {
                    const result = await getProductIncremental(prodId, ingredient);
                    attemptResults.push({
                        attempt: i + 1,
                        status: 'success',
                        result: result
                    });
                } catch (error) {
                    attemptResults.push({
                        attempt: i + 1,
                        status: 'failed',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }
            
            // Check if all attempts were successful
            const allSuccessful = attemptResults.every(r => r.status === 'success');

            cartResults.push({
                product_id: prodId,
                count: count,
                status: allSuccessful ? 'added' : 'partial_add',
                attempts: attemptResults
            });
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