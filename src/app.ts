import express, { Request, Response } from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { searchProduct, transformProducts } from './zeptoHelper';
import { searchForItem, getProductIncremental } from './bigbasketHelper';
import { searchForItemL, getProductIncrementalL } from './liciousHelper';
import { searchBlinkit,initializeBlinkit } from './blinkitHelper';
import { Browser } from 'puppeteer';
import { selectOptimalProducts } from './ai-product-selector';
import { processCart } from './bigbasket';
import { processCartL } from './licious';
import { searchSwiggyInstamart } from './swiggyHelper';
import {  getOrderDetails } from './order-details';
import { processCartText } from './text_cart';
import { getCookieForHouse } from './services/db';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './config/swagger';
import { processSwiggyCart } from './swiggy';
import { zeptoOrder } from './zepto_master';
import { processZeptoCart } from './zepto';
import { processBlinkitCart } from './blinkit';
import { blinkitOrder } from './blinkit_master';

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

Search products endpoint
app.get('/zepto/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;

        const houseId = req.query.houseId as string;

        if (!query || !houseId) {
            return res.status(400).json({ error: 'Search query and house ID are required' });
        }

        // Get cookie from database
        const cookieData = await getCookieForHouse(houseId,'Zepto');
        const data = cookieData[0] as { cookie: any; store_id: any; store_ids: any };
        const cookie = data.cookie;
        const store_id = data.store_id;
        const store_ids = data.store_ids;

        const searchResult = await searchProduct(query, cookie,store_id, store_ids);
        const transformedProducts = transformProducts(searchResult, query);

        res.json(transformedProducts);
        console.log('Request completed: /zepto/api/search ================================');
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
        console.log('Request failed: /zepto/api/search ================================');
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
        const cookieData = await getCookieForHouse(houseId,'Bigbasket');
        const cookie = cookieData[0].cookie;
        const searchResult = await searchForItem(query, cookie);
        res.json(searchResult);
        console.log('Request completed: /bigbasket/api/search ================================');
    } catch (error) {
        console.error('BigBasket search error:', error);
        res.status(500).json({ error: 'Internal server error' });
        console.log('Request failed: /bigbasket/api/search ================================');
    }
});

// Licius search endpoint
app.get('/licious/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        const houseId = req.query.houseId as string;

        if (!query || !houseId) {
            return res.status(400).json({ error: 'Search query and house ID are required' });
        }

        // Get cookie from database
        const cookieData = await getCookieForHouse(houseId,'Licious');
        const data = cookieData[0] as { cookie: any; buildId: any};
        const cookie = data.cookie;
        const buildId = data.buildId;
        const searchResult = await searchForItemL(query, cookie, buildId);


        res.json(searchResult);
        console.log('Request completed: /licious/api/search ================================');
    } catch (error) {
        console.error('Licius search error:', error);
        res.status(500).json({ error: 'Internal server error' });
        console.log('Request failed: /licious/api/search ================================');
    }
});

// Blinkit search endpoint
app.get('/blinkit/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        const houseId = req.query.houseId as string;

        if (!query || !houseId) {
            return res.status(400).json({ error: 'Search query and house ID are required' });
        }

        // Get cookie from database
        const cookieData = await getCookieForHouse(houseId,'Blinkit');
        const cookie = cookieData[0].cookie;

        const searchResult = await searchBlinkit(query, cookie);
        res.json(searchResult);
        console.log('Request completed: /blinkit/api/search ================================');
    } catch (error) {
        console.error('Blinkit search error:', error);
        res.status(500).json({ error: 'Internal server error' });
        console.log('Request failed: /blinkit/api/search ================================');
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
        const cookieData = await getCookieForHouse(houseId,'Bigbasket');
        const cookie = cookieData[0].cookie;

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
        console.log('Request completed: /bigbasket/api/product-incremental ================================');
    } catch (error) {
        console.error('Product incremental info error:', error);
        res.status(500).json({ error: 'Internal server error' });
        console.log('Request failed: /bigbasket/api/product-incremental ================================');
    }
});

// Smart select endpoint


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
        console.log('Request completed: /bigbasket/api/process-cart ================================');

    } catch (error) {
        console.error('Cart processing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /bigbasket/api/process-cart ================================');
    }
});

