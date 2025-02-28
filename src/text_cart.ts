import { AzureChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';

dotenv.config();

const llm = new AzureChatOpenAI({
    modelName: 'gpt-4o',
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiDeploymentName: 'gpt-4o',
    azureOpenAIApiVersion: '2024-08-01-preview',
    temperature: 0,
});

export async function processCartText(cart: string) {
    const prompt = `What are the ingredients and qty in '${cart}'. return in the format [item: '', quantity: '']. Ignore the text that does not correspond to an ingredient. Make sure you return json and no other sentence`;
    
    try {
        const response = await llm.invoke(prompt);
        return response;
    } catch (error) {
        console.error('LLM processing error:', error);
        throw error;
    }
} 