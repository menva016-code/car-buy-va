import { chunkArray, isValidUrl, formatPrice } from "./utils.ts";
import type { AppraisalPhoto } from "./types.ts";

export class TelegramService {
  constructor(
    private token: string,
    private chatId: string
  ) {}

  private get api() {
    return `https://api.telegram.org/bot${this.token}`;
  }

  private async request(
    method: string,
    body: BodyInit,
    isJson = true
  ) {
    console.log("REQUEST:", method);

    const response = await fetch(
      `${this.api}/${method}`,
      {
        method: "POST",
        headers: isJson
          ? {
              "Content-Type": "application/json",
            }
          : undefined,
        body,
      }
    );

    const text = await response.text();

    console.log("Telegram response:", text);

    let result: any;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        `Telegram returned invalid JSON:\n${text}`
      );
    }

    if (!response.ok || !result.ok) {
      throw new Error(
        `Telegram: ${JSON.stringify(result)}`
      );
    }

    return result;
  }

  async sendMessage(text: string) {
    return this.request(
      "sendMessage",
      JSON.stringify({
        chat_id: this.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      })
    );
  }

  async sendPdf(
    url: string,
    fileName: string,
    caption?: string
  ) {
    const file = await fetch(url);

    if (!file.ok) {
      throw new Error(
        `Cannot download ${fileName}`
      );
    }

    const blob = await file.blob();

    const form = new FormData();

    form.append("chat_id", this.chatId);

    form.append(
      "document",
      blob,
      fileName
    );

    if (caption) {
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
    }

    return this.request(
      "sendDocument",
      form,
      false
    );
  }

  private async sendLargePhoto(
    blob: Blob,
    fileName: string,
    caption?: string
  ) {
    const form = new FormData();

    form.append("chat_id", this.chatId);

    form.append(
      "document",
      blob,
      fileName
    );

    if (caption) {
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
    }

    const response = await fetch(
      `${this.api}/sendDocument`,
      {
        method: "POST",
        body: form,
      }
    );

    const text = await response.text();

    console.log("Large photo:", text);

    let result: any;

    try {
      result = JSON.parse(text);
    } catch {
      throw new Error(
        `Telegram returned invalid JSON:\n${text}`
      );
    }

    if (!response.ok || !result.ok) {
      throw new Error(
        `Telegram: ${JSON.stringify(result)}`
      );
    }
  }
  
    private readonly photoOrder = [
    "front",
    "front_left",
    "front_right",

    "left",
    "right",

    "rear_left",
    "rear",
    "rear_right",

    "interior_front",
    "interior_rear",

    "dashboard",
    "odometer",

    "engine",
    "vin",
    "sts",

    "tire_specs",

    "damage",
    "other",
  ];

  private readonly requiredPhotos: Record<string, string> = {
    front: "Передняя часть",
    rear: "Задняя часть",
    left: "Левый бок",
    right: "Правый бок",
    dashboard: "Панель приборов",
    odometer: "Одометр",
    vin: "VIN",
    engine: "Моторный отсек",
    tire_specs: "Шины",
  };

  private sortPhotos(
    photos: AppraisalPhoto[]
  ): AppraisalPhoto[] {
    return [...photos].sort((a, b) => {
      const ai = this.photoOrder.indexOf(a.slot);
      const bi = this.photoOrder.indexOf(b.slot);

      const orderA = ai === -1 ? 999 : ai;
      const orderB = bi === -1 ? 999 : bi;

      return orderA - orderB;
    });
  }

  private getMissingPhotos(
    photos: AppraisalPhoto[]
  ): string[] {
    const uploaded = new Set(
      photos.map((photo) => photo.slot)
    );

    const missing: string[] = [];

    for (const [slot, name] of Object.entries(
      this.requiredPhotos
    )) {
      if (!uploaded.has(slot)) {
        missing.push(name);
      }
    }

    return missing;
  }

  async sendPhotos(
    photos: AppraisalPhoto[],
    appraisal: {
      make: string | null;
      model: string | null;
      year: number | null;
      owner_name: string;
      owner_phone: string;
      owner_price: number | null;
    }
  ) {
    
    const validPhotos = this
      .sortPhotos(photos)
      .filter((photo) => isValidUrl(photo.url));

    if (validPhotos.length === 0) {
      return;
    }

    const groups = chunkArray(validPhotos, 10);

    for (
      let groupIndex = 0;
      groupIndex < groups.length;
      groupIndex++
    ) {
      const group = groups[groupIndex];

      const form = new FormData();
      form.append("chat_id", this.chatId);

      const media: Record<string, unknown>[] = [];

      for (let i = 0; i < group.length; i++) {
        const photo = group[i];

        console.log("Downloading:", photo.url);

        const response = await fetch(photo.url);

        if (!response.ok) {
          throw new Error(
            `Не удалось скачать ${photo.url}`
          );
        }

        const blob = await response.blob();
	        if (blob.size > 10 * 1024 * 1024) {
          console.log(
            `Большая фотография (${blob.size} байт), отправляем документом`
          );

        await this.sendLargePhoto(
			  blob,
			  `photo-${Date.now()}-${i}.jpg`
			);

          continue;
        }

        const attachName = `photo${i}`;

        form.append(
          attachName,
          blob,
          `${attachName}.jpg`
        );

        media.push({
			type: "photo",
			media: `attach://${attachName}`,
		});
      }

      // если все фотографии в группе были отправлены как документы
      if (media.length === 0) {
        continue;
      }

      form.append(
        "media",
        JSON.stringify(media)
      );

      const result = await fetch(
        `${this.api}/sendMediaGroup`,
        {
          method: "POST",
          body: form,
        }
      );

      const text = await result.text();

      console.log("Telegram response:", text);

      let json: any;

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          `Telegram returned invalid JSON:\n${text}`
        );
      }

      if (!result.ok || !json.ok) {
        throw new Error(
          `Telegram: ${JSON.stringify(json)}`
        );
      }

      if (groupIndex < groups.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );
      }
    }
	
	/*
	const missing = this.getMissingPhotos(photos);

	if (missing.length > 0) {
	  await this.sendMessage(
		`⚠️ <b>Не хватает обязательных фотографий</b>\n\n• ${missing.join("\n• ")}`
	  );
	}
	*/
  }
}