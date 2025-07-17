// rag.service.js
import { OpenAI } from 'openai';
import Property from '../../../Model/PropertyModel.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const askWithRAG = async (userQuestion) => {
    const properties = await Property.find({ isApproved: true }).select('type title location address price description');

    const context = properties.map(p =>
        `Type: ${p.type}\nTitle: ${p.title}\nCity: ${p.location.city}\nAddress: ${p.location.address}\nPrice: ${p.price}\nDescription: ${p.description}`
    ).join('\n\n');

    const messages = [
        { role: 'system', content: 'You are a helpful assistant who answers questions about available properties on the website.' },
        { role: 'user', content: `Context:\n${context}\n\nUser Question: ${userQuestion}` }
    ];

    const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
    });

    return completion.choices[0].message.content;
};
