"use client";

import { ReactNode, useState } from "react";
import { generateComponent } from "./actions";

export default function ClientComponent() {
  const [ui, setUI] = useState<ReactNode>();

  return (
    <>
      <button
        onClick={async () => {
          const result = await generateComponent();
          setUI(result);
        }}
      >
        Generate UI
      </button>

      <div>{ui}</div>
    </>
  );
}
