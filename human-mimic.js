"use strict";

/**
 * ECLIPSE Human Mimic
 * -------------------
 * Pure text transformation only.
 *
 * Responsibilities:
 *   - global/canonical shorthand replacement
 *   - keyboard-neighbor slips
 *   - delete/swap/double slips
 *   - case variation
 *   - spacing slips
 *   - casual punctuation
 *
 * No timers, Messenger API calls, queues, or Banat state live here.
 */

const DEFAULT_ABBREVIATIONS = Object.freeze([
  ["right now", "rn"],
  ["of course", "ofc"],
  ["i don't know", "idk"],
  ["i dont know", "idk"],
  ["i don't care", "idc"],
  ["i dont care", "idc"],
  ["not gonna lie", "ngl"],
  ["to be honest", "tbh"],
  ["in my opinion", "imo"],
  ["as soon as possible", "asap"],
  ["because", "bc"],
  ["though", "tho"],
  ["through", "thru"],
  ["with", "w/"],
  ["without", "w/o"],
  ["you", "u"],
  ["your", "ur"],
  ["you're", "ur"],
  ["youre", "ur"],
  ["are", "r"],
  ["why", "y"],
  ["please", "pls"],
  ["people", "ppl"],
  ["something", "smth"],
  ["someone", "sm1"],
  ["everyone", "evryone"],
  ["really", "rlly"],
  ["probably", "prob"],
  ["maybe", "mb"],
  ["message", "msg"],
  ["tomorrow", "tmrw"],
  ["tonight", "tn"],
  ["laughing", "lmao"],
]);

// Fallback stub para hindi hanapin ang english-vocabulary.js file
function isLikelyEnglishWord() {
  return true;
}

const { BANAT_SHORTHANDS } = require("./banat-abbreviations");

