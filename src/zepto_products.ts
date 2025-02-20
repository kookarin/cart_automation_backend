import { Response } from 'node-fetch';
import fs from 'fs';

interface Logger {
    info: (msg: string, ...args: any[]) => void;
    debug: (msg: string, ...args: any[]) => void;
    warn: (msg: string, ...args: any[]) => void;
    error: (msg: string, ...args: any[]) => void;
}

const logger: Logger = {
    info: (msg, ...args) =>
        console.info(`[INFO] ${new Date().toISOString()} - ${msg}`, ...args),
    debug: (msg, ...args) =>
        console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, ...args),
    warn: (msg, ...args) =>
        console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...args),
    error: (msg, ...args) =>
        console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, ...args)
};

interface SearchPayload {
    query: string;
    pageNumber: number;
    intentId: string;
    mode: string;
}

interface ProductVariant {
    mrp: number;
    formattedPacksize: string;
}

interface Product {
    id: string;
    name: string;
    brand: string;
}

interface ProductResponse {
    product: Product;
    productVariant: ProductVariant;
    sellingPrice: number;
    discountPercent: number;
}

interface ProductItem {
    productResponse: ProductResponse;
}

interface SearchResult {
    layout?: Array<{
        widgetId: string;
        data?: {
            resolver?: {
                data?: {
                    items?: ProductItem[];
                };
            };
        };
    }>;
}

export async function searchProduct(query: string): Promise<SearchResult> {
    logger.info(`Initiating search for query: "${query}"`);
    const url = 'https://api.zepto.com/api/v3/search';
    const payload: SearchPayload = {
        query: query,
        pageNumber: 0,
        intentId: '3b277ff8-f5e6-4ad5-9e01-4ac6cb629206',
        mode: 'AUTOSUGGEST'
    };

    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            app_sub_platform: 'WEB',
            app_version: '12.49.2',
            appversion: '12.49.2',
            auth_revamp_flow: 'v2',
            compatible_components:
                'CONVENIENCE_FEE,RAIN_FEE,EXTERNAL_COUPONS,STANDSTILL,BUNDLE,MULTI_SELLER_ENABLED,PIP_V1,ROLLUPS,SCHEDULED_DELIVERY,SAMPLING_ENABLED,ETA_NORMAL_WITH_149_DELIVERY,ETA_NORMAL_WITH_199_DELIVERY,HOMEPAGE_V2,NEW_ETA_BANNER,VERTICAL_FEED_PRODUCT_GRID,AUTOSUGGESTION_PAGE_ENABLED,AUTOSUGGESTION_PIP,AUTOSUGGESTION_AD_PIP,BOTTOM_NAV_FULL_ICON,COUPON_WIDGET_CART_REVAMP,DELIVERY_UPSELLING_WIDGET,MARKETPLACE_CATEGORY_GRID,NO_PLATFORM_CHECK_ENABLED_V2,SUPER_SAVER:1,SUPERSTORE_V1,PROMO_CASH:0,24X7_ENABLED_V1,TABBED_CAROUSEL_V2,HP_V4_FEED,NEW_ROLLUPS_ENABLED,RERANKING_QCL_RELATED_PRODUCTS,PLP_ON_SEARCH,PAAN_BANNER_WIDGETIZED,ROLLUPS_UOM,DYNAMIC_FILTERS,PHARMA_ENABLED,AUTOSUGGESTION_RECIPE_PIP,SEARCH_FILTERS_V1,QUERY_DESCRIPTION_WIDGET,MEDS_WITH_SIMILAR_SALT_WIDGET,NEW_FEE_STRUCTURE,NEW_BILL_INFO,RE_PROMISE_ETA_ORDER_SCREEN_ENABLED,SUPERSTORE_V1,MANUALLY_APPLIED_DELIVERY_FEE_RECEIVABLE,MARKETPLACE_REPLACEMENT,ZEPTO_PASS,ZEPTO_PASS:1,ZEPTO_PASS:2,ZEPTO_PASS_RENEWAL,CART_REDESIGN_ENABLED,SHIPMENT_WIDGETIZATION_ENABLED,TABBED_CAROUSEL_V2,24X7_ENABLED_V1,PROMO_CASH:0,HOMEPAGE_V2,SUPER_SAVER:1,NO_PLATFORM_CHECK_ENABLED_V2,HP_V4_FEED,',
            'content-type': 'application/json',
            device_id: '2d6df047-9421-4d9e-b748-f78290c73bd1',
            deviceid: '2d6df047-9421-4d9e-b748-f78290c73bd1',
            dnt: '1',
            marketplace_type: 'undefined',
            origin: 'https://www.zepto.com',
            platform: 'WEB',
            priority: 'u=1, i',
            referer: 'https://www.zepto.com/',
            request_id: '9fe622b7-12ea-438d-9ad4-e1751738eefa',
            requestid: '9fe622b7-12ea-438d-9ad4-e1751738eefa',
            'sec-ch-ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            session_id: 'ffde3a0f-8c32-4686-9480-a30da2ec16dd',
            sessionid: 'ffde3a0f-8c32-4686-9480-a30da2ec16dd',
            store_etas: '{"fa5e892d-65d7-4da6-9bde-e1f22deb7b6f":-1}',
            store_id: 'fa5e892d-65d7-4da6-9bde-e1f22deb7b6f',
            store_ids: 'fa5e892d-65d7-4da6-9bde-e1f22deb7b6f',
            storeid: 'fa5e892d-65d7-4da6-9bde-e1f22deb7b6f',
            tenant: 'ZEPTO',
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'x-without-bearer': 'true',
            'x-xsrf-token':
                'jMxOukYo19tn3-1tO3Auv:7AUKsW_tnrn0JU7U8mq2ztV9NGQ.OjIQc+5ifSZw4Yl5HhUicHZcxFFW/z4ippLTiJtdnao'
        },
        body: JSON.stringify(payload)
    };

    try {
        const res = await fetch(url, options);
        return await res.json();
    } catch (error) {
        logger.error(`Error fetching query "${query}":`, error);
        return {};
    }
}

