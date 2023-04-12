import { Dispatch, SetStateAction, useEffect, useState } from 'react';

type Awaited<T> = T extends Promise<infer U> ? U : never;

export const useAsync = <T extends (...args: any[]) => Promise<any>>(
  callback: T,
  dependencies: any[] = [],
): [Awaited<ReturnType<T>> | undefined, Dispatch<SetStateAction<Awaited<ReturnType<T>> | undefined>>] => {
  const [data, setData] = useState<Awaited<ReturnType<T>>>();

  useEffect(() => {
    // page loading
    if (dependencies.length === 1 && dependencies[0] === undefined) return;

    (async () => {
      const res = await callback();
      setData(res);

      return res;
    })();
  }, dependencies);

  return [data, setData];
};

const x = () => {};
