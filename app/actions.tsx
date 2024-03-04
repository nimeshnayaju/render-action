"use server";

import { ReactNode } from "react";
import render from "./render";
import sleep from "./sleep";

export async function generateComponent() {
  return render(async function* () {
    yield <div>Loading B...</div>;

    await sleep(1000);

    return <div>Loading B complete!</div>;
  });
}