// Update the process-cart endpoint to use product-incremental API
app.post('/licious/api/process-cart', async (req: Request, res: Response) => {
    try {
        const { house_identifier, cart } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({
                error: 'Valid cart data is required'
            });
        }

        const result = await processCartL(house_identifier, cart);
        res.json(result);
        console.log('Request completed: /licious/api/process-cart ================================');

    } catch (error) {
        console.error('Cart processing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /licious/api/process-cart ================================');
    }
});

// Initialize browser and start server



app.get('/swiggy/api/search', async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        const houseId = req.query.house_identifier as string;

        if (!query || !houseId) {
            return res.status(400).json({ error: 'Search query and house ID are required' });
        }


        const searchResult = await searchSwiggyInstamart(query,houseId);
        res.json(searchResult);
        console.log('Request completed: /swiggy/api/search ================================');
    } catch (error) {
        console.error('Swiggy Instamart search error:', error);
        res.status(500).json({ error: 'Internal server error' });
        console.log('Request failed: /swiggy/api/search ================================');
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
        console.log('Request completed: /text-to-cart ================================');
    } catch (error) {
        console.error('Text processing error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /text-to-cart ================================');
    }
});

// Add Swiggy process-cart endpoint
app.post('/swiggy/api/process-cart', async (req: Request, res: Response) => {
    try {
        const { cart, house_identifier } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({
                error: 'Valid cart data is required'
            });
        }

        if (!house_identifier) {
            return res.status(400).json({
                error: 'House ID is required'
            });
        }

        const result = await processSwiggyCart(cart, house_identifier);
        res.json(result);
        console.log('Request completed: /swiggy/api/process-cart ================================');
    } catch (error) {
        console.error('Swiggy cart processing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /swiggy/api/process-cart ================================');
    }
});

// Add new endpoint for Zepto order processing
app.post('/zepto/api/make_cart', async (req: Request, res: Response) => {
    try {
        const { house_id } = req.body;

        if (!house_id) {
            return res.status(400).json({
                error: 'House ID is required'
            });
        }

        await zeptoOrder(house_id);
        res.json({ 
            status: 'success',
            message: 'Zepto order processing completed'
        });
        console.log('Request completed: /zepto/api/process-cart ================================');

    } catch (error) {
        console.error('Zepto order processing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /zepto/api/process-cart ================================');
    }
});

// Add new endpoint for testing Zepto cart processing
app.post('/zepto/api/process-cart', async (req: Request, res: Response) => {
    try {
        const { cart, house_identifier } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({
                error: 'Valid cart data is required'
            });
        }

        if (!house_identifier) {
            return res.status(400).json({
                error: 'House identifier is required'
            });
        }

        const result = await processZeptoCart(house_identifier, cart);
        res.json(result);
        console.log('Request completed: /zepto/api/process-cart-test ================================');

    } catch (error) {
        console.error('Zepto cart processing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /zepto/api/process-cart-test ================================');
    }
});

// Add Blinkit process-cart endpoint
app.post('/blinkit/api/process-cart', async (req: Request, res: Response) => {
    try {
        const { cart, house_identifier } = req.body;

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return res.status(400).json({
                error: 'Valid cart data is required'
            });
        }

        if (!house_identifier) {
            return res.status(400).json({
                error: 'House identifier is required'
            });
        }

        const result = await processBlinkitCart(house_identifier, cart);
        res.json(result);
        console.log('Request completed: /blinkit/api/process-cart ================================');
    } catch (error) {
        console.error('Blinkit cart processing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /blinkit/api/process-cart ================================');
    }
});

// Add new endpoint for Blinkit order processing
app.post('/blinkit/api/make_cart', async (req: Request, res: Response) => {
    try {
        const { house_id } = req.body;

        if (!house_id) {
            return res.status(400).json({
                error: 'House ID is required'
            });
        }

        await blinkitOrder(house_id);
        res.json({ 
            status: 'success',
            message: 'Blinkit order processing completed'
        });
        console.log('Request completed: /blinkit/api/make_cart ================================');

    } catch (error) {
        console.error('Blinkit order processing error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log('Request failed: /blinkit/api/make_cart ================================');
    }
});

(async () => {
    try {
        browser = await puppeteer.launch({ headless: true });
        await initializeBlinkit(browser);

        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

        // Handle cleanup on server shutdown
        process.on('SIGINT', async () => {
            await browser.close();
            process.exit();
        });
    } catch (error) {
        console.error('Failed to initialize backend:', error);
        process.exit(1);
    }
})();

export default app;





