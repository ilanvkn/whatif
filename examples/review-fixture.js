// Static-only synthetic fixture. Never execute user text.
export function intentionallyUnsafeExample(userText) {
  return eval(userText);
}
