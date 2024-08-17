export default function SideBar({
  step,
  setStep,
}: {
  step: number;
  setStep: (value: number) => void;
}) {
  return (
    <ul className="w-48">
      <li
        onClick={() => setStep(0)}
        className={[
          "text-center w-full py-4.5 text-xs text-white rounded-lg cursor-pointer",
          step === 0 && "bg-blue-primary",
        ].join(" ")}
      >
        0.Getting Started
      </li>
      <li
        onClick={() => setStep(1)}
        className={[
          "text-center w-full py-4.5 text-xs text-white rounded-lg cursor-pointer",
          step === 1 && "bg-blue-primary",
        ].join(" ")}
      >
        1.Yield Tokenization
      </li>
      <li
        onClick={() => setStep(2)}
        className={[
          "text-center w-full py-4.5 text-xs text-white rounded-lg cursor-pointer",
          step === 2 && "bg-blue-primary",
        ].join(" ")}
      >
        2.Fixing yield with PT
      </li>
      <li
        onClick={() => setStep(3)}
        className={[
          "text-center w-full py-4.5 text-xs text-white rounded-lg cursor-pointer",
          step === 3 && "bg-blue-primary",
        ].join(" ")}
      >
        3.Longing yield with YT
      </li>
      <li
        onClick={() => setStep(4)}
        className={[
          "text-center w-full py-4.5 text-xs text-white rounded-lg cursor-pointer",
          step === 4 && "bg-blue-primary",
        ].join(" ")}
      >
        4.Strategic yield trading
      </li>
    </ul>
  );
}
