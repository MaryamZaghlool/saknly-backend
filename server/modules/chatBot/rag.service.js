import { OpenAI } from 'openai';
import Property from '../../Model/PropertyModel.js';
import Agency from '../../Model/AgencyModel.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const smartAskWithRAG = async (userQuestion) => {
  const categoryResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are a classifier. Classify the user's question into one of the following categories:
- property
- agency
- submit
- contact
- price-range

Only return one word from the above.`,
      },
      {
        role: 'user',
        content: userQuestion,
      },
    ],
  });

  const category = categoryResponse.choices[0].message.content.trim().toLowerCase();

//   ------------------- السؤال عن رفع العقار ------------
  if (category === 'submit') {
    return 'لرفع العقار الخاص بك على موقع سكنلي , يمكنك التوجه الى نموذج ملئ بييانات العقار عن طريق الضغط على زر "أضف عقارك" باللون الازرق او اضغط على الرابط ...... للتوجه الى نموذج ملئ البيانات مباشرة , مع العلم انه سيتوجب عليك الانتظار لبضع ساعات حيث سيتم مراجعة كافة تفاصيل العقار من قبل أدمن موقع سكنلي قبل نشره , و عندها تستطيع متابعة حالة بيع عقارك و مشاهداته عن طريق صفحتك الشخصية على موقع سكنلي ... برجاء انشاء حساب و التاكد من تسجيل الدخول قبل البدء في عملية رفع عقارك على موقع سكنلي';
  }



//   ----------------- السؤال عن التواصل ------------------

  if (category === 'contact') {
    return 'نحن في خدمتك. للتواصل معنا : يمكنك الإتصال على 01097558591 , او إرسال بريد إلكتروني الى tasbih.attia@gmail.com';
  }


//   ----------------- السؤال عن الأسعار ------------------

  if (category === 'price-range') {
    const properties = await Property.find({ isApproved: true, isActive: true });

    const prices = properties.map(p => ({
      city: p.location.city?.toLowerCase(),
      address: p.location.address?.toLowerCase(),
      type: p.type?.toLowerCase(),
      category: p.category?.toLowerCase(),
      price: p.price
    }));

    const userText = userQuestion.toLowerCase();

    const isRent = userText.includes("إيجار") || userText.includes("rent");
    const isSale = userText.includes("بيع") || userText.includes("sale");

    const knownTypes = ['شقة', 'فيلا', 'محل', 'استوديو', 'دوبلكس'];
    const selectedType = knownTypes.find(type => userText.includes(type));

    const filtered = prices.filter(p =>
      (isRent ? p.category === 'rent' : true) &&
      (isSale ? p.category === 'sale' : true) &&
      (selectedType ? p.type === selectedType : true) &&
      (userText.includes(p.city) || userText.includes(p.address))
    );

    if (filtered.length === 0) {
      return "❌ لم أتمكن من العثور على عقارات تطابق سؤالك. حاول بصيغة أوضح أو مدينة/عنوان معروف.";
    }

    const allPrices = filtered.map(p => p.price);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const avg = Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length);

    return `📊 متوسط الأسعار ${isRent ? 'للإيجار' : isSale ? 'للبيع' : ''}${selectedType ? ` لنوع العقار "${selectedType}"` : ''} في المنطقة المطلوبة يتراوح بين ${min} جنيه و ${max} جنيه. والمتوسط التقريبي هو ${avg} جنيه.`;
  }




//   ----------------- السؤال عن العقارات ------------------

  if (category === 'property') {
    const properties = await Property.find({ isApproved: true, isActive: true }).select('type title location address price description');

    const context = properties.map((p, idx) =>
      `### 🏠 عقار رقم ${idx + 1}\n` +
      `- النوع: ${p.type}\n` +
      `- العنوان: ${p.title}\n` +
      `- المدينة: ${p.location.city}\n` +
      `- العنوان التفصيلي: ${p.location.address}\n` +
      `- السعر: ${p.price} جنيه\n` +
      `- الوصف: ${p.description || 'لا يوجد وصف'}\n`
    ).join('\n---\n');

    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `أنت مساعد ذكي متخصص في عرض العقارات. عندما تُعرض عليك بيانات عقارات، قدمها بشكل منسق وواضح باستخدام عناوين فرعية وفواصل واضحة بين كل عقار.`,
        },
        {
          role: 'user',
          content: `السياق:\n${context}\n\nسؤال المستخدم: ${userQuestion}`,
        },
      ],
    });

    return finalResponse.choices[0].message.content;
  }





//   ----------------- السؤال عن الوكالات ------------------

  if (category === 'agency') {
    const agencies = await Agency.find().select('name description');
    const context = agencies.map(a => `Agency: ${a.name}\nDescription: ${a.description}`).join('\n\n');

    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that answers based on website data.`,
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nUser Question: ${userQuestion}`,
        },
      ],
    });

    return finalResponse.choices[0].message.content;
  }

  return '❌ لا أستطيع تحديد مصدر المعلومات المطلوب للإجابة على سؤالك.';
};
