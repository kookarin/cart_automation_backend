import express, { Request, Response } from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { searchProduct, getFirstFiveProducts, transformProducts } from './zepto_products';
import { searchForItem, getProductIncremental } from './bigbasket';
import { initializeBlinkit, searchBlinkit } from './blinkit_products';
import { Browser } from 'puppeteer';
import { selectOptimalProducts } from './ai-product-selector';
import { processCart } from './bb_cart_proccesor';
// import { initializeBlinkitCart, addToBlinkitCart } from './blinkit_cart';
import { searchSwiggyInstamart } from './swiggy_instamart';
import {  getOrderDetails } from './order-details';
import { processCartText } from './text_cart';

// Add stealth plugin
puppeteer.use(StealthPlugin());

const app = express();
const port = 5001;

// Enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());
const houseCookies = require('./config/house-cookies.json') as HouseCookies;

interface HouseCookies {
    [key: string]: {
        cookie: string;
        description: string;
    };
}

let browser: Browser;

// Hello World route
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello, World!' });
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK' });
});

// Search products endpoint
app.get('/zepto/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchResult = await searchProduct(query);
        const topFiveProducts = getFirstFiveProducts(searchResult);
        const transformedProducts = transformProducts(topFiveProducts, query);

        res.json(transformedProducts);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// BigBasket search endpoint
app.get('/bigbasket/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        const cookie = houseCookies[1].cookie;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchResult = await searchForItem(query, cookie);
        res.json(searchResult);
    } catch (error) {
        console.error('BigBasket search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Blinkit search endpoint
app.get('/blinkit/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchResult = await searchBlinkit(query);
        res.json(searchResult);
    } catch (error) {
        console.error('Blinkit search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add this new endpoint
app.get('/bigbasket/api/product-incremental', async (req: Request, res: Response) => {
    try {
        const prodId = Number(req.query.prodId);
        const searchTerm = req.query.term as string;
        const cookie = houseCookies[1].cookie;
        const count = Number(req.query.count) || 1; // Default to 1 if not provided
        
        if (!prodId || !searchTerm) {
            return res.status(400).json({ 
                error: 'Product ID and search term are required' 
            });
        }

        // Array to store all results
        const results = [];
        
        // Make API calls based on count
        for (let i = 0; i < count; i++) {
            const result = await getProductIncremental(prodId, searchTerm, cookie);
            
            if (result) {
                results.push(result);
            }
        }
        
        if (results.length === 0) {
            return res.status(404).json({ 
                error: 'Product information not found' 
            });
        }

        // If count is 1, return single result, otherwise return array
        res.json(count === 1 ? results[0] : results);
    } catch (error) {
        console.error('Product incremental info error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add this new endpoint or update the existing one
app.post('/bigbasket/api/smart-select', async (req: Request, res: Response) => {
    try {
        const { searchTerm, quantity, pricePreference, preferences } = req.body;
        console.log('Smart Select Request:', { searchTerm, quantity, pricePreference, preferences });

        if (!searchTerm || !quantity) {
            console.log('Missing required parameters');
            return res.status(400).json({ 
                error: 'Search term and quantity are required' 
            });
        }

        // First, get all available products
        const cookie = houseCookies[1].cookie;
        console.log('Fetching products from BigBasket for:', searchTerm);
        const { products } = await searchForItem(searchTerm, cookie);
        console.log(`Found ${products.length} total products, ${products.filter(p => p.available).length} available`);

        if (products.length === 0) {
            console.log('No products found in search results');
            return res.status(404).json({ 
                error: 'No products found' 
            });
        }

        // Use AI to select optimal products
        console.log('Requesting AI recommendation...');
        const recommendation = await selectOptimalProducts(
            products, 
            {
                quantity: Number(quantity),
                pricePreference,
                preferences: Array.isArray(preferences) ? preferences : []
            },
            searchTerm
        );
        console.log('AI Recommendation received:', recommendation);

        res.json({
            searchTerm,
            recommendation,
            availableProducts: products.filter(p => p.available).length,
            totalProducts: products.length
        });
    } catch (error) {
        console.error('Smart selection error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Update the process-cart endpoint to use product-incremental API
app.post('/bigbasket/api/process-cart', async (req: Request, res: Response) => {
    try {
        const { house_identifier, cart } = req.body;
        
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({ 
                error: 'Valid cart data is required' 
            });
        }

        const result = await processCart(house_identifier, cart);
        res.json(result);
        
    } catch (error) {
        console.error('Cart processing error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Initialize browser and start server
(async () => {
    try {

        // await initializeBlinkitCart(browser);
        
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

        // Handle cleanup on server shutdown
        process.on('SIGINT', async () => {
            process.exit();
        });
    } catch (error) {
        console.error('Failed to initialize backend:', error);
        process.exit(1);
    }
})();

// Add this new endpoint
// app.post('/blinkit/api/add-to-cart', async (req: Request, res: Response) => {
//     try {
//         const { productId, productName, quantity, price, mrp } = req.body;
        
//         if (!productId || !productName) {
//             return res.status(400).json({ 
//                 error: 'Product ID and name are required' 
//             });
//         }

//         const result = await addToBlinkitCart({
//             productId,
//             productName,
//             quantity: quantity || 1,
//             price: price || 0,
//             mrp: mrp || 0
//         });
        
//         res.json(result);
//     } catch (error) {
//         console.error('Blinkit add to cart error:', error);
//         res.status(500).json({ 
//             error: 'Internal server error', 
//             message: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// });

// Add this new endpoint
app.get('/swiggy/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchResult = await searchSwiggyInstamart(query);
        res.json(searchResult);
    } catch (error) {
        console.error('Swiggy Instamart search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/order-details', async (req, res) => {
    try {
        const details = await getOrderDetails();
        res.json({
            status: 'success',
            data: details
        });
    } catch (error) {
        console.error('Error processing order details:', error);
        res.status(500).json({
            status: 'error',
            message: error
        });
    }
});

// Add interface for the request body
interface TextQuery {
    cart: string;
}

// Add the new endpoint
app.post('/text', async (req: Request<{}, {}, TextQuery>, res: Response) => {
    try {
        const { cart } = req.body;
        
        if (!cart) {
            return res.status(400).json({ error: 'Cart text is required' });
        }

        const response = await processCartText(cart);
        res.json({ response: response.content });
    } catch (error) {
        console.error('Text processing error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default app; 