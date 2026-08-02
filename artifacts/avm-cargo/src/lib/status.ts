import { PackageStatus } from "@workspace/api-client-react";

export const STATUS_LABELS: Record<PackageStatus, string> = {
  created: "Создана",
  accepted_china: "Принята на китайском складе",
  departed_china: "Выехала с китайского склада",
  arrived_almaty: "Прибыла в Алматы",
  departed_almaty: "Выехала из Алматы",
  arrived_city: "Поступила в город получателя",
  ready_pickup: "Готова к выдаче",
  delivered: "Выдана",
};

export const STATUS_COLORS: Record<PackageStatus, string> = {
  created: "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  accepted_china: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  departed_china: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  arrived_almaty: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  departed_almaty: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  arrived_city: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  ready_pickup: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  delivered: "bg-[#DC2626] text-white dark:bg-[#DC2626] dark:text-white", // Actually let's use dark green per spec, though brand is red. Spec: "delivered → dark green"
};

STATUS_COLORS.delivered = "bg-emerald-700 text-white dark:bg-emerald-900 dark:text-emerald-100";

export const STATUS_DOT_COLORS: Record<PackageStatus, string> = {
  created: "bg-gray-500",
  accepted_china: "bg-blue-500",
  departed_china: "bg-orange-500",
  arrived_almaty: "bg-yellow-500",
  departed_almaty: "bg-orange-500",
  arrived_city: "bg-purple-500",
  ready_pickup: "bg-green-500",
  delivered: "bg-emerald-600",
};

export const STATUS_ORDER: PackageStatus[] = [
  "created",
  "accepted_china",
  "departed_china",
  "arrived_almaty",
  "departed_almaty",
  "arrived_city",
  "ready_pickup",
  "delivered",
];

export const getStatusCategory = (status: PackageStatus): "pending" | "transit" | "done" => {
  if (status === "created") return "pending";
  if (status === "delivered" || status === "ready_pickup") return "done";
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
