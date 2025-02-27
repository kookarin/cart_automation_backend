import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

// Add stealth plugin
puppeteer.use(StealthPlugin());

interface Product {
    product_id: string;
    name: string;
    brand: string;
    unit: string;
    mrp: number;
    price: number;
    discount: number;
}

interface BlinkitResponse {
    products: Product[];
}

interface AllResults {
    [key: string]: Product[];
}

const groceryItems: string[] = [
    "eggoz eggs",
    "amul milk",
    "bread",
    "rice",
    "dal"
    // Add more items as needed
];

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const allResults: AllResults = {};

    await page.goto('https://blinkit.com', { waitUntil: 'networkidle2' });
    
    for (const item of groceryItems) {
        console.log(`Searching for: ${item}`);
        const response = await page.evaluate(async (query: string): Promise<BlinkitResponse> => {
            const res = await fetch(
                `https://blinkit.com/v6/search/products?start=0&size=5&search_type=7&q=${encodeURIComponent(query)}`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'lat': "28.474679",
                        'lon': "77.1048978",
                        'Cookie':'gr_1_deviceId=6cb0ce9b-938e-475a-9a8f-764b0b0030c9; city=Banji; __cfruid=0d04a506ef3e9e5664bd1700e28d6772c0baa983-1740562361; _cfuvid=XFCoETpvBEaKL3aQGLwEj3H9LU6ZCMwLBe1IGc618U0-1740562361576-0.0.1.1-604800000; gr_1_lat=28.474679; gr_1_lon=77.1048978; gr_1_locality=Gurugram; gr_1_accessToken=v2%3A%3Af29a64bc-a998-42cc-8913-761d1c0ca11a; gr_1_landmark=undefined; __cf_bm=RNxMyC6NhsjJXSAT4llhqJ9lCSvn2rMtIbeD8FLiHYE-1740638342-1.0.1.1-RHTUgi5v2ylwsYCKhuiiT1N9BgAAOti6Si7zuYfq3h6J.ix51KwqZ0lSRpCOz0ilUOJsT79laMldkL20JcHeag'
                    }
                }
            );

            return await res.json();
        }, item);

        const products = response.products;
        const parsedProducts: Product[] = products.map(product => ({
            product_id: product.product_id,
            name: product.name,
            brand: product.brand,
            unit: product.unit,
            mrp: product.mrp,
            price: product.price,
            discount: product.discount
        }));

        allResults[item] = parsedProducts;
    }

    fs.writeFileSync('blinkit_response2.json', JSON.stringify(allResults, null, 2));
    console.log('All search results saved to blinkit_response_list.json');
    await browser.close();
})();
