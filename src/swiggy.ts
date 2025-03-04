import { searchSwiggyInstamart, addToSwiggyCart } from './swiggyHelper';
import { selectOptimalProducts } from './ai-product-selector-swiggy';
import { getCookieForHouseSwiggy } from './services/db';

interface CartItem {
    ingredient: string;
    'required quantity': string;
    preference?: string;
}

interface CartProcessResult {
    overall_status: string;
    results: any[];
    cart_result?: any;
    cart_error?: string;
}

export async function processSwiggyCart(cart: CartItem[], houseId: string): Promise<CartProcessResult> {
    try {
        console.log('Processing Swiggy cart items:', cart);

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            throw new Error('Valid cart data is required');
        }

        if (!houseId) {
            throw new Error('House ID is required');
        }

        // Get cookie from database instead of JSON file
        const cookie = await getCookieForHouseSwiggy(houseId);
        console.log('Cookie retrieved for house:', houseId);
        
        const results = [];
        const allCartItems = [];  // Array to collect all items to be added to cart

        // Process each cart item sequentially
        for (const item of cart) {
            try {
                const { products } = await searchSwiggyInstamart(item.ingredient, cookie);
                const result = await processSwiggyCartItem(item, products);
                results.push(result);
                // Add recommended items to our collection
                allCartItems.push(...result.cartItems);
            } catch (error) {
                console.error(`Error processing ${item.ingredient}:`, error);
                results.push({
                    ingredient: item.ingredient,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        // Add all items to cart in a single call
        let cartResult;
        try {
            cartResult = await addToSwiggyCart(allCartItems, cookie);
            console.log('Added all items to cart:', cartResult);
        } catch (error) {
            console.error('Error adding items to cart:', error);
            return {
                overall_status: 'failed',
                results,
                cart_error: error instanceof Error ? error.message : 'Unknown error'
            };
        }

        return {
            overall_status: cartResult.statusCode === 200 ? 'success' : 'partial_failure',
            results
        };
    } catch (error) {
        console.error('Cart processing error:', error);
        throw error;
    }
}

async function processSwiggyCartItem(item: CartItem, products: any[]): Promise<any> {
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

    // Transform recommendations into CartItems format
    const cartItems = recommendations.map(rec => ({
        itemId: rec.itemId,
        productId: rec.productId,
        quantity: rec.count,
        spin: rec.spin,
        storeId: rec.storeId
    }));

    return {
        ingredient: item.ingredient,
        status: 'processed',
        recommendations,
        cartItems  // Return the cart items instead of making API call
    };
}