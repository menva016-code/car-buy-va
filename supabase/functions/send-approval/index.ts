import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { DatabaseService } from "./database.ts";
import { TelegramService } from "./telegram.ts";
import { buildMessage } from "./formatter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { appraisalId } = await req.json();

    if (!appraisalId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Не указан appraisalId",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const telegramToken =
      Deno.env.get("TELEGRAM_BOT_TOKEN");

    const telegramChatId =
      Deno.env.get("TELEGRAM_CHAT_ID");

    if (!telegramToken || !telegramChatId) {
      throw new Error(
        "Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID"
      );
    }

    const db = new DatabaseService();

    const tg = new TelegramService(
      telegramToken,
      telegramChatId
    );

    const { appraisal, photos } =
      await db.load(appraisalId);

    const message =
      buildMessage(appraisal);
	  
	    // 1. Фотографии
    await tg.sendPhotos(
      photos,
      appraisal
    );

    // 2. Карточка автомобиля
    await tg.sendMessage(
      message
    );

    // 3. PDF толщиномера
    if (appraisal.paint_pdf_url) {
      await tg.sendPdf(
        appraisal.paint_pdf_url,
        "Толщиномер.pdf"
      );
    }

    // 4. Автотека
    if (appraisal.autoteka_url) {
	  await tg.sendMessage(
		`📄 <b>Автотека</b>\n\n${appraisal.autoteka_url}`
	  );
	} else if (appraisal.autoteka_pdf_url) {
	  await tg.sendPdf(
		appraisal.autoteka_pdf_url,
		"Автотека.pdf"
	  );
	}

    // 5. Отмечаем как отправленную
    await db.markAsSent(appraisalId);

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});