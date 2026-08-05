import { PackageStatus } from "@workspace/api-client-react";

export const STATUS_LABELS: Record<PackageStatus, string> = {
  preparation: "Подготовка к отправке",
  sent_china: "Отправлен с Китайского склада",
  customs: "Проходит таможенное оформление",
  arrived_almaty: "Прибыл в Алматы",
  courier: "Передан курьеру",
  delivered: "Доставлен",
};

export const STATUS_COLORS: Record<PackageStatus, string> = {
  preparation: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  sent_china: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  customs: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  arrived_almaty: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  courier: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  delivered: "bg-emerald-700 text-white dark:bg-emerald-900 dark:text-emerald-100",
};

export const STATUS_DOT_COLORS: Record<PackageStatus, string> = {
  preparation: "bg-gray-500",
  sent_china: "bg-blue-500",
  customs: "bg-orange-500",
  arrived_almaty: "bg-yellow-500",
  courier: "bg-green-500",
  delivered: "bg-emerald-600",
};

export const STATUS_ORDER: PackageStatus[] = [
  "preparation",
  "sent_china",
  "customs",
  "arrived_almaty",
  "courier",
  "delivered",
];

export const getStatusCategory = (status: PackageStatus): "pending" | "transit" | "done" => {
  if (status === "preparation") return "pending";
  if (status === "delivered" || status === "courier") return "done";
  return "transit";
};

export const CATEGORY_LABELS = {
  pending: "В ожидании",
  transit: "В пути",
  done: "Готово",
};

export const CATEGORY_COLORS = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  transit: "bg-orange-100 text-orange-800 border-orange-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
};
