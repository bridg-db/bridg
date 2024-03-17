export const queryFails = async (query: Promise<any>) => {
  const data = await query.catch((err) => {
    expect(err).toBeTruthy();
  });
  expect(data).toBeUndefined();
};

export const querySucceeds = async (query: Promise<any>, resultCount = 1) => {
  const data = await query;

  if (Array.isArray(data)) {
    expect(data.length).toBe(resultCount);
  } else if (data?.count !== undefined) {
    expect(data.count).toBe(resultCount);
  } else {
    resultCount === 0 && expect(data).toBeNull();
    resultCount === 1 && expect(data).toBeTruthy();
    if (resultCount > 1) throw Error(`Expected array, but received: ${data}`);
  }

  return data;
};

export const expectQueryError = async (query: Promise<any>, msg: string) => {
  const data = await query.catch((err) => {
    expect(err).toBeTruthy();
    expect(err.message.includes(msg)).toBeTruthy();
  });
  expect(data).toBeUndefined();
};
