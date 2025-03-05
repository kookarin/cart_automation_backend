import { Browser, Page } from 'puppeteer';

let page: Page;

export async function initializeSwiggyInstamart(browser: Browser): Promise<void> {
    console.log('Initializing Swiggy Instamart page...');
    page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
    
    // Set cookies
    await page.setCookie(
        { name: 'deviceId', value: 's%3Aa351a972-fbcc-45b2-9487-d1bd6ceca0ee.hnSUtxlB2I7jGCyPBasv%2F7dzgsWfA42PIzEFj1ddRPs', domain: '.swiggy.com' },
        { name: 'sid', value: 's%3Aj5t35a39-14df-435c-9cd4-c421f92ff275.jlQswYw4ekNTgKiVdhy0Yctkf9x%2Fj3PUNsjXmU83tyM', domain: '.swiggy.com' },
        { name: 'versionCode', value: '1200', domain: '.swiggy.com' },
        { name: 'platform', value: 'web', domain: '.swiggy.com' },
        { name: 'subplatform', value: 'dweb', domain: '.swiggy.com' },
        { name: '_device_id', value: '442ec368-6c57-7407-55dd-b98986e67f57', domain: '.swiggy.com' },
        { name: '_sid', value: 'j5t2e928-5f1f-4f93-a17b-3b93165b824e', domain: '.swiggy.com' },
        { name: '_is_logged_in', value: '1', domain: '.swiggy.com' }
    );
    
    // Navigate to Swiggy Instamart homepage to initialize session
    await page.goto('https://www.swiggy.com/instamart', { waitUntil: 'networkidle2' });
    console.log('Swiggy Instamart page initialized');
}

export interface SwiggyProduct {
    itemId: string;                 // product_id from the response
    name: string;               // display_name
    brand: string;              // brand or empty
    weight: string;             // quantity from variations
    mrp: number;                // mrp from price
    price: number;              // offer_price from price
    discount: string;           // offer_applied.listing_description
    image: string;              // first image from images array
    available: boolean;         // in_stock
    storeId: string;            // store_id
    productId: string;          // product_id
    variationId: string;        // id from variations
    spin: string;               // spin from variations
    offer_price: number;        // offer_price from price
    description: string;        // meta.short_description
    max_quantity: number;       // max_allowed_quantity
    category: string;           // category
    sub_category: string;       // sub_category
    pack_desc: string;  // Added this field
}

export async function searchSwiggyInstamart(query: string, cookie: string): Promise<{ products: SwiggyProduct[] }> {
    console.log(`Searching Swiggy Instamart for: ${query}`);
    
    try {
        const payload = {
            "facets": {},
            "sortAttribute": ""
        };
        
        const url = `https://www.swiggy.com/api/instamart/search?pageNumber=0&searchResultsOffset=0&limit=40&query=${encodeURIComponent(query)}&ageConsent=false&layoutId=2671&pageType=INSTAMART_SEARCH_PAGE&isPreSearchTag=false&highConfidencePageNo=0&lowConfidencePageNo=0&voiceSearchTrackingId=&storeId=&primaryStoreId=&secondaryStoreId=`;
        
        const options = {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.7',
                'content-type': 'application/json',
                'matcher': '9daeg8eb7cedfg989be79c7',
                'origin': 'https://www.swiggy.com',
                'referer': `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(query)}`,
                'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                'x-build-version': '2.255.0',
                'Cookie': cookie
            },
            body: JSON.stringify(payload)
        };
        
        const response = await fetch(url, options);
        const responseData = await response.json();
        
        // Extract products from the response
        const products: SwiggyProduct[] = [];
        
        // Navigate through the response structure to find products
        if (responseData.data && responseData.data.widgets) {
            // Find the product list widget
            const productWidget = responseData.data.widgets.find((widget: any) => 
                widget.widgetInfo && widget.widgetInfo.widgetType === "PRODUCT_LIST"
            );
            
            if (productWidget && productWidget.data && Array.isArray(productWidget.data)) {
                productWidget.data.forEach((item: any) => {
                    if (item.variations && item.variations.length > 0) {
                        // Iterate through all variations
                        item.variations.forEach((variation: any) => {
                            const price = variation.price || {};
                            const inventory = variation.inventory || {};
                            const meta = variation.meta || {};
                            
                            // Get discount text from offer_applied if available
                            const discountText = price.offer_applied ? price.offer_applied.listing_description : '';
                            
                            // Get first image URL if available
                            const imageId = variation.images && variation.images.length > 0 ? variation.images[0] : '';
                            
                            products.push({
                                itemId: variation.id || '',
                                name: item.display_name || '',
                                brand: variation.brand || '',
                                weight: variation.quantity || '',
                                mrp: price.mrp || 0,
                                price: price.offer_price || price.store_price || 0,
                                discount: discountText,
                                image: imageId ? `https://cdn.instamart-assets.com/${imageId}` : '',
                                available: inventory.in_stock === true,
                                storeId: variation.store_id || '',
                                productId: item.product_id || '',
                                variationId: variation.id || '',
                                spin: variation.spin || '',
                                offer_price: price.offer_price || 0,
                                description: meta.short_description || '',
                                max_quantity: variation.max_allowed_quantity || 1,
                                category: item.category || '',
                                sub_category: item.sub_category || '',
                                pack_desc: variation.sku_secondary_quantity || ''
                            });
                        });
                    }
                });
            }
        }
        
        console.log(`Found ${products.length} products for "${query}" on Swiggy Instamart`);
        return { products };
        
    } catch (error) {
        console.error('Swiggy Instamart search error:', error);
        throw error;
    }
}

