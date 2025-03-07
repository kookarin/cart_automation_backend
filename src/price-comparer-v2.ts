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

export async function compareProductPrices(
    houseId: string,
    cart: CartItem[]
): Promise<ComparisonResultWithSummary> {
    const results: ComparisonResult = {};
    const cartSummary: CartSummary = {
        swiggy: { total: 0, items_found: 0, items_not_found: 0 },
        bigbasket: { total: 0, items_found: 0, items_not_found: 0 },
        zepto: { total: 0, items_found: 0, items_not_found: 0 },
        blinkit: { total: 0, items_found: 0, items_not_found: 0 },
        licious: { total: 0, items_found: 0, items_not_found: 0 }
    };

    for (const item of cart) {
        try {
            const [quantity, unit] = item["required quantity"].split(" ");
            
            // Get all cookies in parallel
            const [swiggyData, bbData, zeptoData, blinkitData, liciousData] = await Promise.all([
                getCookieForHouse(houseId, 'Swiggy'),
                getCookieForHouse(houseId, 'Bigbasket'),
                getCookieForHouse(houseId, 'Zepto'),
                getCookieForHouse(houseId, 'Blinkit'),
                getCookieForHouse(houseId, 'Licious')
            ]);

            const data = zeptoData[0] as { cookie: any; store_id: any; store_ids: any };
            const liciousInfo = liciousData[0] as { cookie: any; buildId: any };

            // Get all products in parallel
            const [swiggyProducts, bbProducts, zeptoRawProducts, blinkitProducts, liciousProducts] = await Promise.all([
                searchSwiggyInstamart(item.ingredient, swiggyData[0].cookie),
                searchForItem(item.ingredient, bbData[0].cookie),
                searchProduct(item.ingredient, data.cookie, data.store_id, data.store_ids),
                searchBlinkit(item.ingredient, blinkitData[0].cookie),
                searchForItemL(item.ingredient, liciousInfo.cookie, liciousInfo.buildId)
            ]);

            const zeptoProducts = transformProducts(zeptoRawProducts, item.ingredient)[item.ingredient];
            results[item.ingredient] = {};

            // Run all AI selections in parallel
            const [
                swiggySelected,
                bbSelected,
                zeptoSelected,
                blinkitSelected,
                liciousSelected
            ] = await Promise.all([
                selectOptimalProductsSwiggy(
                    swiggyProducts.products,
                    { quantity: parseFloat(quantity), unit, preferences: item.preference ? [item.preference] : [] },
                    item.ingredient
                ).catch(() => null),
                selectOptimalProductsBB(
                    bbProducts.products,
                    { quantity: parseFloat(quantity), unit, preferences: item.preference ? [item.preference] : [] },
                    item.ingredient
                ).catch(() => null),
                selectZeptoProducts(
                    zeptoProducts,
                    item.ingredient,
                    parseFloat(quantity),
                    unit
                ).catch(() => null),
                selectBlinkitProducts(
                    blinkitProducts[item.ingredient],
                    item.ingredient,
                    parseFloat(quantity),
                    unit
                ).catch(() => null),
                selectOptimalProductsLicious(
                    liciousProducts.products.map(p => ({ ...p, pack_desc: p.pack_desc || '' })),
                    { quantity: parseFloat(quantity), unit, preferences: item.preference ? [item.preference] : [] },
                    item.ingredient
                ).catch(() => null)
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
            console.error(`Error comparing prices for ${item.ingredient}:`, error);
            results[item.ingredient] = {
                swiggy: {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                },
                bigbasket: {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                },
                zepto: {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                },
                blinkit: {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                },
                licious: {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                }
            };
        }
    }

    return {
        products: results,
        cart_summary: cartSummary
    };
} 