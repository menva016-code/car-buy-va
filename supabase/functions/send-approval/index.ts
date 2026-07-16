import { createClient } from "npm:@supabase/supabase-js@2.110.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PhotoItem {
  url: string;
  caption?: string;
}

interface ApprovalRequest {
  appraisalId: string;
  message: string;
  photos: PhotoItem[];
  conditionPdfUrl?: string | null;
  autotekaPdfUrl?: string | null;
  autotekaUrl?: string | null;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getConfig(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw new Error(`Failed to read config ${key}: ${error.message}`);
  return data?.value ?? null;
}

let cachedBotToken: string | null | undefined;
let cachedChatId: string | null | undefined;

async function getTelegramCreds() {
  if (cachedBotToken === undefined) {
    cachedBotToken = await getConfig("TELEGRAM_BOT_TOKEN");
  }
  if (cachedChatId === undefined) {
    cachedChatId = await getConfig("TELEGRAM_CHAT_ID");
  }
  return { botToken: cachedBotToken, chatId: cachedChatId };
}

async function sendText(chatId: string, botToken: string, text: string): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`sendMessage failed (${res.status}): ${err}`);
  }
}

async function sendMediaGroup(chatId: string, botToken: string, urls: string[]): Promise<void> {
  const media = urls.map((url) => ({ type: "photo", media: url }));
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMediaGroup`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        media,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`sendMediaGroup failed (${res.status}): ${err}`);
  }
}

async function sendDocumentByUrl(chatId: string, botToken: string, url: string, caption?: string): Promise<void> {
  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/sendDocument`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        document: url,
        caption: caption ?? "",
        parse_mode: "HTML",
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`sendDocument failed (${res.status}) for ${url}: ${err}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { botToken, chatId } = await getTelegramCreds();

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ error: "Telegram credentials not configured in app_config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body: ApprovalRequest = await req.json();

    if (!body.appraisalId || !body.message) {
      return new Response(
        JSON.stringify({ error: "appraisalId and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Send all photos in batches of 10 (Telegram sendMediaGroup limit)
    for (let i = 0; i < body.photos.length; i += 10) {
      const batch = body.photos.slice(i, i + 10).map((p) => p.url);
      await sendMediaGroup(chatId, botToken, batch);
    }

    // 2. Send the main message
    await sendText(chatId, botToken, body.message);

    // 3. Send condition PDF (thicknessmeter report)
    if (body.conditionPdfUrl) {
      await sendDocumentByUrl(chatId, botToken, body.conditionPdfUrl, "Отчёт толщинометра");
    }

    // 4. Send autoteka — PDF or link
    if (body.autotekaPdfUrl) {
      await sendDocumentByUrl(chatId, botToken, body.autotekaPdfUrl, "Автотека (PDF)");
    } else if (body.autotekaUrl) {
      await sendText(chatId, botToken, `Автотека: <a href="${body.autotekaUrl}">${body.autotekaUrl}</a>`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
