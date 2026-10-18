import { createMiddleware, createStart } from "@tanstack/react-start";

const myGlobalMiddleware = createMiddleware().server(({ next }) => {
  return next();
});

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [myGlobalMiddleware],
  };
});
