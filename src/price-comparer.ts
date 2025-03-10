import { searchSwiggyInstamart, SwiggyProduct } from "./swiggyHelper";
import { selectOptimalProducts as selectOptimalProductsSwiggy } from "./ai-product-selector-swiggy";
import { selectOptimalProducts as selectOptimalProductsBB } from "./ai-product-selector";
import { selectZeptoProducts } from "./ai-product-selector-zepto";
import { getCookieForHouse } from "./services/db";
import { searchForItem } from "./bigbasketHelper";
import { searchProduct, transformProducts } from "./zeptoHelper";
import { searchBlinkit } from "./blinkitHelper";
import { selectBlinkitProducts } from "./ai-product-selector-blinkit";
import { searchForItemL } from "./liciousHelper";
import { selectOptimalProducts as selectOptimalProductsLicious } from "./ai-selector-licious";


interface ProductPrice {
    price: number;
    product_name: string;
    weight: string;
    brand?: string;
    available: boolean;
    count: number;
}

interface PriceComparison {
    [platform: string]: ProductPrice;
}

interface ComparisonResult {
    [productName: string]: PriceComparison;
}

interface CartItem {
    ingredient: string;
    "required quantity": string;
    preference: string;
}

interface CartSummary {
    [platform: string]: {
        total: number;
        items_found: number;
        items_not_found: number;
    };
}

interface ComparisonResultWithSummary {
    products: ComparisonResult;
    cart_summary: CartSummary;
}

// Helper function to chunk array into smaller pieces
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

function parseQuantityAndUnit(quantityStr: string): [number, string] {
    // If it's just a number, return it with 'piece' as unit
    if (!isNaN(Number(quantityStr))) {
        return [Number(quantityStr), 'piece'];
    }

    // Match decimal or integer number and unit, handling optional space
    const match = quantityStr.toLowerCase().match(/^(\d*\.?\d+)\s*([a-z]+)$/);
    
    if (match) {
        const quantity = Number(match[1]);
        const unit = match[2];
        return [quantity, unit];
    }
    
    // Default fallback
    return [1, 'piece'];
}

const getCookieSafely = async (houseId: string, platform: string) => {
    try {
        const cookie = await getCookieForHouse(houseId, platform);
        return cookie;
    } catch (error) {
        console.error(`Failed to get cookie for ${platform}:`, error);
        return null;
    }
};