export function getFirstFiveProducts(searchResult: SearchResult): ProductItem[] {
    const allProducts: ProductItem[] = [];
    searchResult?.layout?.forEach((widget) => {
        if (widget.widgetId === "PRODUCT_GRID") {
            const items = widget?.data?.resolver?.data?.items || [];
            allProducts.push(...items);
        }
    });
    return allProducts.slice(0, 5);
}

interface TransformedProduct {
    product_id: string;
    name: string;
    brand: string;
    unit: string;
    mrp: number;
    price: number;
    discount: number;
}

export function transformProducts(products: ProductItem[], itemName: string): { [key: string]: TransformedProduct[] } {
    return {
        [itemName]: products.map(item => {
            const product = item.productResponse.product;
            const variant = item.productResponse.productVariant;
            const mrp = variant.mrp;
            const price = item.productResponse.sellingPrice;
            const discount = item.productResponse.discountPercent;
            return {
                product_id: product.id,
                name: product.name,
                brand: product.brand,
                unit: variant.formattedPacksize,
                mrp: mrp,
                price: price,
                discount: discount
            };
        })
    };
}

export async function collectGroceryProducts(groceryList: string[]): Promise<{ [key: string]: TransformedProduct[] }> {
    const results: { [key: string]: TransformedProduct[] } = {};
    
    for (const item of groceryList) {
        logger.info(`Processing item: ${item}`);
        const searchResult = await searchProduct(item);
        const topFiveProducts = getFirstFiveProducts(searchResult);
        const transformedProducts = transformProducts(topFiveProducts, item);
        Object.assign(results, transformedProducts);
    }
    
    return results;
} 