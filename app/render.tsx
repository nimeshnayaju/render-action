import { ReactNode, Suspense } from "react";

// https://github.com/vercel/ai/blob/main/packages/core/rsc/streamable.tsx

function createResolvablePromise() {
  let resolve: (value: any) => void, reject: (error: any) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
}

function createSuspensedChunk(initialValue: React.ReactNode) {
  const Row = (async ({
    current,
    next,
  }: {
    current: React.ReactNode;
    next: Promise<any>;
  }) => {
    const chunk = await next;
    if (chunk.done) {
      return chunk.value;
    }

    if (chunk.append) {
      return (
        <>
          {current}
          <Suspense fallback={chunk.value}>
            <Row current={chunk.value} next={chunk.next} />
          </Suspense>
        </>
      );
    }

    return (
      <Suspense fallback={chunk.value}>
        <Row current={chunk.value} next={chunk.next} />
      </Suspense>
    );
  }) /* Our React typings don't support async components */ as unknown as React.FC<{
    current: React.ReactNode;
    next: Promise<any>;
  }>;

  const { promise, resolve, reject } = createResolvablePromise();

  return {
    row: (
      <Suspense fallback={initialValue}>
        <Row current={initialValue} next={promise} />
      </Suspense>
    ) as ReactNode,
    resolve,
    reject,
  };
}

/**
 * Create a piece of changable UI that can be streamed to the client.
 * On the client side, it can be rendered as a normal React node.
 */
function createStreamableUI(initialValue?: React.ReactNode) {
  let currentValue = initialValue;
  let closed = false;
  let { row, resolve, reject } = createSuspensedChunk(initialValue);

  function assertStream() {
    if (closed) {
      throw new Error("UI stream is already closed.");
    }
  }

  return {
    value: row,
    update(value: React.ReactNode) {
      assertStream();

      const resolvable = createResolvablePromise();
      resolve({ value, done: false, next: resolvable.promise });
      resolve = resolvable.resolve;
      reject = resolvable.reject;
      currentValue = value;
    },
    append(value: React.ReactNode) {
      assertStream();

      const resolvable = createResolvablePromise();
      resolve({ value, done: false, next: resolvable.promise });
      resolve = resolvable.resolve;
      reject = resolvable.reject;
      if (typeof currentValue === "string" && typeof value === "string") {
        currentValue += value;
      } else {
        currentValue = (
          <>
            {currentValue}
            {value}
          </>
        );
      }
    },
    error(error: any) {
      assertStream();

      closed = true;
      reject(error);
    },
    done(...args: any) {
      assertStream();

      closed = true;
      if (args.length) {
        resolve({ value: args[0], done: true });
        return;
      }
      resolve({ value: currentValue, done: true });
    },
  };
}

type Streamable = ReactNode | Promise<ReactNode>;

type Renderer = () =>
  | Generator<Streamable, Streamable, void>
  | AsyncGenerator<Streamable, Streamable, void>;

export default function render(renderer: Renderer) {
  const ui = createStreamableUI();

  (async () => {
    const value = renderer();

    if (value && typeof value === "object" && Symbol.asyncIterator in value) {
      const it = value as AsyncGenerator<
        React.ReactNode,
        React.ReactNode,
        void
      >;
      while (true) {
        const { done, value } = await it.next();
        ui.update(value);

        if (done) {
          ui.done();
          break;
        }
      }
    } else if (value && typeof value === "object" && Symbol.iterator in value) {
      const it = value as Generator<React.ReactNode, React.ReactNode, void>;
      while (true) {
        const { done, value } = it.next();
        ui.update(value);

        console.log({ done, value });
        if (done) {
          ui.done();
          break;
        }
      }
    } else {
      ui.done(value);
    }
  })();

  return ui.value;
}
