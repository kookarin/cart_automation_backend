import { Browser, Page } from 'puppeteer';

export interface Product {
    product_id: string;
    name: string;
    brand: string;
    unit: string;
    mrp: number;
    price: number;
    discount: number;
}

export interface BlinkitResponse {
    products: Product[];
}

let page: Page | null = null;

export const initializeBlinkit = async (browser: Browser) => {
    if (!page) {
        page = await browser.newPage();
        await page.goto('https://blinkit.com', { waitUntil: 'networkidle2' });
    }
};

function extractCoordinates(cookie: string) {
    const latMatch = cookie.match(/gr_1_lat=([^;]+)/);
    const lonMatch = cookie.match(/gr_1_lon=([^;]+)/);
    console.log({
        lat: latMatch ? latMatch[1] : '',
        lon: lonMatch ? lonMatch[1] : ''
    });
    
    return {
        lat: latMatch ? latMatch[1] : '',
        lon: lonMatch ? lonMatch[1] : ''
    };
}

export const searchBlinkit = async (query: string,cookie: string): Promise<{ [key: string]: Product[] }> => {

    const { lat, lon } = extractCoordinates(cookie);
    if (!page) {
        throw new Error('Blinkit page not initialized');
    }

    const response = await page.evaluate(async (searchQuery: string,latitude: string, longitude: string,cookie: string): Promise<BlinkitResponse> => {
        const res = await fetch(
            `https://blinkit.com/v6/search/products?start=0&size=20&search_type=7&q=${encodeURIComponent(searchQuery)}`,
            {
                method: 'GET',
                headers: {
                    'accept': '*/*',
                    'access_token': 'v2::f29a64bc-a998-42cc-8913-761d1c0ca11a',
                    'app_client': 'consumer_web',
                    'app_version': '1010101010',
                    'auth_key': 'c761ec3633c22afad934fb17a66385c1c06c5472b4898b866b7306186d0bb477',
                    'content-type': 'application/json',
                    'device_id': '6cb0ce9b-938e-475a-9a8f-764b0b0030c9',
                    'lat': latitude,
                    'lon': longitude,
                    'Cookie':cookie,
                    'priority': 'u=1, i'
                }
            }
        );
        return await res.json();
    }, query,lat,lon,cookie);
    return {
        [query]: response.products.map(product => ({
            product_id: product.product_id,
            name: product.name,
            brand: product.brand,
            unit: product.unit,
            mrp: product.mrp,
            price: product.price,
            discount: product.discount
        }))
    };
}; 