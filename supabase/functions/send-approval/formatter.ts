import { Appraisal, PresaleCost } from "./types.ts";
import { formatMileage, formatPrice } from "./utils.ts";

const transmissionLabels: Record<string, string> = {
  automatic: "Автомат",
  manual: "Механика",
  robot: "Робот",
  cvt: "Вариатор",
};

const driveLabels: Record<string, string> = {
  front: "Передний",
  rear: "Задний",
  all: "Полный",
};

const fuelLabels: Record<string, string> = {
  petrol: "Бензин",
  diesel: "Дизель",
  gas: "Газ",
  hybrid: "Гибрид",
  electric: "Электро",
};

const saleLabels: Record<string, string> = {
  buyout: "Выкуп",
  trade_in: "Trade-in",
};

function getCosts(costs: PresaleCost[] | null) {
  if (!costs || costs.length === 0) {
    return {
      text: "• Не требуется",
      total: 0,
    };
  }

  let total = 0;

  const text = costs
    .map((item) => {
      total += Number(item.amount);

      return `• ${item.type} — ${formatPrice(item.amount)} ₽`;
    })
    .join("\n");

  return {
    text,
    total,
  };
}

export function buildMessage(appraisal: Appraisal): string {

  const costs = getCosts(appraisal.presale_costs);

  return `🚗 ${appraisal.make ?? "-"} ${appraisal.model ?? ""} (${appraisal.year ?? "-"})

👤 Владелец: ${appraisal.owner_name} ${appraisal.owner_phone}

💼 Тип продажи: ${saleLabels[appraisal.sale_type] ?? appraisal.sale_type}

📍 Причина продажи: ${appraisal.sale_reason ?? "Не указана"}

━━━━━━━━━━━━━━━━━━

⚙️ Характеристики

• Пробег: ${formatMileage(appraisal.mileage)} км
• Двигатель: ${appraisal.engine_volume ?? "-"} л
• Мощность: ${appraisal.power_hp ?? "-"} л.с.
• КПП: ${transmissionLabels[appraisal.transmission ?? ""] ?? "-"}
• Привод: ${driveLabels[appraisal.drive_type ?? ""] ?? "-"}
• Топливо: ${fuelLabels[appraisal.fuel_type ?? ""] ?? "-"}

━━━━━━━━━━━━━━━━━━

📝 Комментарий

${appraisal.car_condition_comment ?? "Без комментариев"}

━━━━━━━━━━━━━━━━━━

🛠 Предпродажная подготовка

${costs.text}

💰 Итого: ${formatPrice(costs.total)} ₽

━━━━━━━━━━━━━━━━━━

💵 Стоимость

💬 Цена владельца
${formatPrice(appraisal.owner_price)} ₽

🏷 Цена выкупа
${formatPrice(appraisal.purchase_price)} ₽

📈 Стартовая цена продажи

________________________`;
}