// The two example papers a new library in this browser starts with (flow 1).
// "Remove them" deletes them for good.
import { assignKeys } from "../../impl/citation-key/src/index.ts";
import type { Paper } from "./types.ts";

export const EXAMPLE_TAG = "Example";
export const isExample = (p: Paper) => p.id.startsWith("example-") && p.tags.includes(EXAMPLE_TAG);

export function examplePapers(now = new Date()): Paper[] {
  const drafts = [
    {
      title: "Attention Is All You Need",
      authors: ["Vaswani, Ashish", "Shazeer, Noam", "Parmar, Niki", "Uszkoreit, Jakob", "Jones, Llion", "Gomez, Aidan N.", "Kaiser, Lukasz", "Polosukhin, Illia"],
      year: 2017,
      venue: "Advances in Neural Information Processing Systems",
      arxiv: "1706.03762",
      url: "https://arxiv.org/abs/1706.03762",
      abstract:
        "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
    },
    {
      title: "Deep Residual Learning for Image Recognition",
      authors: ["He, Kaiming", "Zhang, Xiangyu", "Ren, Shaoqing", "Sun, Jian"],
      year: 2016,
      venue: "Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)",
      doi: "10.1109/CVPR.2016.90",
      arxiv: "1512.03385",
      url: "https://arxiv.org/abs/1512.03385",
      abstract:
        "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.",
    },
  ];
  const keys = assignKeys(drafts, []);
  return drafts.map((d, i) => {
    const { title, authors, year, venue, abstract, arxiv, url } = d;
    const p: Paper = {
      id: `example-${i + 1}`,
      key: keys[i],
      type: i === 0 ? "inproceedings" : "inproceedings",
      title,
      authors,
      year,
      venue,
      abstract,
      arxiv,
      url,
      tags: [EXAMPLE_TAG],
      added: new Date(now.getTime() - (2 - i) * 1000).toISOString(),
      folders: [],
      fields: {},
    };
    if ("doi" in d && d.doi) p.doi = d.doi;
    return p;
  });
}
