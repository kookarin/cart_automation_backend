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
            store_id: '6d49da9f-b749-4a7e-9b1b-928847d021fc',
            store_ids: '6d49da9f-b749-4a7e-9b1b-928847d021fc,1f606e33-cc6a-46ae-95d7-21bb5a401d7a',
            storeid: '6d49da9f-b749-4a7e-9b1b-928847d021fc',
            cookie: 'accessToken=eyJhbGciOiJIUzUxMiJ9.eyJ2ZXJzaW9uIjoxLCJzdWIiOiI5ZDEyNDU4ZS0xZjEyLTRjNmEtYTJjYi03YTQyOWU0ZDU2NDIiLCJpYXQiOjE3Mzk0NDA0NTUsImV4cCI6MTczOTUyNjg1NX0.hyJPwIdXjnYW7UviFkYlBuhKc6lpqluhg0CP0K1BAqodgEjdnGgtCu0OLRxCAJ19eds4HjRxcGuYNgFh3T8R5Q; refreshToken=4ea04c68-812a-4e6a-ae11-cd186108b804; isAuth=true; _gcl_au=1.1.1727679324.1740474409; _ga=GA1.1.1570995358.1740474409; _fbp=fb.1.1740474409011.10991024835911229; _ga_37QQVCR1ZS=GS1.1.1740475370.1.1.1740476377.60.0.0; mp_dcc8757645c1c32f4481b555710c7039_mixpanel=%7B%22distinct_id%22%3A%20%22%24device%3A1953c5bdf67791-0cef9db166034f-26011a51-144000-1953c5bdf67791%22%2C%22%24device_id%22%3A%20%221953c5bdf67791-0cef9db166034f-26011a51-144000-1953c5bdf67791%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%7D; _ga_52LKG2B3L1=GS1.1.1740479261.2.1.1740479887.24.0.758258932',
            tenant: 'ZEPTO',
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
        
        // Write response to a file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(__dirname, '..', 'logs', `zepto_response_${timestamp}.txt`);
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'logs'));
        }
        
        fs.writeFileSync(filename, responseBody);
        logger.info(`Zepto response for "${query}" written to ${filename}`);
        
        // Parse the response text back to JSON
        return JSON.parse(responseBody);
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
    // return allProducts.slice(0, 5);
    return allProducts;
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
                mrp: mrp / 100,
                price: price / 100,
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