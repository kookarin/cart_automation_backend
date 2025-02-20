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

export const searchBlinkit = async (query: string): Promise<Product[]> => {
    if (!page) {
        throw new Error('Blinkit page not initialized');
    }

    const response = await page.evaluate(async (searchQuery: string): Promise<BlinkitResponse> => {
        const res = await fetch(
            `https://blinkit.com/v6/search/products?start=0&size=5&search_type=7&q=${encodeURIComponent(searchQuery)}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'lat': "28.5821195",
                    'lon': "77.3266991"
                }
            }
        );
        return await res.json();
    }, query);

    return response.products.map(product => ({
        product_id: product.product_id,
        name: product.name,
        brand: product.brand,
        unit: product.unit,
        mrp: product.mrp,
        price: product.price,
        discount: product.discount
    }));
}; 