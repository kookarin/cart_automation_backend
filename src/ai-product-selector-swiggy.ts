import { AzureChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { SwiggyProduct } from "./swiggyHelper";
import dotenv from 'dotenv';

dotenv.config();

interface ProductRecommendationItem {
    itemId: string;
    productId: string;
    spin: string;
    count: number;
    reasoning: string;
    price: number;
    storeId: number;
}

type ProductRecommendation = ProductRecommendationItem[];

interface ProductSelectionCriteria {
    quantity: number;
    unit: string;
    pricePreference?: 'budget' | 'premium' | 'value';
    preferences?: string[];
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
   Rule 3: Top priority will be given to the Product match, then preferences, then selling price.
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
   Rule 5: If there is different in unit of quantity items to be searched and weight of product then check the pack_desc to get approximate quantity.
   For example if required mushroom is 500g and the weight in products is 1 pack then check for the pack_desc to more info.

Step 3: Consider price preferences
   - If 'budget' is selected, prioritize the cheapest option that meets the quantity requirements.
   - If 'premium' is selected, prioritize higher quality options even if they cost more.
   - If 'value' is selected, find the best balance between price and quality.

You will be returning the itemId,productId,spin,count,reasoning,price,storeId. Make sure you always return this in valid array of json format with keys itemId,productId,spin,count,reasoning,price,storeId.
`;

function extractJsonFromString(text: string): string {
    const jsonRegex = /(\[.*\]|\{.*\})/s;
    const match = text.match(jsonRegex);
    
    if (match && match[0]) {
        console.log('Extracted JSON from response');
        return match[0];
    }
    
    console.log('No JSON pattern found in response');
    return text;
}

export async function selectOptimalProducts(
    products: SwiggyProduct[],
    criteria: ProductSelectionCriteria,
    searchTerm: string
): Promise<ProductRecommendation> {
    console.log('Starting product selection for:', searchTerm);
    console.log('Selection criteria:', criteria);

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

    const prompt = PromptTemplate.fromTemplate(PROMPT_TEMPLATE);
    
    const formattedProducts = availableProducts.map((p, index) => 
        `${index + 1}. ItemID: ${p.itemId}, ProductID: ${p.productId}, Name: ${p.name}, Brand: ${p.brand}, Weight: ${p.weight}, Price: ₹${p.price}, MRP: ₹${p.mrp}, Discount: ${p.discount}, Available: ${p.available}, Pack_desc: ${p.pack_desc}, Spin: ${p.spin}, StoreId: ${p.storeId}`
    ).join('\n');

    const formattedPreferences = criteria.preferences && criteria.preferences.length > 0 
        ? criteria.preferences.join(", ")
        : "None";

    const promptInput = {
        products: formattedProducts,
        searchTerm: searchTerm,
        quantity: criteria.quantity,
        unit: criteria.unit || 'units',
        pricePreference: criteria.pricePreference || 'value',
        preferences: formattedPreferences
    };

    console.log('Sending request to LLM...');
    
    const formattedPrompt = await prompt.format(promptInput);
    console.log('Formatted prompt:', formattedPrompt);
    
    const responseObj = await llm.invoke(formattedPrompt);
    const response = responseObj.content.toString();
    console.log('Raw LLM response:', response);

    try {
        const jsonString = extractJsonFromString(response);
        console.log('Extracted JSON string:', jsonString);
        
        const parsedResponse = JSON.parse(jsonString);
        console.log('Successfully parsed LLM response:', parsedResponse);
        return parsedResponse as ProductRecommendation;
    } catch (error) {
        console.error('Error parsing AI response:', error);
        console.error('Raw response that failed to parse:', response);
        throw new Error('Failed to get product recommendations');
    }
} 