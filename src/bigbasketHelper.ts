import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

// Types for BigBasket API responses


interface BigBasketProduct {
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
    children?: BigBasketProduct[];
}

interface BigBasketResponse {
    pageProps?: {
        SSRData?: {
            tabs?: Array<{
                product_info?: {
                    products: BigBasketProduct[];
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
        referer: 'https://www.bigbasket.com/',
        'sec-ch-ua': '"Chromium";v="133", "Not(A:Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'x-nextjs-data': '1',
        // Cookie: 'x-entry-context-id=100; x-entry-context=bb-b2c; _bb_locSrc=default; _bb_bhid=; _bb_nhid=1723; _bb_vid=NTA4MDQ2NjgzOTE3MzcxMTE4; _bb_dsevid=; _bb_dsid=; csrftoken=Xsxr9IMbcU3uLB9qBmrdKVBrATpTXPdJHM5jJZxzD6yfUx0JqG9Pr6Bi3Xrlv6wL; _bb_home_cache=2e20737e.1.visitor; _bb_bb2.0=1; _bb_addressinfo=; _bb_pin_code=; _is_tobacco_enabled=0; _is_bb1.0_supported=0; bb2_enabled=true; jarvis-id=5fbf6931-8f29-427d-9154-ae6efe26d2a9; _bb_tc=0; _bb_rdt="MzEwNTE1NjUwMA==.0"; BBAUTHTOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaGFmZiI6IjFpUzdCQmx4RXN6SHNRIiwidGltZSI6MTc0MDY1MzM3NC4yNTI4NDQ2LCJtaWQiOjYyMDAwNDU5LCJ2aWQiOjUwODA0NjY4NTcyNTExNjkyOCwiZGV2aWNlX2lkIjoiV0VCIiwic291cmNlX2lkIjoxLCJlY19saXN0IjpbMyw0LDEwLDEyLDEzLDE0LDE1LDE2LDE3LDIwLDEwMF0sIlRETFRPS0VOIjoiOWM4NDY3OWUtMjdkZC00OTg3LWI2MDItZWM0NGIzMDVlYjk4IiwicmVmcmVzaF90b2tlbiI6ImZkY2RkYmY5LTZjNzYtNGZlZi1hNDJjLWE2NWZjNzA1ZjMxNCIsInRkbF9leHBpcnkiOjE3NDEyNTgxNzMsImV4cCI6MTc1NjQzMzM3NCwiaXNfc2FlIjpudWxsLCJkZXZpY2VfbW9kZWwiOiJXRUIiLCJkZXZpY2VfaXNfZGVidWciOiJmYWxzZSJ9.WSLumVk_1mZ1GsdAlH3_WbEFGp4wOdbTGmbPcHO3CWc; _bb_mid="MzA5NDQ3OTI2OQ=="; customer_hash=f32d8e707e69a540340998dba032321e; sessionid=32z0oi3cl7oi9urwsmm4wud8x2eib9u3; access_token=9c84679e-27dd-4987-b602-ec44b305eb98; is_global=0; is_integrated_sa=1; _bb_visaddr=; _bb_rd=1; csurftoken=dX3rrA.NTA4MDQ2NjgzOTE3MzcxMTE4.1740722899043.Hlolgwyn5TeTC3T5QEoeBXFSBXqf+TwRAR6VnapDEes=; _bb_cda_sa_info=djIuY2RhX3NhLjEwMC4xNTAwOSwxNTExMQ==; PWA=1; x-channel=web; _bb_sa_ids=15009%2C15111; _bb_cid=18; _bb_aid="Mjg0NDY4MDM4Mg=="; ts=2025-02-28%2011:45:19.335'
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
    
    return path.join(logDir, `bigbasket_${type}_${date}.txt`);
}

// Helper function to append to daily log
function appendToLog(type: 'response' | 'incremental', content: string) {
    const logPath = getDailyLogPath(type);
    const timestamp = format(new Date(), 'HH:mm:ss');
    const logEntry = `\n[${timestamp}] ${content}\n${'-'.repeat(80)}\n`;
    
    fs.appendFileSync(logPath, logEntry);
}

// Helper function to extract product details
function extractProductDetails(product: BigBasketProduct): TransformedProduct {
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
export async function searchForItem(query: string, cookie: string): Promise<{ products: TransformedProduct[] }> {
    const url = `https://www.bigbasket.com/_next/data/cn6n8UImd8SJt5t_wj2Jd/ps.json?q=${encodeURIComponent(query)}&nc=as&listing=ps`;

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
        
        const data = JSON.parse(responseBody) as BigBasketResponse;

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


export async function getProductIncremental(productId: number, ingredient: string, cookie: string): Promise<any> {
    const url = 'https://www.bigbasket.com/mapi/v3.5.2/c-incr-i/';
    
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
