import { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

let page: Page;

export async function initializeBlinkitCart(browser: Browser): Promise<void> {
    console.log('Initializing Blinkit cart page...');
    page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36');
    
    // Set cookies
    await page.setCookie(
        { name: 'city', value: 'Banji', domain: '.blinkit.com' },
        { name: '__cfruid', value: '0d04a506ef3e9e5664bd1700e28d6772c0baa983-1740562361', domain: '.blinkit.com' },
        { name: '_cfuvid', value: 'XFCoETpvBEaKL3aQGLwEj3H9LU6ZCMwLBe1IGc618U0-1740562361576-0.0.1.1-604800000', domain: '.blinkit.com' },
        { name: '__cf_bm', value: 'erMe4fwInOOVL6hL7G5wVwb382ow4273MpWyf5E00LY-1740568307-1.0.1.1-n5AmPDO85oFfIClDd_E9v5pKeoDrpaUBZfQS92EXCIu68.rtmphk9ZFw.uSFu1VzKJgjyinIKER1u0RX83m56A', domain: '.blinkit.com' }
    );
    
    // Navigate to Blinkit homepage to initialize session
    await page.goto('https://blinkit.com/', { waitUntil: 'networkidle2' });
    console.log('Blinkit cart page initialized');
}

interface AddToCartParams {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    mrp: number;
}

export async function addToBlinkitCart(params: AddToCartParams): Promise<any> {
    if (!page) {
        throw new Error('Blinkit cart page not initialized');
    }
    
    console.log(`Adding product to Blinkit cart: ${params.productName} (ID: ${params.productId})`);
    
    try {
        // Create the event payload
        const timestamp = Math.floor(Date.now() / 1000);
        const sessionId = "5fd4d063-7a41-47db-9237-abdec5badb19"; // In a real app, you'd generate or maintain this
        const deviceId = "6cb0ce9b-938e-475a-9a8f-764b0b0030c9";  // In a real app, you'd generate or maintain this
        
        const payload = {
            "app_payload": [{
                "header": {
                    "location": 0,
                    "timestamp": timestamp,
                    "session_id": sessionId,
                    "device_id": deviceId
                },
                "payload": {
                    "key": "blinkit_web_events",
                    "value": {
                        "event_name": "Product Added",
                        "properties": {
                            "widget_id": params.productId,
                            "widget_name": "Product",
                            "widget_title": params.productName,
                            "brand": "",
                            "cta_type": "",
                            "currency": "INR",
                            "inventory": 10,
                            "l0_category": "#-NA",
                            "l1_category": "#-NA",
                            "l2_category": "#-NA",
                            "mrp": params.mrp,
                            "name": params.productName,
                            "price": params.price,
                            "product_id": params.productId,
                            "product_position": "2",
                            "quantity": params.quantity,
                            "reason": "keyterm|match|potato,sales data,text match",
                            "state": "available",
                            "widget_position": 2,
                            "widget_variation_id": "global_search_results",
                            "event_name": "Product Clicked",
                            "merchant_id": 30782,
                            "merchant_type": "Express",
                            "page_name": "search",
                            "page_id": "search_layout",
                            "page_visit_id": "7781c534-89b3-4048-b19c-c61bb724fff9",
                            "entity_type": "",
                            "filters_present": "",
                            "page_type": "Global Search",
                            "search_actual_keyword": params.productName.toLowerCase(),
                            "search_input_keyword": params.productName.toLowerCase(),
                            "search_keyword_image": "",
                            "search_keyword_parent": "type_to_search",
                            "search_keyword_type": "type_to_search",
                            "search_previous_keyword": "",
                            "search_result_count": "12",
                            "lifetime_orders": 37,
                            "device_platform": "desktop_web"
                        },
                        "traits": {
                            "device_uuid": deviceId,
                            "session_uuid": sessionId,
                            "install_source": "#-NA",
                            "install_campaign": "#-NA",
                            "install_medium": "#-NA",
                            "phone": null,
                            "cart_id": null,
                            "rn_bundle_version": "9.3.12",
                            "platform": "mobile_web",
                            "merchant_id": 30782,
                            "merchant_name": null,
                            "city_id": 1849,
                            "city_name": "HR-NCR",
                            "chain_id": 1383,
                            "min_order": null,
                            "delivery_type": null,
                            "segment_type": ["zenma_auto","kids_cohort","new_potential"],
                            "user_type": "ACTIVE",
                            "lifetime_orders": 37,
                            "monthly_orders": 5,
                            "user_experiment_buckets": ["RANDOM#bucket1","INCREASING_ROLLOUT#bucket1"],
                            "latitude": 28.474679,
                            "longitude": 77.1048978,
                            "user_id": 25018461,
                            "is_default_merchant": false
                        },
                        "source_deeplink": null
                    },
                    "url": `https://blinkit.com/s/?q=${encodeURIComponent(params.productName.toLowerCase())}`
                }
            }]
        };
        
        // Make the request using Puppeteer
        const response = await page.evaluate(async (payloadData) => {
            const res = await fetch('https://jumbo.blinkit.com/event', {
                method: 'POST',
                headers: {
                    'accept': '*/*',
                    'accept-language': 'en-US,en;q=0.7',
                    'content-type': 'text/plain;charset=UTF-8',
                    'origin': 'https://blinkit.com',
                    'referer': 'https://blinkit.com/',
                    'sec-ch-ua': '"Not(A:Brand";v="99", "Brave";v="133", "Chromium";v="133"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'no-cors',
                    'sec-fetch-site': 'same-site',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
                },
                body: JSON.stringify(payloadData)
            });
            
            try {
                return await res.text();
            } catch (e) {
                return "No response body (expected for no-cors)";
            }
        }, payload);
        
        // Log the response
        const timestamp_str = new Date().toISOString().replace(/[:.]/g, '-');
        const logDir = path.join(__dirname, '..', 'logs');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir);
        }
        
        const logFile = path.join(logDir, `blinkit_cart_${timestamp_str}.json`);
        fs.writeFileSync(logFile, JSON.stringify({
            request: payload,
            response: response
        }, null, 2));
        
        console.log(`Product added to Blinkit cart: ${params.productName}`);
        console.log(`Log saved to: ${logFile}`);
        
        // Now navigate to the cart page to verify the item was added
        await page.goto('https://blinkit.com/cart', { waitUntil: 'networkidle2' });
        
        // Take a screenshot of the cart
        const screenshotPath = path.join(logDir, `blinkit_cart_${timestamp_str}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Cart screenshot saved to: ${screenshotPath}`);
        
        return {
            success: true,
            message: `Product ${params.productName} added to cart`,
            logFile,
            screenshotPath
        };
    } catch (error) {
        console.error('Error adding product to Blinkit cart:', error);
        throw error;
    }
} 