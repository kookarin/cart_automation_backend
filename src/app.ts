import express, { Request, Response } from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { searchProduct, getFirstFiveProducts, transformProducts } from './zepto_products';
import { searchForItem } from './bigbasket';
import { initializeBlinkit, searchBlinkit } from './blinkit_products';
import { Browser } from 'puppeteer';

// Add stealth plugin
puppeteer.use(StealthPlugin());

const app = express();
const port = 5001;

// Enable CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

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
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const searchResult = await searchForItem(query);
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

// Initialize browser and start server
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
        console.error('Failed to initialize browser:', error);
        process.exit(1);
    }
})();

export default app; 