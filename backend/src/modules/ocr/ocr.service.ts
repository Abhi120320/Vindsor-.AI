import { recognize } from "tesseract.js";

export interface ParsedInvoice {
  vendorName?: string;
  quantity?: number;
  total?: number;
  items: Array<{ name: string; quantity?: number; price?: number }>;
}

export const parseInvoice = async (imageUrl: string): Promise<ParsedInvoice> => {
  const result = await recognize(imageUrl, "eng");
  const text = result.data.text;

  const totalMatch = text.match(/total[:\s]*([0-9]+(?:\.[0-9]+)?)/i);
  const qtyMatch = text.match(/qty[:\s]*([0-9]+)/i);
  const vendorLine = text.split("\n").find((line) => line.trim().length > 2);

  return {
    vendorName: vendorLine?.trim(),
    quantity: qtyMatch ? Number(qtyMatch[1]) : undefined,
    total: totalMatch ? Number(totalMatch[1]) : undefined,
    items: text
      .split("\n")
      .slice(0, 10)
      .filter(Boolean)
      .map((line) => ({ name: line.trim() })),
  };
};
