import { AzureChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

interface ZeptoProduct {
    product_id: string;
    name: string;
    brand: string;
    unit: string;
    mrp: number;
    price: number;
    discount: number;
}

interface ProductRecommendationItem {
    product_id: string;
    count: number;
    reasoning: string;
    price: number;
}
type ProductRecommendation = ProductRecommendationItem[];

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

const PROMPT_TEMPLATE = `
You are a smart shopping assistant for Zepto. Given a list of available products and customer requirements,
recommend the best product to purchase.

### Available Products:
{products}

### Customer Requirements:
- Item Name: {searchTerm}
- Required Quantity: {quantity} {unit}
- Price Preference: {pricePreference}

### Selection Rules:
1. Match the exact item name first
2. Consider unit size and required quantity
3. Follow price preference:
   - 'budget': Choose lowest price
   - 'premium': Choose highest quality
   - 'value': Balance price and quality

Return a JSON array with product_id, count, reasoning, and price.
`;

export async function selectZeptoProducts(
    products: ZeptoProduct[],
    searchTerm: string,
    quantity: number,
    unit: string,
    pricePreference: 'budget' | 'premium' | 'value' = 'value'
): Promise<ProductRecommendationItem[]> {
    const llm = new AzureChatOpenAI({
        modelName: 'gpt-4o',
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
        azureOpenAIApiDeploymentName: 'gpt-4o',
        azureOpenAIApiVersion: '2024-08-01-preview',
        temperature: 0,
    });

    const prompt = PromptTemplate.fromTemplate(PROMPT_TEMPLATE);
    const formattedProducts = products.map((p, index) =>
        `${index + 1}. ID: ${p.product_id}, Name: ${p.name}, Brand: ${p.brand}, Unit: ${p.unit}, Price: ₹${p.price}, MRP: ₹${p.mrp}, Discount: ${p.discount}%`
    ).join('\n');
    console.log('formattedProducts', formattedProducts);
    console.log('prompt', prompt);

    const resp = await llm.invoke(await prompt.format({
        products: formattedProducts,
        searchTerm,
        quantity,
        unit,
        pricePreference
    }));
    console.log('Raw LLM response', resp.content);
    const response = resp.content.toString();

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