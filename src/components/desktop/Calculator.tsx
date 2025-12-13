import { useState } from "react";

export const Calculator = () => {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const inputPercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue;
      let result = currentValue;

      switch (operation) {
        case "+":
          result = currentValue + inputValue;
          break;
        case "-":
          result = currentValue - inputValue;
          break;
        case "×":
          result = currentValue * inputValue;
          break;
        case "÷":
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
      }

      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (operation === null || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result = previousValue;

    switch (operation) {
      case "+":
        result = previousValue + inputValue;
        break;
      case "-":
        result = previousValue - inputValue;
        break;
      case "×":
        result = previousValue * inputValue;
        break;
      case "÷":
        result = inputValue !== 0 ? previousValue / inputValue : 0;
        break;
    }

    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const handleButtonClick = (btn: string) => {
    if (btn >= "0" && btn <= "9") {
      inputDigit(btn);
    } else if (btn === ".") {
      inputDecimal();
    } else if (btn === "C") {
      clear();
    } else if (btn === "±") {
      toggleSign();
    } else if (btn === "%") {
      inputPercent();
    } else if (btn === "=") {
      calculate();
    } else if (["+", "-", "×", "÷"].includes(btn)) {
      performOperation(btn);
    }
  };

  const formatDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    if (value.length > 12) {
      return num.toExponential(6);
    }
    return value;
  };

  const buttons = [
    ["C", "±", "%", "÷"],
    ["7", "8", "9", "×"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "="],
  ];

  return (
    <div className="h-full bg-background p-3 flex flex-col gap-2">
      <div className="bg-card p-4 rounded-xl text-right overflow-hidden">
        <div className="text-xs text-muted-foreground h-4 mb-1">
          {previousValue !== null && operation ? `${previousValue} ${operation}` : ""}
        </div>
        <div className="text-3xl font-light text-foreground font-mono tracking-tight">
          {formatDisplay(display)}
        </div>
      </div>
      
      <div className="flex flex-col gap-2 flex-1">
        {buttons.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2 flex-1">
            {row.map((btn) => {
              const isOperator = ["÷", "×", "-", "+", "="].includes(btn);
              const isFunction = ["C", "±", "%"].includes(btn);
              const isZero = btn === "0";
              const isActive = operation === btn && waitingForOperand;
              
              return (
                <button
                  key={btn}
                  onClick={() => handleButtonClick(btn)}
                  className={`flex-1 rounded-xl font-medium text-lg transition-all active:scale-95 ${
                    isZero ? "flex-[2]" : ""
                  } ${
                    isOperator
                      ? isActive
                        ? "bg-primary-foreground text-primary"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                      : isFunction
                      ? "bg-muted text-foreground hover:bg-muted/80"
                      : "bg-card text-foreground hover:bg-card/80 border border-border"
                  }`}
                >
                  {btn}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};