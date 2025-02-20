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

interface TransformedProduct {
    product_id: string;
    name: string;
    brand: string;
    unit: string;
    mrp: number;
    price: number;
    discount: number;
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
        Cookie: 'x-entry-context-id=100; x-entry-context=bb-b2c; _bb_locSrc=default; x-channel=web; _bb_bhid=; _bb_nhid=1723; _bb_vid=NTk5NDY2NTIxNzc5MDMyNTU4; _bb_dsevid=; _bb_dsid=; _bb_cid=1; _bb_aid=MzA4NTgxODk5Nw==; csrftoken=bLnqrpWGrXWw1OWMo14HNVQnpGcHsPqzSxGCg3pmwYo5JuMGJuPPZGZfaCd4wOCD; _bb_home_cache=ccc74e3b.1.visitor; _bb_bb2.0=1; is_global=1; _bb_addressinfo=; _bb_pin_code=; _bb_sa_ids=10654; _is_tobacco_enabled=0; _is_bb1.0_supported=0; _bb_cda_sa_info=djIuY2RhX3NhLjEwMC4xMDY1NA==; is_integrated_sa=0; bb2_enabled=true; jarvis-id=544c52e4-d575-416f-be7a-9386174aba5d; csurftoken=oXuTfQ.NTk5NDY2NTIxNzc5MDMyNTU4.1739868944913.1FN2XZCcjYF80434PJfHdJ7nyI+WzKPt1qTX89QWCks=; ts=2025-02-18%2014:25:46.311'
    }
};

// Helper function to extract product details
function extractProductDetails(product: BigBasketProduct): TransformedProduct {
    /*
    return {
        id: product.id,
        name: product.desc,
        brand: product.brand?.name || '',
        category: {
            main: product.category?.tlc_name || '',
            sub: product.category?.mlc_name || '',
            leaf: product.category?.llc_name || ''
        },
        price: {
            mrp: parseFloat(product.pricing?.discount?.mrp || '0'),
            selling_price: parseFloat(product.pricing?.discount?.prim_price?.sp || '0'),
            discount_text: product.pricing?.discount?.d_text || ''
        },
        weight: product.w || '',
        unit: product.unit || '',
        images: product.images?.map(img => ({
            small: img.s,
            medium: img.m,
            large: img.l
        })) || [],
        rating: {
            average: parseFloat(product.rating_info?.avg_rating || '0'),
            count: parseInt(product.rating_info?.rating_count || '0'),
            reviews: parseInt(product.rating_info?.review_count || '0')
        },
        food_type: product.additional_attr?.info?.[0]?.label || '',
        availability: {
            status: product.availability?.avail_status || '',
            in_stock: product.availability?.not_for_sale === false
        }
    };
    */

    const mrp = parseFloat(product.pricing?.discount?.mrp || '0');
    const price = parseFloat(product.pricing?.discount?.prim_price?.sp || '0');
    const discount = mrp > 0 ? ((mrp - price) / mrp) * 100 : 0;

    return {
        product_id: product.id,
        name: product.desc,
        brand: product.brand?.name || '',
        unit: product.unit || '',
        mrp: mrp,
        price: price,
        discount: Math.round(discount)
    };
}

// Main search function
export async function searchForItem(item: string): Promise<{ products: TransformedProduct[] }> {
    const url = `https://www.bigbasket.com/_next/data/OlOtTlO5-yAkkTJCD7_c_/ps.json?q=${encodeURIComponent(item)}&nc=as&listing=ps`;

    try {
        const response = await fetch(url, options);
        const data = await response.json() as BigBasketResponse;

        const productsData = data?.pageProps?.SSRData?.tabs?.[0]?.product_info?.products;

        if (!productsData || !Array.isArray(productsData)) {
            console.error(`No products found for item: ${item}`);
            return { products: [] };
        }

        // Get first 5 products with detailed information
        const products = productsData
            .slice(0, 5)
            .map(product => extractProductDetails(product));

        return { products };
    } catch (error) {
        console.error(`Error processing item "${item}":`, error);
        return { products: [] };
    }
}
