import * as fs from 'fs';
import * as path from 'path';

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
}

// API options
const options: RequestInit = {
    method: 'GET',
    headers: {
        cookie: 'csurftoken=AHCRdQ.NTk5NDgzMjAxOTcyMjc0MTU4.1739868984906.hMhyxX9AK%2F9zV%2F0qoUcOFwWsz2sF3DOp%2BcyT%2BKzYYo0%3D',
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
        Cookie: 'x-entry-context-id=100;x-entry-context=bb-b2c;_bb_locSrc=default;_bb_bhid=;_bb_nhid=1723;_bb_vid=NTg2MjAxMDM3NTIwNzgyMDYy;_bb_dsevid=;_bb_dsid=;csrftoken=nnroTdBnhPO04SV0akrSGKsL2opu5Sk7NlYtPJM7GU3Mk8m8ySOTn6oBDNq5wSEj;_bb_home_cache=7ce5fe69.1.visitor;bb2_enabled=true;bigbasket.com=49571bad-8998-4141-acac-4544391024ed;_bb_mid="MzEzMjEyOTY0NA==";customer_hash=f84e527d0ff68ee7871462f463d17d91;sessionid=uj90c6zde3ze07ll5y95zdlotdw94zhm;BBAUTHTOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaGFmZiI6IjRUWUNNMXF4ZkxZMmVRIiwidGltZSI6MTc0MDM5NTQ5Ni4wNDAwMDk1LCJtaWQiOjI0MTUzNDc0LCJ2aWQiOjU4NjIwMTAzNTI5MzYwOTQ3MiwiZGV2aWNlX2lkIjoiV0VCIiwic291cmNlX2lkIjoxLCJlY19saXN0IjpbMyw0LDEwLDEyLDEzLDE0LDE1LDE2LDE3LDIwLDEwMF0sIlRETFRPS0VOIjoiNjdkZDBlZGMtYmZlOS00OGE3LWE1MzItYzE5N2M2MWZkYTUyIiwicmVmcmVzaF90b2tlbiI6ImQwYWViNTMzLTYxZmItNGUyNC04ODA3LWNmYjJmNjNkNjYwNCIsInRkbF9leHBpcnkiOjE3NDEwMDAyOTUsImV4cCI6MTc1NTE0MTkzMiwiaXNfc2FlIjpudWxsLCJkZXZpY2VfbW9kZWwiOiJXRUIiLCJkZXZpY2VfaXNfZGVidWciOiJmYWxzZSJ9.-BNdcsZZH6TqqcxF8rt7hLGSSD43kwNGfHKur6U_ofU;access_token=67dd0edc-bfe9-48a7-a532-c197c61fda52;jarvis-id=c0a46d40-07f6-4020-8803-86a1f55e490f;PWA=1;_sp_van_encom_hid=1152;_client_version=2822;_bb_hid=7427;_sp_bike_hid=1150;_bb_tc=0;_bb_rdt="MzEwNTI2ODc1MQ==.0";_bb_rd=6;ufi=1;_gcl_au=1.1.1455268102.1740400642;adb=0;_gid=GA1.2.275752233.1740400642;_fbp=fb.1.1740400642344.140082692593866543;x-channel=web;_ga_414F8KRWNG=GS1.1.1740400910.1.1.1740402138.0.0.0;_bb_bb2.0=1;is_global=0;_bb_addressinfo=;_bb_pin_code=;_is_tobacco_enabled=0;_is_bb1.0_supported=0;is_integrated_sa=1;_bb_visaddr=;_bb_cid=1;_bb_lat_long="MTIuOTc4MzQ1OXw3Ny42NDA3ODY2OTk5OTk5OQ==";_bb_aid="Mjk4MzQyODk1OA==";_bb_cda_sa_info=djIuY2RhX3NhLjEwMC4xNDkwOCwxNTEwNA==;csurftoken=81cQPg.NTg2MjAxMDM3NTIwNzgyMDYy.1740461059110.TdQ6/gTcoDfYiPtElQXr/VlbIAQyFE+riMAqieLTjgI=;_ga=GA1.2.2026374620.1740400642;_gat_UA-27455376-1=1;_bb_sa_ids=14908%2C15104;_ga_FRRYG5VKHX=GS1.1.1740459835.3.1.1740461072.18.0.0;ts=2025-02-25%2010: 54: 31.285'
    }
};

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
        available: isAvailable
    };
}

// Main search function
export async function searchForItem(item: string): Promise<{ products: TransformedProduct[] }> {
    const url = `https://www.bigbasket.com/_next/data/OlOtTlO5-yAkkTJCD7_c_/ps.json?q=${encodeURIComponent(item)}&nc=as&listing=ps`;

    try {
        const response = await fetch(url, options);
        const responseBody = await response.text();
        
        // Write response to a file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(__dirname, '..', 'logs', `bigbasket_response_${timestamp}.txt`);
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'logs'));
        }
        
        fs.writeFileSync(filename, responseBody);
        console.log(`Response written to ${filename}`);
        
        const data = JSON.parse(responseBody) as BigBasketResponse;

        const productsData = data?.pageProps?.SSRData?.tabs?.[0]?.product_info?.products;

        if (!productsData || !Array.isArray(productsData)) {
            console.error(`No products found for item: ${item}`);
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
        console.error(`Error processing item "${item}":`, error);
        return { products: [] };
    }
}


export async function getProductIncremental(prodId: number, searchTerm: string): Promise<any> {
    const url = 'https://www.bigbasket.com/mapi/v3.5.2/c-incr-i/';
    
    const body = JSON.stringify({
        "prod_id": prodId,
        "_bb_client_type": "web",
        "first_atb": 0,
        "term": searchTerm,
        "term_source": "ps"
    });

    const postOptions: RequestInit = {
        ...options,  // Spread existing options (headers etc.)
        method: 'POST',
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body).toString()
        },
        body
    };

    try {
        const response = await fetch(url, postOptions);
        const responseBody = await response.text();
        
        // Log response to file (similar to searchForItem)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = path.join(__dirname, '..', 'logs', `bigbasket_incremental_${timestamp}.txt`);
        
        if (!fs.existsSync(path.join(__dirname, '..', 'logs'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'logs'));
        }
        
        fs.writeFileSync(filename, responseBody);
        console.log(`Incremental response written to ${filename}`);
        
        return JSON.parse(responseBody);
    } catch (error) {
        console.error(`Error getting incremental info for product ${prodId}:`, error);
        return null;
    }
}
