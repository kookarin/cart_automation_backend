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
import { searchSwiggyInstamart } from './swiggy_instamart';
import {  getOrderDetails } from './order-details';
import { processCartText } from './text_cart';
import { getCookieForHouse } from './services/db';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';

// Add stealth plugin
puppeteer.use(StealthPlugin());

const app = express();
const port = 5001;

// Enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

let browser: Browser;

// Add swagger documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

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
        const houseId = req.query.houseId as string;
        
        if (!query || !houseId) {
            return res.status(400).json({ error: 'Search query and house ID are required' });
        }

        // Get cookie from database
        const cookie = await getCookieForHouse(houseId);
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

// Product incremental endpoint
app.get('/bigbasket/api/product-incremental', async (req: Request, res: Response) => {
    try {
        const prodId = Number(req.query.prodId);
        const searchTerm = req.query.term as string;
        const houseId = req.query.houseId as string;
        const count = Number(req.query.count) || 1;
        
        if (!prodId || !searchTerm || !houseId) {
            return res.status(400).json({ 
                error: 'Product ID, search term, and house ID are required' 
            });
        }

        // Get cookie from database
        const cookie = await getCookieForHouse(houseId);

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

        res.json(count === 1 ? results[0] : results);
    } catch (error) {
        console.error('Product incremental info error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Smart select endpoint
app.post('/bigbasket/api/smart-select', async (req: Request, res: Response) => {
    try {
        const { searchTerm, quantity, pricePreference, preferences, houseId } = req.body;
        console.log('Smart Select Request:', { searchTerm, quantity, pricePreference, preferences, houseId });

        if (!searchTerm || !quantity || !houseId) {
            console.log('Missing required parameters');
            return res.status(400).json({ 
                error: 'Search term, quantity, and house ID are required' 
            });
        }

        // Get cookie from database
        const cookie = await getCookieForHouse(houseId);

        // First, get all available products
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
                unit: 'piece',
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

// Rename from '/text' to '/text-to-cart'
app.post('/text-to-cart', async (req: Request<{}, {}, TextQuery>, res: Response) => {
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