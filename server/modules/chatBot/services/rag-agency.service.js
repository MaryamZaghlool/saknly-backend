// rag-agency.service.js
import { OpenAI } from 'openai';
import Agency from '../../../Model/AgencyModel.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const askAgencyRAG = async (userQuestion) => {
  // Fetch all agencies
  const agencies = await Agency.find().select('name description isFeatured logo.url');

  // Convert data to string context
  const context = agencies.map(a =>
    `Agency Name: ${a.name}\nFeatured: ${a.isFeatured ? 'Yes' : 'No'}\nDescription: ${a.description || 'No description'}\nLogo URL: ${a.logo?.url || 'N/A'}`
  ).join('\n\n');

  const messages = [
    {
      role: 'system',
      content: 'You are a helpful assistant that answers questions about real estate agencies listed on the website.',
    },
    {
      role: 'user',
      content: `Context:\n${context}\n\nUser Question: ${userQuestion}`,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
  });

  return completion.choices[0].message.content;
};
