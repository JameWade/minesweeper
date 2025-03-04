export * from "./fetchPriceFromUniswap";
export * from "./networks";
export * from "./notification";
export * from "./block";
export * from "./decodeTxData";
export * from "./getParsedError";

export const getRandomBytes = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return (
    "0x" +
    Array.from(array)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("")
  );
};
