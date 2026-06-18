// app/api/chat/route.js
// ParkerBot backend: per-user insurance assistant with multiple tools.
import {
  ensureUser, getBalance, getUserPolicies, findPolicy,
  recommendForUser, buyPolicy, renewPolicy, cancelPolicy,
} from "@/lib/db";

const SYSTEM_PROMPT = `You are ParkerBot, a warm, helpful insurance assistant for ONE logged-in user.
Use these tools to look things up and take actions for THIS user only:
- getMyPolicies: what the user owns and how many days until each expires.
- checkBalance: the user's wallet balance (in INR).
- recommendInsurance: plans the user does not have yet.
- getPolicyInfo: full details of any plan in the catalog (price, coverage, term, benefits).
- buyInsurance: add a NEW plan the user has agreed to (deducts the price).
- renewInsurance: renew/extend a plan the user already has (deducts the price).
- cancelInsurance: cancel a plan the user has (refunds the price).

How to behave:
- Early in a conversation you may call getMyPolicies. If a policy expires soon (about 10 days or fewer), gently point it out and OFFER to renew it. Do not renew until they say yes.
- If the user has little or no cover, you may offer ONE friendly recommendation.
- Only buy, renew, or cancel when the user clearly agrees (e.g. "yes", "go ahead", "do it").
- If the user is unsure ("maybe", "let me think") or declines ("no"), respect it warmly, do not pressure, and offer to help whenever they're ready.
- After any action, confirm what happened and state the new balance. Use the ₹ symbol for money. Be friendly and concise.
- IMPORTANT: To use a tool, use the proper tool-calling mechanism only. NEVER write tool or function calls as visible text in your reply (for example, never write things like <function=...>). The user must only ever see normal, friendly sentences.`;

const tools = [
  { type:"function", function:{ name:"getMyPolicies", description:"List the current user's insurance policies and how many days until each expires.", parameters:{ type:"object", properties:{} } } },
  { type:"function", function:{ name:"checkBalance", description:"Get the current user's wallet balance.", parameters:{ type:"object", properties:{} } } },
  { type:"function", function:{ name:"recommendInsurance", description:"List plans the current user does not already have, to offer them.", parameters:{ type:"object", properties:{} } } },
  { type:"function", function:{ name:"getPolicyInfo", description:"Get full details (price, coverage, term, benefits) of a plan by name.", parameters:{ type:"object", properties:{ policyName:{ type:"string", description:"e.g. 'Premium Health'" } }, required:["policyName"] } } },
  { type:"function", function:{ name:"buyInsurance", description:"Add a NEW plan the user agreed to buy. Deducts the price.", parameters:{ type:"object", properties:{ policyName:{ type:"string" } }, required:["policyName"] } } },
  { type:"function", function:{ name:"renewInsurance", description:"Renew a plan the user already owns. Deducts the price.", parameters:{ type:"object", properties:{ policyName:{ type:"string" } }, required:["policyName"] } } },
  { type:"function", function:{ name:"cancelInsurance", description:"Cancel a plan the user owns. Refunds the price.", parameters:{ type:"object", properties:{ policyName:{ type:"string" } }, required:["policyName"] } } },
];

// Safety net: Llama sometimes types a tool call as visible text instead of
// making a real tool call (e.g. "<function=checkBalance></function>").
// This removes any such leftover text so the user only sees clean sentences.
function stripToolLeak(text) {
  if (!text) return text;
  return text
    // remove full <function=...>...</function> blocks
    .replace(/<function=[^>]*>[\s\S]*?<\/function>/gi, "")
    // remove any orphan opening tag <function=...>
    .replace(/<function=[^>]*>/gi, "")
    // remove any orphan closing tag </function>
    .replace(/<\/function>/gi, "")
    // tidy up whitespace the removals may leave behind
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function runTool(name, args, userId) {
  try {
    switch (name) {
      case "getMyPolicies":      return { policies: getUserPolicies(userId) };
      case "checkBalance":       return { balance: getBalance(userId) };
      case "recommendInsurance": return { available: recommendForUser(userId) };
      case "getPolicyInfo": {     const p = findPolicy(args.policyName); return p ? { found:true, ...p } : { found:false }; }
      case "buyInsurance":       return buyPolicy(userId, args.policyName);
      case "renewInsurance":     return renewPolicy(userId, args.policyName);
      case "cancelInsurance":    return cancelPolicy(userId, args.policyName);
      default:                   return { error: "Unknown tool." };
    }
  } catch (e) { return { error: String(e) }; }
}

async function callGroq(apiKey, messages) {  
  return fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, tools }),
  });
}

export async function POST(request) {
  try {
    const { messages, userId } = await request.json();
    if (!Array.isArray(messages) || messages.length === 0)
      return Response.json({ error: "No messages provided." }, { status: 400 });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey)
      return Response.json({ error: "Server is missing GROQ_API_KEY. Add it to .env.local." }, { status: 500 });

    ensureUser(userId);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const convo = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

    // Loop so the model can call tools, see results, and then answer (or call more).
    for (let i = 0; i < 5; i++) {
      const res = await callGroq(apiKey, convo);
      if (!res.ok) {
        const detail = await res.text();
        return Response.json({ error: "Upstream LLM error", detail }, { status: 502 });
      }
      const data = await res.json();
      const msg = data.choices?.[0]?.message;

      if (msg?.tool_calls?.length) {
        convo.push({ role: "assistant", content: msg.content ?? "", tool_calls: msg.tool_calls });
        for (const call of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(call.function?.arguments || "{}"); } catch {}
          const result = runTool(call.function?.name, args, userId);
          convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
        }
        continue; // go round again so the model can use the results
      }

      // Clean the reply before sending it to the browser (removes any leaked tool text).
      const cleaned = stripToolLeak(msg?.content?.trim() || "");
      return Response.json({ reply: cleaned || "Sorry, I couldn't generate a reply." });
    }

    return Response.json({ reply: "I'm having trouble completing that — please try again." });
  } catch (err) {
    return Response.json({ error: "Server error", detail: String(err) }, { status: 500 });
  }
}