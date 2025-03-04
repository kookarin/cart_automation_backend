import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

// Types for Licious API responses
interface LiciusProduct {
    hubId: number;
    variantId: string;
    merchandiseName: string;
    documentType: string;
    basePrice: number;
    discountedPrice: number;
    discountPercentage: number;
    primaryTag: {
        name: string;
    };
    havingAssociations: boolean;
    nextAvailableBy: string;
    deliveryType: string;
    weightAndPieces: {
        netWeight: string;
        grossWeight: string;
        pieces: string;
        uom: string;
        serves: string;
        productWeight: string;
        unit: string;
        displayWeight: {
            value: string;
        };
        detailedNetWeight: {
            value: string;
        };
        detailedGrossWeight: {
            value: string;
        };
    };
    isCombo: number;
    productDescriptors: {
        description: string;
        shortDescription: string;
        uspDescription: string;
        productShortname: string;
        slug: string;
    };
    media: {
        prImage: string;
        thumbnail: string;
        images: string[];
    };
    variantVisible: boolean;
    hsnNumber: string;
    pricingMessaging: boolean;
    pricingId: string;
    pricingMessagingData: {
        label: string | null;
        labelColor: string;
        subText: string;
        subTextColor: string;
        price: number;
        priceColor: string;
        priceBackgroundColor: string;
        mrp: number;
        comparisonEnabled: boolean;
        priceDiscount: number;
        priceDiscountColor: string;
        regularPrice: number;
        regularPriceDiscount: number;
    };
    icon: string;
    variantCategoryDetails: Array<{
        treeId: string;
        treeName: string;
        treeType: string;
        categories: Array<{
            id: string;
            name: string;
            level: number;
            parentId: number | null;
        }>;
    }>;
}

interface LiciusResponse {
    data: {
        page: number;
        size: number;
        message: string;
        status: string;
        totalCount: number;
        products: LiciusProduct[];
    };
}

export interface TransformedProduct {
    product_id: string;
    name: string;
    brand: string;
    weight: string;
    unit: string;
    price: number;
    mrp: number;
    discount: number;
    available: boolean;
    pack_desc?: string;
}

// API options
const options: RequestInit = {
    method: 'GET',
    headers: {
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        dnt: '1',
        priority: 'u=1, i',
        referer: 'https://www.licious.in/search',
        'sec-ch-ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'x-nextjs-data': '1',
        'x-requested-with': 'XMLHttpRequest'
    }
};

// Helper function to get daily log file path
function getDailyLogPath(type: 'response' | 'incremental') {
    const date = format(new Date(), 'yyyy-MM-dd');
    const logDir = path.join(__dirname, '..', 'logs');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    return path.join(logDir, `licius_${type}_${date}.txt`);
}

// Helper function to append to daily log
function appendToLog(type: 'response' | 'incremental', content: string) {
    const logPath = getDailyLogPath(type);
    const timestamp = format(new Date(), 'HH:mm:ss');
    const logEntry = `\n[${timestamp}] ${content}\n${'-'.repeat(80)}\n`;

    fs.appendFileSync(logPath, logEntry);
}

// Helper function to extract product details
function extractProductDetails(product: LiciusProduct): TransformedProduct {
    const mrp = parseFloat(product.pricingMessagingData?.mrp?.toString() || '0');
    const price = parseFloat(product.discountedPrice?.toString() || '0');
    const discount = mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;

    // Check availability based on nextAvailableBy
    const isAvailable = product.nextAvailableBy !== null && product.nextAvailableBy !== '';

    return {
        product_id: product.variantId,
        name: product.merchandiseName,
        brand: product.primaryTag?.name || '',
        unit: product.weightAndPieces?.unit || '',
        mrp: mrp,
        price: price,
        discount: Math.round(discount),
        weight: product.weightAndPieces?.netWeight || '',
        available: isAvailable,
        pack_desc: product.productDescriptors?.description || ''
    };
}

// Main search function
export async function searchForItemL(query: string, cookie: string): Promise<{ products: TransformedProduct[] }> {
    const buildId = '67a0519130d1c40017b464de';
    const url = `https://www.licious.in/api/search?query=${encodeURIComponent(query)}&pageNum=0&hubId=4&kmlId=${buildId}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Cookie: cookie
            }
        });

        const responseBody = await response.text();
        console.log('Response body:', responseBody);

        // Log the response
        appendToLog('response', responseBody);

        const data = JSON.parse(responseBody) as LiciusResponse;
        const productsData = data?.data?.products;

        if (!productsData || !Array.isArray(productsData)) {
            console.error(`No products found for item: ${query}`);
            return { products: [] };
        }

        const allProducts: TransformedProduct[] = [];

        // Process main products
        for (const product of productsData) {
            allProducts.push(extractProductDetails(product));
        }

        return { products: allProducts };
    } catch (error) {
        console.error('Search error:', error);
        appendToLog('response', `Error searching for ${query}: ${error}`);
        return { products: [] };
    }
}

// Function to get product incremental info
export async function getProductIncrementalL(productId: string, ingredient: string, cookie: string): Promise<any> {
    const url = 'https://www.licious.in/api/cart/update';

    try {
        const headers = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'origin': 'https://www.licious.in',
            'priority': 'u=1, i',
            'referer': 'https://www.licious.in',
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'serverside': 'false',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'x-csrf-token': '',
            'Cookie': cookie
        };

        const body = JSON.stringify({
            product_id: productId,
            quantity: 1,
            lat: 12.967864,
            lng: 77.65403
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseBody = await response.text();
        appendToLog('incremental', responseBody);

        return JSON.parse(responseBody);
    } catch (error) {
        console.error('Cart update error:', error);
        appendToLog('incremental', `Error updating cart for product ${productId}: ${error}`);
        return null;
    }
}
