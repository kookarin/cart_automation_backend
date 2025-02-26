import { AzureChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { TransformedProduct } from "./bigbasket";
import dotenv from 'dotenv';

dotenv.config();

interface ProductRecommendationItem {
    product_id: string;
    count: number;
    reasoning: string;
    price: number;
}

type ProductRecommendation = ProductRecommendationItem[];

interface ProductSelectionCriteria {
    quantity: number;      // desired quantity in grams/kg/pieces
    pricePreference?: 'budget' | 'premium' | 'value'; // default to 'value'
    preferences?: string[]; // array of preferences (brand, pack size, organic, etc.)
}

const PROMPT_TEMPLATE = `
You are a smart shopping assistant. Given a list of available products and customer requirements, 
recommend the best combination of products to purchase.

### Available Products:
{products}

### Customer Requirements:
- Item Name: {searchTerm}
- Required Quantity: {quantity} {unit}
- Price Preference: {pricePreference}
- Customer Preferences: {preferences}

### Selection Process:

Step 1: Select the most appropriate product
   Rule 1: For any item, select the same ingredient and not its variant.
      Example: For onion, choose products which are onion and not variations like spring onion or sambar onion.
   Rule 2: Customer preferences are to be considered while selecting the product.
      Example: If preference includes a brand name like "Fresho", try to add product from that brand first.
      Example: If preference includes a pack size like "1000ml packet", prioritize that pack size.
      Example: If preference includes "organic", prioritize organic products.
   Rule 3: Top priority will be given to the Product match, then preferences, then selling price. Keep in mind that price is the selling price and not mrp.
   Rule 4: Only consider products that are available (available = true).

Step 2: Choose the Pack size(s)
   Rule 1: To fulfill the required quantity - Combination of pack sizes can also be used.
      Example: If required quantity is 600g and available pack sizes are 100g and 500g, 1 qty of each can be ordered.
   Rule 2: For any given required qty, order would be considered fulfilled if the final ordered qty is within the range of 85% to 115% of the required quantity.
      Example: If required quantity is 220g, you can add 1 qty of 200g pack size.
      Example: If required quantity is 280g, you can add 1 qty of each 100g and 200g.
      Keep in mind to strictly be between the specified range.
   Rule 3: If there is combination of pack sizes that can be used to fulfill the required quantity, then only consider that combination and not any other combination.
   Rule 4: Consider pack size preferences if specified.

Step 3: Consider price preferences
   - If 'budget' is selected, prioritize the cheapest option that meets the quantity requirements.
   - If 'premium' is selected, prioritize higher quality options even if they cost more.
   - If 'value' is selected, find the best balance between price and quality.

You will be returning the product_id,count,reasoning,price. Make sure you always return this in valid array of  json format with keys product_id,count,reasoning,price.
`;

// Helper function to extract JSON from a string
function extractJsonFromString(text: string): string {
    // Look for JSON pattern - starts with { or [ and ends with } or ]
    const jsonRegex = /(\[.*\]|\{.*\})/s;  // 's' flag for multiline matching
    const match = text.match(jsonRegex);
    
    if (match && match[0]) {
        console.log('Extracted JSON from response');
        return match[0];
    }
    
    console.log('No JSON pattern found in response');
    return text; // Return original if no JSON pattern found
}

export async function selectOptimalProducts(
    products: TransformedProduct[],
    criteria: ProductSelectionCriteria,
    searchTerm: string
): Promise<ProductRecommendation> {
    console.log('Starting product selection for:', searchTerm);
    console.log('Selection criteria:', criteria);

    // Filter out unavailable products
    const availableProducts = products.filter(p => p.available);
    console.log(`Filtered ${products.length} products to ${availableProducts.length} available products`);
    
    if (availableProducts.length === 0) {
        console.log('No available products found');
        throw new Error("No available products found");
    }

    const llm = new AzureChatOpenAI({
        modelName: 'gpt-4o',
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: 'gpt-4o',
        azureOpenAIApiVersion: '2024-08-01-preview',
        temperature: 0,
    });
    console.log('LLM initialized');

    const prompt = PromptTemplate.fromTemplate(PROMPT_TEMPLATE);
    
    // Format products for the prompt
    const formattedProducts = availableProducts.map((p, index) => 
        `${index + 1}. ID: ${p.product_id}, Name: ${p.name}, Brand: ${p.brand}, Weight: ${p.weight}, Price: ₹${p.price}, MRP: ₹${p.mrp}, Discount: ${p.discount}%, Available: ${p.available}`
    ).join('\n');
    console.log('Products formatted for prompt');
    console.log('Products are', formattedProducts);
    console.log('Formatted products sample:', formattedProducts.slice(0, 10)); // Show first 2 products

    // Format preferences for the prompt
    const formattedPreferences = criteria.preferences && criteria.preferences.length > 0 
        ? criteria.preferences.join(", ")
        : "None";
    console.log('Preferences formatted:', formattedPreferences);

    const promptInput = {
        products: formattedProducts,
        searchTerm: searchTerm,
        quantity: criteria.quantity,
        unit: availableProducts[0]?.unit || 'units',
        pricePreference: criteria.pricePreference || 'value',
        preferences: formattedPreferences
    };
    console.log('Full prompt input:', promptInput);

    console.log('Sending request to LLM...');
    
    // Create the formatted prompt first
    const formattedPrompt = await prompt.format(promptInput);
    console.log('Formatted prompt:', formattedPrompt);
    
    // Then send it to the LLM
    const responseObj = await llm.invoke(formattedPrompt);
    const response = responseObj.content.toString();
    console.log('Raw LLM response:', response);

    try {
        // Extract JSON from the response string
        const jsonString = extractJsonFromString(response);
        console.log('Extracted JSON string:', jsonString);
        
        // Parse the extracted JSON
        let parsedResponse;
        const jsonData = JSON.parse(jsonString);
        parsedResponse = jsonData
        console.log('Successfully parsed LLM response:', parsedResponse);
        return parsedResponse as ProductRecommendation;
    } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw response that failed to parse:', response);
        throw new Error('Failed to get product recommendations');
    }
} 