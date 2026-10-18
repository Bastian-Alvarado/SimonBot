/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Words for things the server names, in the screen's language.
 *
 * The server speaks English: its refusals ("that question is already in the
 * queue") are written once, there. A screen in Spanish looks each one up here
 * instead of showing it as sent.
 *
 * Found by name, so adding one is a line in each language in constants.ts
 * and nothing here: a refusal with the code "question_duplicate" is
 * t.refuseQuestionDuplicate. Anything without words — a code nobody wrote a sentence for, a failure
 * nobody foresaw — shows as the server said it, which is English, but says
 * what happened.
 */

/** "question_duplicate" → "QuestionDuplicate". */
const pascal = (id: string) => String(id).split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

export const refusalKey = (code: string) => `refuse${pascal(code)}`;

export const fill = (text: string, vars?: Record<string, any>) =>
  Object.entries(vars || {}).reduce((out, [k, v]) => out.split(`{${k}}`).join(String(v ?? '')), text);

/**
 * What a refusal means, in the screen's language. Takes a thrown error from a
 * request or a `{ ok: false, code, error }` result — both carry the code and
 * what fills its sentence.
 */
export function refusalWords(t: any, err: { code?: string; message?: string; error?: string; vars?: Record<string, any> } | null | undefined): string {
  const said = err?.message || err?.error || '';
  const words = err?.code ? t?.[refusalKey(err.code)] : '';
  return words ? fill(String(words), err?.vars) : said;
}
