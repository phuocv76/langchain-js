import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const add = tool(
  async ({ a, b }) => a + b,
  {
    name: "add",
    description: "Add two numbers.",
    schema: z.object({
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  }
);

export const multiply = tool(
  async ({ a, b }) => a * b,
  {
    name: "multiply",
    description: "Multiply two numbers.",
    schema: z.object({
      a: z.number().describe("The first number"),
      b: z.number().describe("The second number"),
    }),
  }
);

export const divide = tool(
  async ({ a, b }) => {
    if (b === 0) {
      throw new Error("Cannot divide by zero.");
    }

    return a / b;
  },
  {
    name: "divide",
    description: "Divide one number by another.",
    schema: z.object({
      a: z.number().describe("The dividend"),
      b: z.number().describe("The divisor"),
    }),
  }
);

export const tools = [add, multiply, divide];

export const toolsByName = {
  add,
  multiply,
  divide,
} as const;
