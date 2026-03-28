const getCommentTextDetails = (text) => {
  const replyPrefixRegex = /^@[^\s]+\s/;
  const match = text.match(replyPrefixRegex);

  if (match) {
    const prefix = match[0];
    const actualText = text.slice(prefix.length);
    return { prefix, actualText, actualLength: actualText.length };
  }

  return { prefix: '', actualText: text, actualLength: text.length };
};

console.log(getCommentTextDetails('@test hello'));
console.log(getCommentTextDetails('hello'));
console.log(getCommentTextDetails('@test '));
console.log(getCommentTextDetails('@test'));
