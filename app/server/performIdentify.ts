import { createServerFn } from "@tanstack/react-start";
import { identifyMedicine } from "../core/identify";

export const performIdentify = createServerFn({
  method: "POST",
})
  .validator((imgSrc: string) => imgSrc)
  .handler(async ({ data }) => {
    return await identifyMedicine(data);
  });
