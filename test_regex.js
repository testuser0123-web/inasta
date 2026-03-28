const getCommentTextDetails = (text) => {
  const replyPrefixRegex = /^@[^\s]+\s/;
  const match = text.match(replyPrefixRegex);
  if (match) {
    const prefix = match[0];
    const actualText = text.slice(prefix.length);
    return { prefix, actualText, actualLength: actualText.length, maxLengthWithPrefix: prefix.length + 31 };
  }
  return { prefix: '', actualText: text, actualLength: text.length, maxLengthWithPrefix: 31 };
};

const texts = [
  "hello",
  "@test hello",
  "@test ",
  "@testhello",
  " @test hello" // not starting with @
];

for (const t of texts) {
  console.log(`"${t}" ->`, getCommentTextDetails(t));
}
