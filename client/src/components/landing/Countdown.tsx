import { useEffect, useState } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function Countdown() {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = +new Date("2026-01-30T00:00:00") - +new Date();
    let timeLeft: TimeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearTimeout(timer);
  });

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center mx-2 md:mx-4">
      <div className="bg-card/50 backdrop-blur-sm border border-primary/20 rounded-lg p-3 md:p-4 w-16 md:w-24 flex items-center justify-center shadow-[0_0_15px_rgba(154,255,0,0.1)]">
        <span className="text-2xl md:text-4xl font-display font-bold text-white">
          {value.toString().padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs md:text-sm text-muted-foreground mt-2 uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );

  return (
    <div className="flex justify-center items-center mt-8 mb-12">
      <TimeUnit value={timeLeft.days} label="Dias" />
      <span className="text-2xl md:text-4xl font-bold text-primary mb-6">:</span>
      <TimeUnit value={timeLeft.hours} label="Horas" />
      <span className="text-2xl md:text-4xl font-bold text-primary mb-6">:</span>
      <TimeUnit value={timeLeft.minutes} label="Min" />
      <span className="text-2xl md:text-4xl font-bold text-primary mb-6">:</span>
      <TimeUnit value={timeLeft.seconds} label="Seg" />
    </div>
  );
}
