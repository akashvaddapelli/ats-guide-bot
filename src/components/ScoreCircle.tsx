import { motion } from "framer-motion";

interface ScoreCircleProps {
  score: number;
  size?: number;
}

const ScoreCircle = ({ score, size = 180 }: ScoreCircleProps) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 81) return "hsl(152, 60%, 42%)";
    if (score >= 61) return "hsl(234, 85%, 55%)";
    if (score >= 41) return "hsl(38, 92%, 50%)";
    return "hsl(0, 72%, 51%)";
  };

  const getLabel = () => {
    if (score >= 81) return "Excellent Match";
    if (score >= 61) return "Strong Match";
    if (score >= 41) return "Moderate Match";
    return "Needs Improvement";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ width: size, height: size }} className="relative">
        <svg viewBox="0 0 100 100" className="-rotate-90" style={{ width: size, height: size }}>
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display text-4xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}%
          </motion.span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{getLabel()}</span>
    </div>
  );
};

export default ScoreCircle;
