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

export async function compareProductPrices(
    houseId: string,
    cart: CartItem[]
): Promise<ComparisonResult> {
    const results: ComparisonResult = {};

    for (const item of cart) {
        try {
            // Extract quantity and unit from "required quantity"
            const [quantity, unit] = item["required quantity"].split(" ");
            
            // Get cookies for all platforms
            const swiggyData = await getCookieForHouse(houseId, 'Swiggy');
            const bbData = await getCookieForHouse(houseId, 'Bigbasket');
            const zeptoData = await getCookieForHouse(houseId, 'Zepto');
            const blinkitData = await getCookieForHouse(houseId, 'Blinkit');
            const liciousData = await getCookieForHouse(houseId, 'Licious');
            
            // Add type assertion for Zepto data
            const data = zeptoData[0] as { cookie: any; store_id: any; store_ids: any };
            const liciousInfo = liciousData[0] as { cookie: any; buildId: any };
            
            // Search on all platforms
            const swiggyProducts = await searchSwiggyInstamart(item.ingredient, swiggyData[0].cookie);
            const bbProducts = await searchForItem(item.ingredient, bbData[0].cookie);
            const zeptoRawProducts = await searchProduct(
                item.ingredient, 
                data.cookie,
                data.store_id, 
                data.store_ids
            );
            const blinkitProducts = await searchBlinkit(item.ingredient, blinkitData[0].cookie);
            const liciousProducts = await searchForItemL(item.ingredient, liciousInfo.cookie, liciousInfo.buildId);

            const zeptoProducts = transformProducts(zeptoRawProducts, item.ingredient)[item.ingredient];

            results[item.ingredient] = {};

            // Process Swiggy results
            try {
                const swiggySelected = await selectOptimalProductsSwiggy(
                    swiggyProducts.products,
                    { 
                        quantity: parseFloat(quantity), 
                        unit: unit,
                        preferences: item.preference ? [item.preference] : []
                    },
                    item.ingredient
                );

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
                }
            } catch (error) {
                console.error(`Error processing Swiggy for ${item.ingredient}:`, error);
                results[item.ingredient].swiggy = {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                };
            }

            // Process BigBasket results
            try {
                const bbSelected = await selectOptimalProductsBB(
                    bbProducts.products,
                    { 
                        quantity: parseFloat(quantity), 
                        unit: unit,
                        preferences: item.preference ? [item.preference] : []
                    },
                    item.ingredient
                );

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
                }
            } catch (error) {
                console.error(`Error processing BigBasket for ${item.ingredient}:`, error);
                results[item.ingredient].bigbasket = {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                };
            }

            // Process Zepto results
            try {
                const zeptoSelected = await selectZeptoProducts(
                    zeptoProducts,
                    item.ingredient,
                    parseFloat(quantity),
                    unit
                );

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
                }
            } catch (error) {
                console.error(`Error processing Zepto for ${item.ingredient}:`, error);
                results[item.ingredient].zepto = {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                };
            }

            // Process Blinkit results
            try {
                const blinkitSelected = await selectBlinkitProducts(
                    blinkitProducts[item.ingredient],
                    item.ingredient,
                    parseFloat(quantity),
                    unit
                );

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
                }
            } catch (error) {
                console.error(`Error processing Blinkit for ${item.ingredient}:`, error);
                results[item.ingredient].blinkit = {
                    price: 0,
                    product_name: 'Not found',
                    weight: 'N/A',
                    available: false,
                    count: 0
                };
            }

            // Process Licious results
            try {
                const liciousSelected = await selectOptimalProductsLicious(
                    liciousProducts.products.map(p => ({
                        ...p,
                        pack_desc: p.pack_desc || ''  // Ensure pack_desc is always a string
                    })),
                    { 
                        quantity: parseFloat(quantity), 
                        unit: unit,
                        preferences: item.preference ? [item.preference] : []
                    },
                    item.ingredient
                );

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
                }
            } catch (error) {
                console.error(`Error processing Licious for ${item.ingredient}:`, error);
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

    return results;
} 