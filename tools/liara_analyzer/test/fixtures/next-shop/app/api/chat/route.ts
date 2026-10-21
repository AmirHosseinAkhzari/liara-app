import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
export async function POST(req: Request) {
  const { message } = await req.json();
  const r = await client.chat.completions.create({ model: "gpt-5", messages: [{ role: "user", content: message }] });
  return Response.json({ reply: r.choices[0].message.content });
}
