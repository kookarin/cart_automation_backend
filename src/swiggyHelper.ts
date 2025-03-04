import { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

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

export async function searchSwiggyInstamart(query: string): Promise<{ products: SwiggyProduct[] }> {
    console.log(`Searching Swiggy Instamart for: ${query}`);
    
    try {
        // Create the search payload
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
                'cookie': 'deviceId=s%3Aa351a972-fbcc-45b2-9487-d1bd6ceca0ee.hnSUtxlB2I7jGCyPBasv%2F7dzgsWfA42PIzEFj1ddRPs; versionCode=1200; platform=web; subplatform=dweb; statusBarHeight=0; bottomOffset=0; genieTrackOn=false; isNative=false; openIMHP=false; webBottomBarHeight=0; __SW=rdxIhEvTBxK3-pr58inPmOasl1Xmr7Ae; _device_id=442ec368-6c57-7407-55dd-b98986e67f57; fontsLoaded=1; _session_tid=39d96b82b9cced499d9074eeac4f9a5d7e15c0b65bc08686e3062e7914cb8db4996419f6e3e8159fd265d84ac2bd2bb3240583d2eb48645e861fb5458e9169e2927a688d381d09f3ddfa0c8dd1bca985a77551122e1ebd7d8a372a9b0252c22a23997eb8df2aef9818737f411ce56319; tid=s%3Ab4020439-da67-42d3-a655-c429b3f4757f.nYWc2QeyygvESMETmrVJD2fW6k5v39smgT0xYCgXdZg; _gcl_au=1.1.649254934.1740635682; _fbp=fb.1.1740635682668.78083628547925276; sid=s%3Aj92b6915-37ad-45f0-89a1-089be8c76b61.tEEESgR10Ql2eVh%2BUH0RPb9dQy5yBcDSUcPaP7VmeEc; ally-on=false; strId=; LocSrc=s%3AswgyUL.Dzm1rLPIhJmB3Tl2Xs6141hVZS0ofGP7LGmLXgQOA7Y; _is_logged_in=1; _sid=j92b6915-37ad-45f0-89a1-089be8c76b61; _gid=GA1.2.1821582278.1740992889; _ga_34JYJ0BCRN=GS1.1.1740995292.4.1.1740998368.0.0.0; _ga=GA1.1.1787195995.1740635683; lat=s%3A28.4591987.2NLRv5dEHzj8P7ZGcpM4WYp%2FPzRdkAk%2B0UEXm1BrfZ8; lng=s%3A77.0844826.zVsMnHIxZOpUy51UEPmVDd763v6k7f9zDEz4oBeempM; address=s%3A1038%2C3rd%20Floor%2C%20Block%20C%2C%20Sushant%20Lok%20Phase%20I%2C%20Sect.HDKDHc%2B3k09qLxjl8g89x9Bt6rRy3S6X%2FkVFFy6zYBc; addressId=s%3Act5v1s034kcq8g0j46ig.Hp4NKUmA804ddb1n2zonmVB8euwk4BM3acja0%2FYDEIg; userLocation=%7B%22address%22%3A%221038%2C3rd%20Floor%2C%20Block%20C%2C%20Sushant%20Lok%20Phase%20I%2C%20Sector%2043%2C%20Gurugram%2C%20Haryana%20122022%2C%20India%22%2C%22lat%22%3A28.4591987%2C%22lng%22%3A77.0844826%2C%22id%22%3A%22ct5v1s034kcq8g0j46ig%22%2C%22annotation%22%3A%22Chintan%20Flat%22%2C%22name%22%3A%22Chintan%20Chawla%22%7D; imOrderAttribution={%22entryId%22:%22tomato%22%2C%22entryName%22:%22instamartOpenSearch%22}; _ga_0XZC5MS97H=GS1.1.1740992883.3.1.1741000179.0.0.0; _ga_8N8XRG907L=GS1.1.1740992883.3.1.1741000179.0.0.0'
            },
            body: JSON.stringify(payload)
        };
        
        const response = await fetch(url, options);
        const responseText = await response.text();
        
        // Log the response
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logDir = path.join(__dirname, '..', 'logs');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
        
        const logFile = path.join(logDir, `swiggy_search_${timestamp}.json`);
        fs.writeFileSync(logFile, responseText);
        console.log(`Swiggy search response for "${query}" written to ${logFile}`);
        
        // Parse the response
        const responseData = JSON.parse(responseText);
        
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
                        item.variations.forEach((variation: any, index: number) => {
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

export async function addToSwiggyCart(items: CartItem[]): Promise<any> {
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
                'Cookie':'deviceId=s%3Aa351a972-fbcc-45b2-9487-d1bd6ceca0ee.hnSUtxlB2I7jGCyPBasv%2F7dzgsWfA42PIzEFj1ddRPs; versionCode=1200; platform=web; subplatform=dweb; statusBarHeight=0; bottomOffset=0; genieTrackOn=false; isNative=false; openIMHP=false; webBottomBarHeight=0; __SW=rdxIhEvTBxK3-pr58inPmOasl1Xmr7Ae; _device_id=442ec368-6c57-7407-55dd-b98986e67f57; fontsLoaded=1; _session_tid=39d96b82b9cced499d9074eeac4f9a5d7e15c0b65bc08686e3062e7914cb8db4996419f6e3e8159fd265d84ac2bd2bb3240583d2eb48645e861fb5458e9169e2927a688d381d09f3ddfa0c8dd1bca985a77551122e1ebd7d8a372a9b0252c22a23997eb8df2aef9818737f411ce56319; tid=s%3Ab4020439-da67-42d3-a655-c429b3f4757f.nYWc2QeyygvESMETmrVJD2fW6k5v39smgT0xYCgXdZg; _gcl_au=1.1.649254934.1740635682; _fbp=fb.1.1740635682668.78083628547925276; sid=s%3Aj92b6915-37ad-45f0-89a1-089be8c76b61.tEEESgR10Ql2eVh%2BUH0RPb9dQy5yBcDSUcPaP7VmeEc; ally-on=false; strId=; LocSrc=s%3AswgyUL.Dzm1rLPIhJmB3Tl2Xs6141hVZS0ofGP7LGmLXgQOA7Y; _is_logged_in=1; _sid=j92b6915-37ad-45f0-89a1-089be8c76b61; _gid=GA1.2.1821582278.1740992889; _ga_34JYJ0BCRN=GS1.1.1740995292.4.1.1740998368.0.0.0; _ga=GA1.1.1787195995.1740635683; lat=s%3A28.4591987.2NLRv5dEHzj8P7ZGcpM4WYp%2FPzRdkAk%2B0UEXm1BrfZ8; lng=s%3A77.0844826.zVsMnHIxZOpUy51UEPmVDd763v6k7f9zDEz4oBeempM; address=s%3A1038%2C3rd%20Floor%2C%20Block%20C%2C%20Sushant%20Lok%20Phase%20I%2C%20Sect.HDKDHc%2B3k09qLxjl8g89x9Bt6rRy3S6X%2FkVFFy6zYBc; addressId=s%3Act5v1s034kcq8g0j46ig.Hp4NKUmA804ddb1n2zonmVB8euwk4BM3acja0%2FYDEIg; userLocation=%7B%22address%22%3A%221038%2C3rd%20Floor%2C%20Block%20C%2C%20Sushant%20Lok%20Phase%20I%2C%20Sector%2043%2C%20Gurugram%2C%20Haryana%20122022%2C%20India%22%2C%22lat%22%3A28.4591987%2C%22lng%22%3A77.0844826%2C%22id%22%3A%22ct5v1s034kcq8g0j46ig%22%2C%22annotation%22%3A%22Chintan%20Flat%22%2C%22name%22%3A%22Chintan%20Chawla%22%7D; imOrderAttribution={%22entryId%22:%22tomato%22%2C%22entryName%22:%22instamartOpenSearch%22}; _ga_0XZC5MS97H=GS1.1.1740992883.3.1.1741000179.0.0.0; _ga_8N8XRG907L=GS1.1.1740992883.3.1.1741000179.0.0.0'
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