export async function compareProductPrices(
    houseId: string,
    cart: CartItem[],
    platforms: string[]
): Promise<ComparisonResultWithSummary> {
    const results: ComparisonResult = {};
    const cartSummary: CartSummary = {
        swiggy: { total: 0, items_found: 0, items_not_found: 0 },
        bigbasket: { total: 0, items_found: 0, items_not_found: 0 },
        zepto: { total: 0, items_found: 0, items_not_found: 0 },
        blinkit: { total: 0, items_found: 0, items_not_found: 0 },
        licious: { total: 0, items_found: 0, items_not_found: 0 }
    };

    try {
        // Process all items in parallel
        await Promise.all(cart.map(async (item) => {
            try {
                // Initialize result for this item
                results[item.ingredient] = {
                    swiggy: { price: 0, product_name: 'Not found', weight: 'N/A', available: false, count: 0 },
                    bigbasket: { price: 0, product_name: 'Not found', weight: 'N/A', available: false, count: 0 },
                    zepto: { price: 0, product_name: 'Not found', weight: 'N/A', available: false, count: 0 },
                    blinkit: { price: 0, product_name: 'Not found', weight: 'N/A', available: false, count: 0 },
                    licious: { price: 0, product_name: 'Not found', weight: 'N/A', available: false, count: 0 }
                };

                const [quantity, unit] = parseQuantityAndUnit(item["required quantity"]);
                const lowerCasePlatforms = platforms.map(platform => platform.toLowerCase());
                
                // Get all cookies in parallel
                console.log(`Getting cookies for ${item.ingredient}...`);
                const [swiggyData, bbData, zeptoData, blinkitData, liciousData] = await Promise.all([
                    getCookieSafely(houseId, 'Swiggy'),
                    getCookieSafely(houseId, 'Bigbasket'),
                    getCookieSafely(houseId, 'Zepto'),
                    getCookieSafely(houseId, 'Blinkit'),
                    getCookieSafely(houseId, 'Licious')
                ]);

                console.log(`Got cookies for ${item.ingredient}`);
                const data = zeptoData?.[0] as { cookie: any; store_id: any; store_ids: any } || { cookie: null, store_id: null, store_ids: null };
                const liciousInfo = liciousData?.[0] as { cookie: any; buildId: any } || { cookie: null, buildId: null };

                // Get all products in parallel
                console.log(`Searching products for ${item.ingredient}...`);
                const [swiggyProducts, bbProducts, zeptoRawProducts, blinkitProducts, liciousProducts] = await Promise.all([
                    lowerCasePlatforms.includes('swiggy') && swiggyData ? searchSwiggyInstamart(item.ingredient, swiggyData[0].cookie).catch(e => {
                        console.error(`Swiggy search error for ${item.ingredient}:`, e);
                        return { products: [] };
                    }) : Promise.resolve({ products: [] }),
                    lowerCasePlatforms.includes('bigbasket') && bbData ? searchForItem(item.ingredient, bbData[0].cookie).catch(e => {
                        console.error(`BigBasket search error for ${item.ingredient}:`, e);
                        return { products: [] };
                    }) : Promise.resolve({ products: [] }),
                    lowerCasePlatforms.includes('zepto') && zeptoData ? searchProduct(item.ingredient, data.cookie, data.store_id, data.store_ids).catch(e => {
                        console.error(`Zepto search error for ${item.ingredient}:`, e);
                        return [];
                    }) : Promise.resolve([]),
                    lowerCasePlatforms.includes('blinkit') && blinkitData ? searchBlinkit(item.ingredient, blinkitData[0].cookie).catch(e => {
                        console.error(`Blinkit search error for ${item.ingredient}:`, e);
                        return { [item.ingredient]: [] };
                    }) : Promise.resolve({ [item.ingredient]: [] }),
                    lowerCasePlatforms.includes('licious') && liciousData ? searchForItemL(item.ingredient, liciousInfo.cookie, liciousInfo.buildId).catch(e => {
                        console.error(`Licious search error for ${item.ingredient}:`, e);
                        return { products: [] };
                    }) : Promise.resolve({ products: [] })
                ]);
                console.log(`Got search results for ${item.ingredient}`);


                const zeptoProducts = transformProducts(zeptoRawProducts, item.ingredient)[item.ingredient];

                // Run all AI selections in parallel
                const [
                    swiggySelected,
                    bbSelected,
                    zeptoSelected,
                    blinkitSelected,
                    liciousSelected
                ] = await Promise.all([
                    lowerCasePlatforms.includes('swiggy') ? selectOptimalProductsSwiggy(
                        swiggyProducts.products,
                        { quantity, unit, preferences: item.preference ? [item.preference] : [] },
                        item.ingredient
                    ).catch(() => null) : Promise.resolve(null),
                    lowerCasePlatforms.includes('bigbasket') ? selectOptimalProductsBB(
                        bbProducts.products,
                        { quantity, unit, preferences: item.preference ? [item.preference] : [] },
                        item.ingredient
                    ).catch(() => null) : Promise.resolve(null),
                    lowerCasePlatforms.includes('zepto') ? selectZeptoProducts(
                        zeptoProducts,
                        item.ingredient,
                        quantity,
                        unit
                    ).catch(() => null) : Promise.resolve(null),
                    lowerCasePlatforms.includes('blinkit') ? selectBlinkitProducts(
                        blinkitProducts[item.ingredient],
                        item.ingredient,
                        quantity,
                        unit
                    ).catch(() => null) : Promise.resolve(null),
                    lowerCasePlatforms.includes('licious') ? selectOptimalProductsLicious(
                        liciousProducts.products.map(p => ({ ...p, pack_desc: p.pack_desc || '' })),
                        { quantity, unit, preferences: item.preference ? [item.preference] : [] },
                        item.ingredient
                    ).catch(() => null) : Promise.resolve(null)
                ]);

                // Process Swiggy results
                if (swiggySelected) {
                    const swiggyMatch = swiggyProducts.products.find(p => 
                        String(p.itemId) === String(swiggySelected[0].itemId)
                    );

                    if (swiggyMatch) {
                        results[item.ingredient].swiggy = {
                            price: swiggyMatch.price,
                            product_name: swiggyMatch.name,
                            weight: swiggyMatch.weight,
                            brand: swiggyMatch.brand,
                            available: swiggyMatch.available,
                            count: swiggySelected[0].count
                        };
                        cartSummary.swiggy.total += swiggyMatch.price * swiggySelected[0].count;
                        cartSummary.swiggy.items_found += 1;
                    } else {
                        cartSummary.swiggy.items_not_found += 1;
                    }
                } else {
                    results[item.ingredient].swiggy = {
                        price: 0,
                        product_name: 'Not found',
                        weight: 'N/A',
                        available: false,
                        count: 0
                    };
                }

                // Process BigBasket results
                if (bbSelected) {
                    const bbMatch = bbProducts.products.find(p => 
                        String(p.product_id) === String(bbSelected[0].product_id)
                    );

                    if (bbMatch) {
                        results[item.ingredient].bigbasket = {
                            price: bbMatch.price,
                            product_name: bbMatch.name,
                            weight: bbMatch.weight,
                            brand: bbMatch.brand,
                            available: bbMatch.available,
                            count: bbSelected[0].count
                        };
                        cartSummary.bigbasket.total += bbMatch.price * bbSelected[0].count;
                        cartSummary.bigbasket.items_found += 1;
                    } else {
                        cartSummary.bigbasket.items_not_found += 1;
                    }
                } else {
                    results[item.ingredient].bigbasket = {
                        price: 0,
                        product_name: 'Not found',
                        weight: 'N/A',
                        available: false,
                        count: 0
                    };
                }

                // Process Zepto results
                if (zeptoSelected) {
                    const zeptoMatch = zeptoProducts.find(p => 
                        String(p.product_id) === String(zeptoSelected[0].product_id)
                    );

                    if (zeptoMatch) {
                        results[item.ingredient].zepto = {
                            price: zeptoMatch.price,
                            product_name: zeptoMatch.name,
                            weight: zeptoMatch.unit,
                            brand: zeptoMatch.brand,
                            available: true,
                            count: zeptoSelected[0].count
                        };
                        cartSummary.zepto.total += zeptoMatch.price * zeptoSelected[0].count;
                        cartSummary.zepto.items_found += 1;
                    } else {
                        cartSummary.zepto.items_not_found += 1;
                    }
                } else {
                    results[item.ingredient].zepto = {
                        price: 0,
                        product_name: 'Not found',
                        weight: 'N/A',
                        available: false,
                        count: 0
                    };
                }

                // Process Blinkit results
                if (blinkitSelected) {
                    const blinkitMatch = blinkitProducts[item.ingredient].find(p => 
                        String(p.product_id) === String(blinkitSelected[0].product_id)
                    );

                    if (blinkitMatch) {
                        results[item.ingredient].blinkit = {
                            price: blinkitMatch.price,
                            product_name: blinkitMatch.name,
                            weight: blinkitMatch.unit,
                            brand: blinkitMatch.brand,
                            available: true,
                            count: blinkitSelected[0].count
                        };
                        cartSummary.blinkit.total += blinkitMatch.price * blinkitSelected[0].count;
                        cartSummary.blinkit.items_found += 1;
                    } else {
                        cartSummary.blinkit.items_not_found += 1;
                    }
                } else {
                    results[item.ingredient].blinkit = {
                        price: 0,
                        product_name: 'Not found',
                        weight: 'N/A',
                        available: false,
                        count: 0
                    };
                }

                // Process Licious results
                if (liciousSelected) {
                    const liciousMatch = liciousProducts.products.find(p => 
                        String(p.product_id) === String(liciousSelected[0].product_id)
                    );

                    if (liciousMatch) {
                        results[item.ingredient].licious = {
                            price: liciousMatch.price,
                            product_name: liciousMatch.name,
                            weight: liciousMatch.weight,
                            brand: liciousMatch.brand,
                            available: liciousMatch.available,
                            count: liciousSelected[0].count
                        };
                        cartSummary.licious.total += liciousMatch.price * liciousSelected[0].count;
                        cartSummary.licious.items_found += 1;
                    } else {
                        cartSummary.licious.items_not_found += 1;
                    }
                } else {
                    results[item.ingredient].licious = {
                        price: 0,
                        product_name: 'Not found',
                        weight: 'N/A',
                        available: false,
                        count: 0
                    };
                }

            } catch (error) {
                console.error(`Error processing ${item.ingredient}:`, error);
            }
        }));

        return {
            products: results,
            cart_summary: cartSummary
        };

    } catch (error) {
        console.error('Cart processing error:', error);
        throw error;
    }
} 
