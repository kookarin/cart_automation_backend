import { AzureChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
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
    unit: string; // unit of the quantity
    preferences?: string[]; // array of preferences (brand, pack size, organic, etc.)
}

interface LiciousProduct {
    product_id: string;
    name: string;
    brand: string;
    unit: string;
    mrp: number;
    price: number;
    discount: number;
    weight: string;
    available: boolean;
    pack_desc: string;
}

const PROMPT_TEMPLATE = `
You are a smart shopping assistant for Licious, a premium meat and seafood delivery service. Given a list of available products and customer requirements,
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
   Rule 1: For any item, select the same type of meat/fish and not its variants.
      Example: For chicken breast, choose products which are chicken breast and not variations like chicken thigh or chicken wings.
   Rule 2: Customer preferences are to be considered while selecting the product.
      Example: If preference includes "boneless", prioritize boneless cuts.
   Rule 3: Top priority will be given to the Product match, then preferences, then selling price.
   Rule 4: Only consider products that are available (available = true).

Step 2: Calculate Required Quantity
   Rule 1: Calculate how many units of the selected product are needed to meet the required quantity.
      Example: If customer needs 1000g and product weight is 250g, recommend 4 units.
   Rule 2: The final quantity should be within 85% to 115% of the requested quantity.
      Example: If customer needs 400g and product is 250g, recommend 2 units (500g) as it's within 115%.
      Example: If customer needs 800g and product is 450g, recommend 2 units (900g) as it's within 115%.
   Rule 3: All weights in product listings are in grams unless specified otherwise in the pack_desc.

Step 3: Consider price preferences
   - If 'budget' is selected, prioritize the cheapest option that meets the quantity requirements.
   - If 'premium' is selected, prioritize higher quality options even if they cost more.
   - If 'value' is selected, find the best balance between price and quality.

You will be returning the product_id, count, reasoning, price. Make sure you always return this in valid array of json format with keys product_id, count, reasoning, price. The price should be the total price for all units (count * unit price).
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
    products: LiciousProduct[],
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
        `${index + 1}. ID: ${p.product_id}, Name: ${p.name}, Weight: ${p.weight}g, Price: ₹${p.price}, MRP: ₹${p.mrp}, Discount: ${p.discount}%, Available: ${p.available}, Description: ${p.pack_desc}`
    ).join('\n');
    console.log('Products formatted for prompt');

    // Format preferences for the prompt
    const formattedPreferences = criteria.preferences && criteria.preferences.length > 0
        ? criteria.preferences.join(", ")
        : "None";
    console.log('Preferences formatted:', formattedPreferences);

    const promptInput = {
        products: formattedProducts,
        searchTerm: searchTerm,
        quantity: criteria.quantity,
        unit: criteria.unit || 'g',
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
