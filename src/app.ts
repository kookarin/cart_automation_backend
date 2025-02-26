import express, { Request, Response } from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { searchProduct, getFirstFiveProducts, transformProducts } from './zepto_products';
import { searchForItem, getProductIncremental } from './bigbasket';
import { initializeBlinkit, searchBlinkit } from './blinkit_products';
import { Browser } from 'puppeteer';
import { selectOptimalProducts } from './ai-product-selector';

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

// Add this new endpoint
app.get('/bigbasket/api/product-incremental', async (req: Request, res: Response) => {
    try {
        const prodId = Number(req.query.prodId);
        const searchTerm = req.query.term as string;
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
            const result = await getProductIncremental(prodId, searchTerm);
            
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
        console.log('Fetching products from BigBasket for:', searchTerm);
        const { products } = await searchForItem(searchTerm);
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
        console.log('Processing cart for house:', house_identifier);
        console.log('Cart items:', cart);

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            console.log('Invalid cart data');
            return res.status(400).json({ 
                error: 'Valid cart data is required' 
            });
        }

        // Results array to track processing of each item
        const results = [];
        let allSuccessful = true;

        // Process each cart item sequentially
        for (const item of cart) {
            try {
                console.log(`Processing item: ${item.ingredient}`);
                
                // Extract quantity value and unit
                const quantityMatch = item.required_quantity?.match(/(\d+)\s*([a-zA-Z]+)/);
                if (!quantityMatch) {
                    throw new Error(`Invalid quantity format for ${item.ingredient}`);
                }
                
                const quantityValue = parseInt(quantityMatch[1]);
                const unit = quantityMatch[2];
                console.log(`Parsed quantity: ${quantityValue} ${unit}`);

                // Search for products
                console.log(`Searching for ${item.ingredient}...`);
                const { products } = await searchForItem(item.ingredient);
                console.log(`Found ${products.length} products for ${item.ingredient}`);

                if (products.length === 0) {
                    throw new Error(`No products found for ${item.ingredient}`);
                }

                // Get AI recommendation
                console.log(`Getting recommendation for ${item.ingredient}...`);
                const recommendation = await selectOptimalProducts(
                    products,
                    {
                        quantity: quantityValue,
                        pricePreference: 'value',
                        preferences: item.preference ? [item.preference] : []
                    },
                    item.ingredient
                );
                console.log(`Recommendation received for ${item.ingredient}:`, recommendation);

                // Add to cart using product-incremental API
                console.log(`Adding ${item.ingredient} to cart...`);
                
                // Process each recommended product
                const cartResults = [];
                for (const rec of recommendation) {
                    try {
                        // Call product-incremental API for each product
                        const prodId = parseInt(rec.product_id);
                        const count = rec.count;
                        
                        console.log(`Adding product ID ${prodId} with quantity ${count} to cart...`);
                        const addToCartResult = await getProductIncremental(prodId, item.ingredient);
                        
                        cartResults.push({
                            product_id: prodId,
                            count: count,
                            status: 'added',
                            result: addToCartResult
                        });
                    } catch (cartError) {
                        console.error(`Error adding product to cart:`, cartError);
                        cartResults.push({
                            product_id: rec.product_id,
                            count: rec.count,
                            status: 'failed',
                            error: cartError instanceof Error ? cartError.message : 'Unknown error'
                        });
                    }
                }
                
                // Add result to results array
                results.push({
                    ingredient: item.ingredient,
                    status: cartResults.some(r => r.status === 'failed') ? 'partial_success' : 'success',
                    recommendation,
                    cart_results: cartResults
                });
                
            } catch (error) {
                console.error(`Error processing ${item.ingredient}:`, error);
                results.push({
                    ingredient: item.ingredient,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                allSuccessful = false;
            }
        }

        // Return overall result
        res.json({
            house_identifier,
            overall_status: allSuccessful ? 'success' : 'partial_failure',
            results
        });
        
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