const PREFERRED_ADDRESS_ID = 'ct5v1s034kcq8g0j46ig';

interface SwiggyCartItem {
    quantity: number;
    itemId: string;
    productId: string;
    spin: string;
    meta: {
        type: string;
        storeId: number;
    };
    serviceLine: string;
}

interface SwiggyCartRequest {
    data: {
        items: SwiggyCartItem[];
        cartMetaData: {
            contactlessDelivery: boolean;
            deliveryType: string;
            owner: string;
            preferredAddressId: string;
            ageConsentProvided: boolean;
            useGiftBagPackaging: boolean;
            useReusablePackaging: boolean;
            includeConsents: string[];
            incognitoCart: boolean;
            primaryStoreId: string;
            storeIds: number[];
        };
        cartType: string;
    };
    source: string;
}

interface CartItem {
    itemId: string;
    productId: string;
    quantity: number;
    spin: string;
    storeId: number;
}

export async function addToSwiggyCart(items: CartItem[], cookie: string): Promise<any> {
    const url = 'https://www.swiggy.com/api/instamart/checkout/v2/cart?pageType=INSTAMART_SEARCH';
    
    const cartRequest: SwiggyCartRequest = {
        data: {
            items: items.map(item => ({
                quantity: item.quantity,
                itemId: item.itemId,
                productId: item.productId,
                spin: item.spin,
                meta: {
                    type: "structure",
                    storeId: item.storeId
                },
                serviceLine: "INSTAMART"
            })),
            cartMetaData: {
                contactlessDelivery: false,
                deliveryType: "INSTANT",
                owner: "APP",
                preferredAddressId: PREFERRED_ADDRESS_ID,
                ageConsentProvided: false,
                useGiftBagPackaging: false,
                useReusablePackaging: false,
                includeConsents: ["PHARMA"],
                incognitoCart: false,
                primaryStoreId: "",
                storeIds: []
            },
            cartType: "INSTAMART"
        },
        source: "userInitiated"
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9',
                'content-type': 'application/json',
                'matcher': 'e7d9b8eb7ggeegae9cfedge',
                'origin': 'https://www.swiggy.com',
                'referer': 'https://www.swiggy.com/instamart/search?custom_back=true&query=',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
                'x-build-version': '2.257.0',
                'Cookie': cookie
            },
            body: JSON.stringify(cartRequest),
            credentials: 'include'
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding to Swiggy cart:', error);
        throw error;
    }
}
