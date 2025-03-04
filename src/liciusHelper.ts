import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

// Types for Licius API responses


interface LiciusProduct {
    id: string;
    desc: string;
    brand?: {
        name: string;
    };
    category?: {
        tlc_name: string;
        mlc_name: string;
        llc_name: string;
    };
    pricing?: {
        discount?: {
            mrp: string;
            prim_price?: {
                sp: string;
            };
            d_text?: string;
        };
    };
    w?: string;
    unit?: string;
    pack_desc?: string;
    images?: Array<{
        s: string;
        m: string;
        l: string;
    }>;
    rating_info?: {
        avg_rating: string;
        rating_count: string;
        review_count: string;
    };
    additional_attr?: {
        info?: Array<{
            label: string;
        }>;
    };
    availability?: {
        avail_status: string;
        not_for_sale: boolean;
    };
    children?: LiciusProduct[];
}

interface LiciusResponse {
    pageProps?: {
        SSRData?: {
            tabs?: Array<{
                product_info?: {
                    products: LiciusProduct[];
                };
            }>;
        };
    };
}

interface ProductDetails {
    id: string;
    name: string;
    brand: string;
    category: {
        main: string;
        sub: string;
        leaf: string;
    };
    price: {
        mrp: number;
        selling_price: number;
        discount_text: string;
    };
    weight: string;
    unit: string;
    images: Array<{
        small: string;
        medium: string;
        large: string;
    }>;
    rating: {
        average: number;
        count: number;
        reviews: number;
    };
    food_type: string;
    availability: {
        status: string;
        in_stock: boolean;
    };
    pack_desc?: string;
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
        // cookie: 'csurftoken=AHCRdQ.NTk5NDgzMjAxOTcyMjc0MTU4.1739868984906.hMhyxX9AK%2F9zV%2F0qoUcOFwWsz2sF3DOp%2BcyT%2BKzYYo0%3D',
        accept: '*/*',
        'accept-language': 'en-US,en;q=0.9',
        dnt: '1',
        priority: 'u=1, i',
        referer: 'https://www.licius.com/',
        'sec-ch-ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'x-nextjs-data': '1',
        Cookie: 'source=website; _ga=GA1.2.1001321514.1741007380; _gid=GA1.2.176572073.1741007380; WZRK_G=1ade362725624288a534072001d356cf; ajs_anonymous_id=fc97a147-7a97-4a97-b668-9829405a99f4; location=eyJjaXBoZXJ0ZXh0IjoiaDRvaUdYUm9rUjhpaEs4cWovejE3MDBKbkNYbERZRE0wTmZYL2xJaFQ2VzRnZW85WmpaWlJ1cy9oandrNHpuSGhFcGpxcDhSbmNRN1dzTVY1K2dReG9zNTMrelpzOUtUYTVnWGpZSGJFUXJaSlliOFN5NjdneGM5ZExTUUJTdDdtZGFDL0g2M2JtMG1neTlQS1dhWUtWdVZBZUZHVzJlREtreWJTZlZsR29McTI0WDNMellvbmdMT1VWbGRiVzVFZVpRYnFobWoyajFvaVcwU1pTMFpnMzJIMVRCWEcvZ2F4clRtblJLS3lMbEFncC8xTEZmWnZGbGNSNE9tUTY5ckNhRXhVc1BYcnNWa29DZDFmQ2hPRWFOTC9YamVVN2VtajBDNGowTXBISDlYN3BVM3UzNkowR3IwNHpTZjBDb3c0RGRpQkNRdk01b0Zhamw2Rkx5K2I5SVpVNnpSdnB5dTdSNGsvc0plY1pxbzZPaFJPZUhFSW9Vd0pFWmVmYVVrIiwiaXYiOiIxNTQ1M2EwMmQ2Y2UwNjRiZTBhM2ZmZWU1Y2RhYWYyYiIsInNhbHQiOiIzNGM1MTE5ZTc2Zjc2OGVlYTJjMDIyMjJhMTUwYzljMGNmODY1MTI5NTdlZjdkNDViNjQ0ZTkwMDkyOTlkNWFlOWQ3NGJiOTBmNDE4YWZmZmM4ZGY1M2Q3YjIxNDg2Y2I0NmIxZWJmNjAzNTZmN2RmNzc1MGZlYTdmMzljYjdlNTkwNTkxZTMyODdhZWEwMGM4OTM5MmFmZTY0NzliMGJkMDcxYmNhMDgzZTQ1ZTUyOTVmNDI4ZjZiYjVlOWViOTM4ODgxNDA5OWQ5YmNjMzRlY2EyM2M2MTFjMTJjM2Q4ZGI3NDU2NmE0YWZiMGU5ZWMxNGU0NGUwNDI4MmY1NGU5NmY0MDhhZmRlOThlM2RiZjdmYWNlZjlkZDUzNzFhYjM3ODJjNWUwNTU1ODEyNTM2MTExZDgwYzRkOTc2YzJhNDBhYjI2OGI5MDlmMDlhNmY4NjBiMjVkYWEyMmVhOTdiN2JhZTg3YjZlMjM1N2M0OGUxZGMxNzg0NjJjM2Q2NWYxNTVhODliYmMyYTc4NWRiYTdmNjFhOGFlMGY1YzM1MzcwNWQ5YzVmYzlmZDZhNTczMTExM2VlMzkxZWJmMTQ0N2VmM2YxZWIyYjcyMzY5MGJiMTkyODAyZmJlYTVkYzZhN2U0MTQyYWIzMWI4ZjVmNzJmNzQxN2M4ZDQ2ZDQ2ZSIsIml0ZXJhdGlvbnMiOjk5OX0=; _gat=1; WZRK_S_445-488-5W5Z=%7B%22p%22%3A2%2C%22s%22%3A1741065692%2C%22t%22%3A1741067171%7D; nxt=eyJjaXBoZXJ0ZXh0IjoiQm85d2hUOFZRSWw4UHc5WVlCblNMUVZNeWUwVFFubWp0d0ZCMU1RRE1HWDBDYzg1dUpKeFFaYWN0a3BIbXpjTCIsIml2IjoiY2IyNDg3MzI0ZjkwNDBjZDJkNTM1ZDBlNjZmYTQ1YTQiLCJzYWx0IjoiYzM5MzdjMDc5NjA4MjA5NTMzYmU1ZWY2Nzg4YmNlYWU5YjIyNzQ5NjM5NDQwNWVhZjZkMjc3MzE3ZjNhNjU4NThkNjE2OWI0ZTliOTU2ZGM4MWY5MTJmM2U4ZmYxODAyZDg0Y2FhNmM3ZGExZjhiNmQ5NjZlZTYwZjYyY2VjYTZkYTkwZTY2MzZkNjQwYmFiOTUyOTA2YTY3MmIyMTMyMWMxYzEwODViZDliNDk0Njk1MDYwYmM0ZjI0NmMyNzc0YzhiOThiMGFlMjBlYzRjNmViZjA1YzkwZjE2Y2MxNzFiOWIyNjYwMzc2YTIyYmE3NTUyOTMwYjExODI3MGY4YTY5OTBmZjY1NDg0ZGVlYThhMjhiMTg5OTM5NjQ5OGQzMmFkMjI1YWVjZTI5YjhmZWI4YTg2MjRkZWIzZDZkNTg5NGUyMTA5Mzc0ZTM2NzVmNzE2MGQyY2IxOTI4OTIzM2UxOTk1ZGU1MzQ5NGE3ZDZiZGQ3YTA2ZGQ0ZDlmMmY5ZDAyNGI3YzYyOGY3M2U3NWIwNDY4ZDdmN2NhZDVhNDQ1NTM1ZTg2NmNhYTNkYTIyMTQ1MjI2Njc1M2IyNjBiNjFmYzVjMjlmMmRjMzg4ZmMzYTM4MDY3MzBmNWMzZjk3NTRjMmFiYTMyZDczZDFkOWViODZiNWJjMmM4NmI1MmQiLCJpdGVyYXRpb25zIjo5OTl9'
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
    const mrp = parseFloat(product.pricing?.discount?.mrp || '0');
    const price = parseFloat(product.pricing?.discount?.prim_price?.sp || '0');
    const discount = mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;

