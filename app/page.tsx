"use client";

import ClientComponent from "./client-component";
import render from "./render";
import sleep from "./sleep";

export default function Home() {
  const Stream = render(async function* () {
    yield <div>Loading A...</div>;

    await sleep(1000);

    return <div>Loading A complete!</div>;
  });

  return (
    <main>
      <div>{Stream}</div>

      <div>
        <ClientComponent />
      </div>
    </main>
  );
}
