"use client";

interface StatusBadgeProps {
  status: "online" | "offline" | "warning" | "running";
  label?: string;
  size?: "sm" | "md";
}

const statusConfig = {
  online: {
    color: "bg-emerald-400",
    shadow: "shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    text: "text-emerald-400",
    defaultLabel: "Online",
  },
  offline: {
    color: "bg-red-500",
    shadow: "shadow-[0_0_8px_rgba(239,68,68,0.6)]",
    text: "text-red-400",
    defaultLabel: "Offline",
  },
  warning: {
    color: "bg-yellow-500",
    shadow: "shadow-[0_0_8px_rgba(234,179,8,0.6)]",
    text: "text-yellow-400",
    defaultLabel: "Warning",
  },
  running: {
    color: "bg-yellow-400",
    shadow: "shadow-[0_0_8px_rgba(250,204,21,0.6)]",
    text: "text-yellow-400",
    defaultLabel: "Running",
  },
};

export default function StatusBadge({
  status,
  label,
  size = "md",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-2 ${textSize} font-medium`}
    >
      <span
        className={`${dotSize} rounded-full ${config.color} ${config.shadow} ${
          status === "running" ? "animate-pulse" : ""
        }`}
      />
      <span className={config.text}>{label || config.defaultLabel}</span>
    </span>
  );
}
