interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  bgColor: string;
  textColor: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({ icon, label, value, bgColor, textColor, trend }: StatCardProps) {
  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/[0.08] hover:border-nurse-red-500/30 hover:shadow-glow-red transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className={`w-14 h-14 ${bgColor} rounded-xl flex items-center justify-center border border-white/10`}>
          <div className={textColor}>{icon}</div>
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              trend.isPositive
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-medium text-nurse-silver-400">{label}</h3>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
      </div>
    </div>
  );
}
