export type TryOnZone = "top" | "bottom" | "full";

const BOTTOM = /\b(pant|pants|trouser|trousers|cargo|cargos|jean|jeans|denim|short|shorts|jogger|joggers|baggy|baggies|bottom|bottoms|skirt|track ?pant|sweatpant|sweatpants|chino|chinos|lower|lowers)\b/i;
const FULL = /\b(co-?ord|set|tracksuit|jumpsuit|dungaree|overall|bundle|fit)\b/i;

/** Decide which part of the customer's outfit to swap, from product type, tags and title. */
export function detectZone(p: { title: string; productType?: string; tags?: string[] }): TryOnZone {
  const text = [p.productType ?? "", ...(p.tags ?? []), p.title].join(" ");
  if (FULL.test(p.productType ?? "")) return "full";
  return BOTTOM.test(text) ? "bottom" : "top";
}

const TARGET: Record<TryOnZone, string> = {
  top: "TARGET: UPPER GARMENT ONLY. Replace ONLY the shirt/t-shirt/hoodie/jacket worn by the person in Image 1 with the ZANKYO product from Image 2. Leave their lower garment (pants/jeans/shorts), belt, shoes, face and background completely UNTOUCHED.",
  bottom: "TARGET: LOWER GARMENT ONLY. Replace ONLY the pants/jeans/trousers/shorts worn by the person in Image 1 with the ZANKYO product from Image 2. Leave their upper garment (t-shirt/shirt/hoodie/jacket), arms, face and shoes completely UNTOUCHED.",
  full: "TARGET: FULL OUTFIT. Replace the person's upper and lower garments with the ZANKYO outfit from Image 2. Preserve the exact face, hair, body pose, footwear and background from Image 1.",
};

export function buildTryOnPrompt(zone: TryOnZone, title: string, size: string) {
  return `TASK: STRICT TARGETED GARMENT SWAP (PRECISION INPAINTING)
Image 1 = customer's original photo. Image 2 = ZANKYO product "${title}" (size ${size || "regular"}).
This is an edit of Image 1, not a new photo. Keep 100% identical: background, room, objects, lighting, shadows, face, expression, skin tone, hair, body proportions, exact pose and hand positions, camera angle and framing.
${TARGET[zone]}
Garment fidelity: copy the product's exact color, fabric texture, stitching, silhouette, graphics, kanji (残響) and typography from Image 2 without distortion. Fit it naturally for size ${size || "regular"} with streetwear drape, real gravity, natural creases and correct waistband/hem placement, matching the scene's light.
Do NOT: alter untargeted garments, re-render or smooth the face/skin/hair, change the background, move limbs, add studio backdrops, or invent zippers, strings, pockets or logos not in Image 2.`;
}