    // Check availability based on avail_status
    const isAvailable = product.availability?.avail_status === '001';

    return {
        product_id: product.id,
        name: product.desc,
        brand: product.brand?.name || '',
        unit: product.unit || '',
        mrp: mrp,
        price: price,
        discount: Math.round(discount),
        weight: product.w || '',
        available: isAvailable,
        pack_desc: product.pack_desc || ''
    };
}

// Main search function
// export async function searchForItem(query: string, cookie: string): Promise<{ products: TransformedProduct[] }> {
export async function searchForItemL(query: string): Promise<{ products: TransformedProduct[] }> {
    const url = `https://www.licius.com/_next/data/T1_PlDhBy6SbtGTQKc6Kd/search.json?q=${encodeURIComponent(query)}&nc=as&listing=ps`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Cookie: cookie
            }
        });
        const responseBody = await response.text();

        // Log the response
        appendToLog('response', responseBody);

        const data = JSON.parse(responseBody) as LiciusResponse;

        const productsData = data?.pageProps?.SSRData?.tabs?.[0]?.product_info?.products;

        if (!productsData || !Array.isArray(productsData)) {
            console.error(`No products found for item: ${query}`);
            return { products: [] };
        }

        const allProducts: TransformedProduct[] = [];

        // Process main products
        for (const product of productsData) {
            allProducts.push(extractProductDetails(product));

            // Process children products if they exist
            if (product.children && Array.isArray(product.children)) {
                for (const childProduct of product.children) {
                    allProducts.push(extractProductDetails(childProduct));
                }
            }
        }

        return { products: allProducts };
    } catch (error) {
        // Log the error
        appendToLog('response', `Error searching for ${query}: ${error}`);
        return { products: [] };
    }
}


export async function getProductIncrementalL(productId: number, ingredient: string, cookie: string): Promise<any> {
    const url = 'https://www.licius.com/mapi/v3.5.2/c-incr-i/';

    const body = JSON.stringify({
        "prod_id": productId,
        "_bb_client_type": "web",
        "first_atb": 0,
        "term": ingredient,
        "term_source": "ps"
    });

    const postOptions: RequestInit = {
        ...options,  // Spread existing options (headers etc.)
        method: 'POST',
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString(),
            Cookie: cookie
        },
        body
    };

    try {
        const response = await fetch(url, postOptions);
        const responseBody = await response.text();

        // Log the response
        appendToLog('incremental', responseBody);

        return JSON.parse(responseBody);
    } catch (error) {
        // Log the error
        appendToLog('incremental', `Error getting incremental info for product ${productId}: ${error}`);
        return null;
    }
}