const WORD_RE = /[A-Za-z']+/g;

const KEYBOARD_NEIGHBORS = Object.freeze({
  q: "wa",
  w: "qase",
  e: "wsdr",
  r: "edft",
  t: "rfgy",
  y: "tghu",
  u: "yhji",
  i: "ujko",
  o: "iklp",
  p: "ol",
  a: "qwsz",
  s: "awedxz",
  d: "serfcx",
  f: "drtgvc",
  g: "ftyhbv",
  h: "gyujnb",
  j: "huikmn",
  k: "jiolm",
  l: "kop",
  z: "asx",
  x: "zsdc",
  c: "xdfv",
  v: "cfgb",
  b: "vghn",
  n: "bhjm",
  m: "njk",
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(random, array) {
  if (!Array.isArray(array) || !array.length) return null;
  return array[Math.floor(random() * array.length)];
}

function preserveCase(original, replacement) {
  replacement = String(replacement);
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original && original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function normalizeAbbreviations(abbreviations) {
  if (Array.isArray(abbreviations)) return abbreviations;
  if (!abbreviations || typeof abbreviations !== "object") {
    return BANAT_SHORTHANDS;
  }

  const pairs = [];
  for (const [from, replacements] of Object.entries(abbreviations)) {
    const values = Array.isArray(replacements) ? replacements : [replacements];
    for (const to of values) pairs.push([from, to]);
  }
  return pairs;
}

function replaceAbbreviations(text, abbreviations, random, rate = 0.08) {
  let output = String(text || "");
  if (random() >= clamp(Number(rate) || 0, 0, 1)) return output;

  const entries = normalizeAbbreviations(abbreviations)
    .filter((entry) => Array.isArray(entry) && entry.length >= 2)
    .sort((a, b) => String(b[0]).length - String(a[0]).length);

  const candidates = [];
  for (const [from, to] of entries) {
    const escaped = String(from).replace(/[.*+?^()|[\]\\]/g, "\\$&");
    const pattern = new RegExp("\\b" + escaped + "\\b", "i");
    if (pattern.test(output)) candidates.push({ pattern, to });
  }

  if (!candidates.length) return output;
  const choice = pick(random, candidates);
  if (!choice) return output;

  const replacement = Array.isArray(choice.to)
    ? pick(random, choice.to)
    : choice.to;

  return output.replace(choice.pattern, (match) =>
    preserveCase(match, replacement == null ? match : replacement)
  );
}

function keyboardSlip(word, random) {
  const candidates = [];

  for (let i = 0; i < word.length; i += 1) {
    const neighbors = KEYBOARD_NEIGHBORS[word[i].toLowerCase()];
    if (neighbors) {
      candidates.push({
        index: i,
        replacement: pick(random, neighbors.split("")),
      });
    }
  }

  const choice = pick(random, candidates);
  if (!choice || !choice.replacement) return null;

  return (
    word.slice(0, choice.index) +
    preserveCase(word[choice.index], choice.replacement) +
    word.slice(choice.index + 1)
  );
}

function deleteSlip(word, random) {
  if (word.length < 4) return null;
  const index = 1 + Math.floor(random() * (word.length - 2));
  return word.slice(0, index) + word.slice(index + 1);
}

function doubleSlip(word, random) {
  if (word.length < 3) return null;
  const index = 1 + Math.floor(random() * (word.length - 2));
  return word.slice(0, index) + word[index] + word.slice(index);
}

function swapSlip(word, random) {
  if (word.length < 4) return null;
  const index = 1 + Math.floor(random() * (word.length - 2));
  if (word[index] === word[index + 1]) return null;

  return (
    word.slice(0, index) +
    word[index + 1] +
    word[index] +
    word.slice(index + 2)
  );
}

function addTypo(text, random, rate = 0.025, options = {}) {
  const typoRate = clamp(Number(rate) || 0, 0, 1);
  if (random() >= typoRate) return text;

  const strategies = [
    "keyboard",
    "keyboard",
    "keyboard",
    "delete",
    "swap",
    "double",
  ];

  const maxAttempts = Math.max(1, Number(options.maxAttempts) || 5);

  const parts = String(text || "").split(/(\s+)/);
  const eligible = [];

  for (let i = 0; i < parts.length; i += 1) {
    if (
      /^\S+$/.test(parts[i]) &&
      parts[i].replace(/[^a-zA-Z]/g, "").length >= 4
    ) {
      eligible.push(i);
    }
  }

  const index = pick(random, eligible);
  if (index == null) return text;

  const match = parts[index].match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
  if (!match) return text;

  const prefix = match[1];
  const word = match[2];
  const suffix = match[3];

  let changed = null;

  for (let attempt = 0; attempt < maxAttempts && !changed; attempt += 1) {
    const strategy = pick(random, strategies);

    if (strategy === "keyboard") {
      changed = keyboardSlip(word, random);
    } else if (strategy === "delete") {
      changed = deleteSlip(word, random);
    } else if (strategy === "swap") {
      changed = swapSlip(word, random);
    } else {
      changed = doubleSlip(word, random);
    }
  }

  if (!changed || changed === word) return text;

  if (!isLikelyEnglishWord(changed)) return text;

  parts[index] = prefix + changed + suffix;
  return parts.join("");
}

function addCaseVariation(text, random, rate = 0) {
  if (text.length < 10 || random() >= clamp(Number(rate) || 0, 0, 1)) {
    return text;
  }

  const parts = text.split(/(\s+)/);
  const eligible = parts
    .map((value, index) => /^[A-Za-z]{3,}$/.test(value) ? index : -1)
    .filter((index) => index >= 0);

  const index = pick(random, eligible);
  if (index == null) return text;

  const word = parts[index];
  parts[index] = random() < 0.7
    ? word.toLowerCase()
    : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

  return parts.join("");
}

function addSpaceVariation(text, random, rate = 0) {
  if (text.length < 16 || random() >= clamp(Number(rate) || 0, 0, 1)) {
    return text;
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 3) return text;

  const index = 1 + Math.floor(random() * (words.length - 2));

  if (random() < 0.7) {
    words[index - 1] += words[index];
    words.splice(index, 1);
  } else {
    words[index - 1] += "  " + words[index];
  }

  return words.join(" ");
}

function addCasualPunctuation(text, random, options = {}) {
  const styleRate = clamp(Number(options.styleRate ?? 1), 0, 1);
  let output = String(text || "").trim();
  if (!output) return output;

  if (random() < 0.12 * styleRate) output = output.replace(/\.$/, "");
  if (random() < 0.08 * styleRate && !/[!?…]$/.test(output)) output += "...";
  if (random() < 0.06 * styleRate) output = output.replace(/, /g, ",  ");

  return output;
}

function normalizeTextingPunctuation(text, random) {
  let output = String(text || "");
  if (!output) return output;

  if (random() < 0.14) output = output.replace(/\.(?=\s*$)/, "");
  output = output.replace(/!{3,}/g, (m) => random() < 0.45 ? "!!" : m);
  output = output.replace(/\?{3,}/g, (m) => random() < 0.45 ? "??" : m);
  if (random() < 0.035) output = output.replace(/, /g, ",");
  return output;
}

function addRepeatedLetterStyle(text, random, rate = 0.012) {
  if (!text || random() >= clamp(Number(rate) || 0, 0, 1)) return text;
  const parts = String(text).split(/(\s+)/);
  const eligible = [];
  for (let i = 0; i < parts.length; i += 1) {
    if (/^[A-Za-z]{3,8}$/.test(parts[i])) eligible.push(i);
  }
  const index = pick(random, eligible);
  if (index == null) return text;
  const word = parts[index];
  const pos = Math.max(1, Math.min(word.length - 1, Math.floor(random() * word.length)));
  parts[index] = word.slice(0, pos) + word[pos] + word.slice(pos);
  return parts.join("");
}

function addReactionStyle(text, random, rate = 0.02) {
  if (!text || random() >= clamp(Number(rate) || 0, 0, 1)) return text;
  let output = String(text);
  output = output.replace(/\b(?:haha)+\b/gi, (m) => random() < 0.5 ? "HAHA" : m);
  output = output.replace(/\b(?:lol)+\b/gi, (m) => random() < 0.45 ? "lolll" : m);
  if (random() < 0.35 && /\b(?:lol|lmao|haha)\b/i.test(output) && !/[!?]$/.test(output)) {
    output += random() < 0.5 ? " 😭" : " 💀";
  }
  return output;
}

function humanize(text, options = {}) {
  const random = typeof options.random === "function"
    ? options.random
    : Math.random;

  let output = String(text || "").trim();
  if (!output) return output;

  if (options.abbreviate !== false) {
    output = replaceAbbreviations(
      output,
      options.abbreviations || DEFAULT_ABBREVIATIONS,
      random,
      Number.isFinite(options.abbreviationRate)
        ? options.abbreviationRate
        : 0.08
    );
  }

  if (options.typos !== false) {
    output = addTypo(
      output,
      random,
      Number.isFinite(options.typoRate)
        ? options.typoRate
        : 0.025,
      {
        maxAttempts: options.typoMaxAttempts,
      }
    );
  }

  output = addCaseVariation(
    output,
    random,
    Number.isFinite(options.caseVariationRate)
      ? options.caseVariationRate
      : 0
  );

  output = addSpaceVariation(
    output,
    random,
    Number.isFinite(options.spaceVariationRate)
      ? options.spaceVariationRate
      : 0
  );

  if (options.punctuation !== false) {
    output = addCasualPunctuation(output, random, options);
  }

  output = normalizeTextingPunctuation(output, random);
  output = addRepeatedLetterStyle(output, random, options.repeatedLetterRate ?? 0.012);
  output = addReactionStyle(output, random, options.reactionStyleRate ?? 0.02);

  return output;
}

function humanWordComplexity(word) {
  const clean = String(word || "").replace(/[^A-Za-z0-9']/g, "");
  if (!clean) return 0;

  let score = clean.length >= 7 ? 1 : 0;
  if (/[^aeiou]{4,}/i.test(clean)) score += 0.5;
  if (/\d/.test(clean)) score += 0.25;

  return score;
}

function humanizationProfile(text) {
  const value = String(text || "");
  const words = value.trim().split(/\s+/).filter(Boolean);
  const complexities = words.map(humanWordComplexity);
  const complexityTotal = complexities.reduce((sum, value) => sum + value, 0);

  return {
    length: value.length,
    words: words.length,
    complexity: clamp(
      words.length * 0.08 + value.length * 0.006,
      0,
      1
    ),
    wordComplexity: words.length
      ? complexityTotal / words.length
      : 0,
    emojiCount: (value.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length,
    punctuationCount: (value.match(/[,.!?;:]/g) || []).length,
    ellipsisCount: (value.match(/\.\.\./g) || []).length,
  };
}

module.exports = {
  DEFAULT_ABBREVIATIONS,
  BANAT_SHORTHANDS,
  KEYBOARD_NEIGHBORS,
  clamp,
  humanize,
  humanWordComplexity,
  humanizationProfile,
  addTypo,
  addCaseVariation,
  addSpaceVariation,
  addCasualPunctuation,
  normalizeTextingPunctuation,
  addRepeatedLetterStyle,
  addReactionStyle,
};
