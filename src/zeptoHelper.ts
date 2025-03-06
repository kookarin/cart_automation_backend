import { Response } from 'node-fetch';
import fs from 'fs';

import path from 'path'

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
    userSessionId: string;
    mode: string;
}

interface ProductVariant {
    mrp: number;
    formattedPacksize: string;
    id: string;
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
    discountedSellingPrice: number;
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

export async function searchProduct(query: string, cookie: string, store_id: string, store_ids: string): Promise<ProductItem[]> {
    logger.info(`Initiating search for query: "${query}"`);
    const url = 'https://api.zepto.com/api/v3/search';
    const payload: SearchPayload = {
        query: query,
        pageNumber: 0,
        intentId: '2322ecc7-97b8-4ddf-84b5-e21fbda09a07',
        userSessionId:'402c043c-4c47-471a-94db-300482abf112',
        mode: 'AUTOSUGGEST'
    };

    const options = {
        method: 'POST',
        headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            app_sub_platform: 'WEB',
            app_version: '12.53.1',
            appversion: '12.53.1',
            auth_revamp_flow: 'v2',
            compatible_components:
                'CONVENIENCE_FEE,RAIN_FEE,EXTERNAL_COUPONS,STANDSTILL,BUNDLE,MULTI_SELLER_ENABLED,PIP_V1,ROLLUPS,SCHEDULED_DELIVERY,SAMPLING_ENABLED,ETA_NORMAL_WITH_149_DELIVERY,ETA_NORMAL_WITH_199_DELIVERY,HOMEPAGE_V2,NEW_ETA_BANNER,VERTICAL_FEED_PRODUCT_GRID,AUTOSUGGESTION_PAGE_ENABLED,AUTOSUGGESTION_PIP,AUTOSUGGESTION_AD_PIP,BOTTOM_NAV_FULL_ICON,COUPON_WIDGET_CART_REVAMP,DELIVERY_UPSELLING_WIDGET,MARKETPLACE_CATEGORY_GRID,NO_PLATFORM_CHECK_ENABLED_V2,SUPER_SAVER:1,SUPERSTORE_V1,PROMO_CASH:0,24X7_ENABLED_V1,TABBED_CAROUSEL_V2,HP_V4_FEED,NEW_ROLLUPS_ENABLED,RERANKING_QCL_RELATED_PRODUCTS,PLP_ON_SEARCH,PAAN_BANNER_WIDGETIZED,ROLLUPS_UOM,DYNAMIC_FILTERS,PHARMA_ENABLED,AUTOSUGGESTION_RECIPE_PIP,SEARCH_FILTERS_V1,QUERY_DESCRIPTION_WIDGET,MEDS_WITH_SIMILAR_SALT_WIDGET,NEW_FEE_STRUCTURE,NEW_BILL_INFO,RE_PROMISE_ETA_ORDER_SCREEN_ENABLED,SUPERSTORE_V1,MANUALLY_APPLIED_DELIVERY_FEE_RECEIVABLE,MARKETPLACE_REPLACEMENT,ZEPTO_PASS,ZEPTO_PASS:1,ZEPTO_PASS:2,ZEPTO_PASS_RENEWAL,CART_REDESIGN_ENABLED,SHIPMENT_WIDGETIZATION_ENABLED,TABBED_CAROUSEL_V2,24X7_ENABLED_V1,PROMO_CASH:0,HOMEPAGE_V2,SUPER_SAVER:1,NO_PLATFORM_CHECK_ENABLED_V2,HP_V4_FEED,',
            'content-type': 'application/json',
            device_id: 'c0b1e9b3-816f-46b3-b970-83815af4171e',
            deviceid: 'c0b1e9b3-816f-46b3-b970-83815af4171e',
            dnt: '1',
            marketplace_type: 'ZEPTO_NOW',
            origin: 'https://www.zepto.com',
            platform: 'WEB',
            priority: 'u=1, i',
            referer: 'https://www.zepto.com/',
            request_id: '48d6cdf3-7b0a-413b-a411-e476208f7668',
            requestid: '48d6cdf3-7b0a-413b-a411-e476208f7668',
            'sec-ch-ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            session_id: '27c1c1c2-2aac-4d3e-9981-04942cddb736',
            sessionid: '27c1c1c2-2aac-4d3e-9981-04942cddb736',
            store_etas: '{"6d49da9f-b749-4a7e-9b1b-928847d021fc":7,"1f606e33-cc6a-46ae-95d7-21bb5a401d7a":20}',
            store_id: store_id,
            store_ids: store_ids,
            storeid: store_id,
            tenant: 'ZEPTO',
            cookie: cookie,
            'user-agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'x-without-bearer': 'true',
            'x-xsrf-token':
                '_YQVywEMgslFZ76vs3XYr:9BuqpFfIzz67kV9mW13WxfP0NNI.xqY2s1o8dZLu1mOP06bWCouicJ+uRPS+pVCMKXKWnVI'
        },
        body: JSON.stringify(payload)
    };

    try {
        const res = await fetch(url, options);
        const responseBody = await res.text();
        const searchResult: SearchResult = JSON.parse(responseBody);
        
        // Extract products directly using the logic from getFirstFiveProducts
        const allProducts: ProductItem[] = [];
        searchResult?.layout?.forEach((widget) => {
            if (widget.widgetId === "PRODUCT_GRID") {
                const items = widget?.data?.resolver?.data?.items || [];
                allProducts.push(...items);
            }
        });
        
        return allProducts;
    } catch (error) {
        logger.error(`Error fetching query "${query}":`, error);
        return [];
    }
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
            const price = item.productResponse.discountedSellingPrice || item.productResponse.sellingPrice;
            const discount = item.productResponse.discountPercent;
            return {
                product_id: variant.id,
                name: product.name,
                brand: product.brand,
                unit: variant.formattedPacksize,
                mrp: mrp / 100,
                price: price / 100,
                discount: discount
            };
        })
    };
}