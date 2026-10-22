import { createCn } from "cn/config"

// Teach the merger the COVENANT type scale and radii (app/globals.css), otherwise `text-kpi` and
// `text-ink` look like two text colours and the font size is silently dropped.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "small", "micro", "kpi"] }],
      rounded: [{ rounded: ["control", "card", "dialog"] }],
    },
  },
})
